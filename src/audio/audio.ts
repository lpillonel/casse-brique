import type { SoundEvent } from '../game/types'

/**
 * Procedural cyberpunk audio, no asset files: everything is synthesized with the Web Audio API.
 * - Music: a 4-bar synthwave loop in A minor (bass, arpeggio with echo, pad, kick, clap, hats).
 * - SFX: short synth blips, one per SoundEvent emitted by the game engine.
 * Browsers only allow audio after a user gesture, so call `unlock()` from a click / key press.
 */

export type MusicMode = 'on' | 'paused' | 'off'

const MUTE_KEY = 'casse-brique:muted'
const BPM = 112
const STEP = 60 / BPM / 4 // one 16th note, in seconds
const LOOKAHEAD = 0.12 // seconds scheduled ahead of the clock
const BRICK_SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24] // minor pentatonic, in semitones

// One chord per bar: Am - F - C - G.
const CHORDS = [
  { root: 45, tones: [57, 60, 64, 69] },
  { root: 41, tones: [53, 57, 60, 65] },
  { root: 48, tones: [55, 60, 64, 67] },
  { root: 43, tones: [55, 59, 62, 67] },
]
const ARP_PATTERN = [0, 2, 1, 3, 2, 1, 3, 2]

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

interface ToneOptions {
  type?: OscillatorType
  freqEnd?: number // exponential glide target
  gain?: number
  attack?: number
  filter?: number // lowpass cutoff
  dest?: AudioNode
}

class CyberAudio {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private musicFilter!: BiquadFilterNode
  private sfxBus!: GainNode
  private echo!: DelayNode
  private noise!: AudioBuffer
  private timer: number | null = null
  private nextTime = 0
  private step = 0
  private mode: MusicMode = 'off'
  private muted = localStorage.getItem(MUTE_KEY) === '1'
  private combo = 0

  isMuted() {
    return this.muted
  }

  toggleMute() {
    this.muted = !this.muted
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0')
    this.applyMute()
    return this.muted
  }

  /** Creates / resumes the audio context. Must run inside a user gesture the first time. */
  unlock() {
    if (!this.ctx) this.build()
    if (this.ctx?.state === 'suspended') void this.ctx.resume()
  }

  setMusic(mode: MusicMode) {
    this.mode = mode
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    this.musicBus.gain.setTargetAtTime(mode === 'off' ? 0 : 0.5, now, mode === 'off' ? 0.15 : 0.05)
    // Paused: muffle the music instead of cutting it.
    this.musicFilter.frequency.setTargetAtTime(mode === 'paused' ? 400 : 18000, now, 0.1)
    if (mode === 'off') this.stopScheduler()
    else if (this.timer === null) this.startScheduler()
  }

  sfx(event: SoundEvent) {
    const ctx = this.ctx
    if (!ctx || this.muted) return
    const t = ctx.currentTime
    switch (event) {
      case 'wall':
        this.tone(190, t, 0.06, { type: 'triangle', freqEnd: 140, gain: 0.25 })
        break
      case 'paddle':
        this.combo = 0
        this.tone(330, t, 0.09, { type: 'square', freqEnd: 130, gain: 0.18, filter: 2500 })
        break
      case 'brick': {
        // Consecutive bricks climb the scale until the ball touches the paddle again.
        const note = 69 + BRICK_SCALE[Math.min(this.combo, BRICK_SCALE.length - 1)]
        this.combo++
        this.tone(midi(note), t, 0.12, { type: 'square', gain: 0.14, filter: 3500 })
        this.tone(midi(note + 12), t, 0.08, { type: 'triangle', gain: 0.1 })
        this.noiseBurst(t, 0.05, 0.12, 'highpass', 5000)
        break
      }
      case 'bonusDrop':
        this.tone(880, t, 0.08, { type: 'sine', gain: 0.18 })
        this.tone(1320, t + 0.07, 0.12, { type: 'sine', gain: 0.18 })
        break
      case 'multiball':
        ;[57, 64, 69, 76, 81].forEach((n, i) =>
          this.tone(midi(n), t + i * 0.055, 0.14, { type: 'sawtooth', gain: 0.14, filter: 3000 }),
        )
        break
      case 'pierce':
        this.tone(180, t, 0.45, { type: 'sawtooth', freqEnd: 2400, gain: 0.16, filter: 5000 })
        this.noiseBurst(t, 0.4, 0.1, 'bandpass', 3000)
        break
      case 'lifeLost':
        this.tone(440, t, 0.6, { type: 'sawtooth', freqEnd: 50, gain: 0.3, filter: 1500 })
        this.noiseBurst(t, 0.35, 0.3, 'lowpass', 900)
        break
      case 'gameover':
        ;[69, 65, 62, 57].forEach((n, i) =>
          this.tone(midi(n), t + i * 0.2, 0.45, { type: 'sawtooth', gain: 0.2, filter: 1800 }),
        )
        this.tone(midi(33), t, 1.2, { type: 'sine', freqEnd: 28, gain: 0.35 })
        break
      case 'won':
        ;[57, 61, 64, 69, 73, 76, 81].forEach((n, i) =>
          this.tone(midi(n), t + i * 0.09, 0.3, { type: 'square', gain: 0.14, filter: 3500 }),
        )
        break
      case 'start':
        this.tone(120, t, 0.5, { type: 'sawtooth', freqEnd: 1200, gain: 0.18, filter: 4000 })
        break
    }
  }

  // --- internals ---

  private build() {
    const ctx = new AudioContext()
    this.ctx = ctx

    const compressor = ctx.createDynamicsCompressor()
    this.master = ctx.createGain()
    this.master.connect(compressor).connect(ctx.destination)

    this.musicFilter = ctx.createBiquadFilter()
    this.musicFilter.type = 'lowpass'
    this.musicFilter.frequency.value = 18000
    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = 0
    this.musicBus.connect(this.musicFilter).connect(this.master)

    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = 0.9
    this.sfxBus.connect(this.master)

    // Dotted-eighth echo used by the arpeggio.
    this.echo = ctx.createDelay(1)
    this.echo.delayTime.value = STEP * 3
    const feedback = ctx.createGain()
    feedback.gain.value = 0.38
    const echoOut = ctx.createGain()
    echoOut.gain.value = 0.55
    this.echo.connect(feedback).connect(this.echo)
    this.echo.connect(echoOut).connect(this.musicBus)

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    this.applyMute()
    this.setMusic(this.mode) // music may have been requested before the context existed
  }

  private applyMute() {
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.03)
  }

  private startScheduler() {
    const ctx = this.ctx
    if (!ctx) return
    this.step = 0
    this.nextTime = ctx.currentTime + 0.05
    this.timer = window.setInterval(() => {
      while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
        this.scheduleStep(this.step, this.nextTime)
        this.nextTime += STEP
        this.step = (this.step + 1) % (CHORDS.length * 16)
      }
    }, 25)
  }

  private stopScheduler() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  private scheduleStep(s: number, t: number) {
    const chord = CHORDS[Math.floor(s / 16)]
    const i = s % 16

    // Kick on every beat, clap on 2 and 4, hats on the off-beats.
    if (i % 4 === 0) {
      this.tone(150, t, 0.16, { type: 'sine', freqEnd: 42, gain: 0.7, dest: this.musicBus })
    }
    if (i === 4 || i === 12) this.noiseBurst(t, 0.12, 0.28, 'bandpass', 1500, this.musicBus)
    if (i % 2 === 1) this.noiseBurst(t, 0.04, 0.1, 'highpass', 7000, this.musicBus)

    // Driving 8th-note bass with an octave jump.
    if (i % 2 === 0) {
      const note = chord.root + (i % 8 === 6 ? 12 : 0)
      this.tone(midi(note), t, STEP * 1.8, {
        type: 'sawtooth', gain: 0.22, filter: 450, dest: this.musicBus,
      })
    }

    // 16th-note arpeggio, sent to the echo as well.
    const arpNote = chord.tones[ARP_PATTERN[i % 8]]
    const arpGain = this.ctx!.createGain()
    arpGain.gain.value = 1
    arpGain.connect(this.musicBus)
    arpGain.connect(this.echo)
    this.tone(midi(arpNote + 12), t, STEP * 1.5, {
      type: 'square', gain: 0.06, filter: 2600, dest: arpGain,
    })

    // Slow detuned pad, once per bar.
    if (i === 0) {
      for (const tone of chord.tones.slice(0, 3)) {
        for (const detune of [-7, 7]) {
          this.tone(midi(tone) * 2 ** (detune / 1200), t, STEP * 16, {
            type: 'sawtooth', gain: 0.035, attack: 0.4, filter: 900, dest: this.musicBus,
          })
        }
      }
    }
  }

  private tone(freq: number, start: number, dur: number, o: ToneOptions = {}) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = o.type ?? 'sine'
    osc.frequency.setValueAtTime(freq, start)
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, start + dur)

    const peak = o.gain ?? 0.2
    const attack = Math.min(o.attack ?? 0.005, dur / 2)
    env.gain.setValueAtTime(0.0001, start)
    env.gain.linearRampToValueAtTime(peak, start + attack)
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur)

    let node: AudioNode = osc
    if (o.filter) {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = o.filter
      osc.connect(lp)
      node = lp
    }
    node.connect(env).connect(o.dest ?? this.sfxBus)
    osc.start(start)
    osc.stop(start + dur + 0.05)
  }

  private noiseBurst(
    start: number, dur: number, gain: number, type: BiquadFilterType, freq: number, dest?: AudioNode,
  ) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    const env = ctx.createGain()
    env.gain.setValueAtTime(gain, start)
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    src.connect(filter).connect(env).connect(dest ?? this.sfxBus)
    src.start(start, Math.random() * 0.5)
    src.stop(start + dur + 0.05)
  }
}

export const audio = new CyberAudio()
