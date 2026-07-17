import { TrackWithWork } from '../types'

export class AudioEngine {
  private ctx: AudioContext | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private audioBuffer: AudioBuffer | null = null
  private gainNode: GainNode | null = null
  private analyserNode: AnalyserNode | null = null
  private channelSplitter: ChannelSplitterNode | null = null
  private channelMerger: ChannelMergerNode | null = null
  private leftGain: GainNode | null = null
  private rightGain: GainNode | null = null
  private eqFilters: BiquadFilterNode[] = []

  private currentTrack: TrackWithWork | null = null
  private playStartOffset = 0
  private playStartTime = 0
  private isPaused = false
  private isPlaying = false

  private onTimeUpdate: ((time: number) => void) | null = null
  private onEnded: (() => void) | null = null
  private onLoad: (() => void) | null = null
  private onAnalyser: ((data: number[]) => void) | null = null

  private animationId: number | null = null
  private analyserData = new Uint8Array(1024)
  private timeThrottleMs = 100
  private analyserThrottleMs = 50
  private lastTimeUpdate = 0
  private lastAnalyserUpdate = 0
  private loadId = 0

  getContext(): AudioContext | null { return this.ctx }
  getAnalyserNode(): AnalyserNode | null { return this.analyserNode }

  private ensureContext() {
    if (!this.ctx) { this.ctx = new AudioContext() }
    if (this.ctx.state === 'suspended') { this.ctx.resume() }
  }

  private buildGraph() {
    this.ensureContext()
    const ctx = this.ctx!
    this.channelSplitter = ctx.createChannelSplitter(2)
    this.channelMerger = ctx.createChannelMerger(2)
    this.leftGain = ctx.createGain()
    this.rightGain = ctx.createGain()
    this.gainNode = ctx.createGain()
    this.analyserNode = ctx.createAnalyser()
    this.analyserNode.fftSize = 2048
    this.analyserData = new Uint8Array(this.analyserNode.frequencyBinCount)

    this.channelSplitter.connect(this.leftGain, 0)
    this.channelSplitter.connect(this.rightGain, 1)
    this.leftGain.connect(this.channelMerger, 0, 0)
    this.rightGain.connect(this.channelMerger, 0, 1)
    this.channelMerger.connect(this.gainNode!)
    this.gainNode.connect(this.analyserNode)
    this.analyserNode.connect(ctx.destination)
    this.gainNode.gain.value = 1
    this.leftGain.gain.value = 1
    this.rightGain.gain.value = 1
  }

  private connectEQ() {
    const ctx = this.ctx!
    this.eqFilters = []
    for (let i = 0; i < 10; i++) {
      const filter = ctx.createBiquadFilter()
      filter.type = 'peaking'
      filter.frequency.value = 0
      filter.gain.value = 0
      filter.Q.value = 1
      this.eqFilters.push(filter)
    }
    if (this.eqFilters.length === 0) return
    this.gainNode?.disconnect()
    let lastNode: AudioNode = this.gainNode!
    for (const filter of this.eqFilters) { lastNode.connect(filter); lastNode = filter }
    if (this.analyserNode) { lastNode.connect(this.analyserNode) }
  }

  setEQBand(index: number, gain: number, frequency: number, type: BiquadFilterType = 'peaking') {
    if (index >= 0 && index < this.eqFilters.length) {
      this.eqFilters[index].gain.value = gain
      this.eqFilters[index].frequency.value = frequency
      this.eqFilters[index].type = type
    }
  }

  setEQFromBands(bands: { frequency: number; gain: number; type: BiquadFilterType }[]) {
    for (let i = 0; i < Math.min(bands.length, this.eqFilters.length); i++) {
      this.eqFilters[i].frequency.value = bands[i].frequency
      this.eqFilters[i].gain.value = bands[i].gain
      this.eqFilters[i].type = bands[i].type
    }
  }

  setChannelVolume(left: number, right: number) {
    if (this.leftGain) this.leftGain.gain.value = Math.max(0, Math.min(1, left))
    if (this.rightGain) this.rightGain.gain.value = Math.max(0, Math.min(1, right))
  }

  setVolume(vol: number) {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, vol))
  }

  async loadTrack(track: TrackWithWork): Promise<void> {
    const id = ++this.loadId
    this.stop()
    this.ensureContext()
    this.currentTrack = track
    // 支持远程 URL 和本地文件
    const url = track.streamUrl || `file://${track.track.file}`
    const response = await fetch(url)
    if (id !== this.loadId) return
    const arrayBuffer = await response.arrayBuffer()
    if (id !== this.loadId) return
    this.audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer)
    if (id !== this.loadId) { this.audioBuffer = null; return }
    this.buildGraph()
    this.connectEQ()
    this.onLoad?.()
  }

  play() {
    if (!this.ctx || !this.audioBuffer) return
    this.ensureContext()
    if (this.isPaused && this.sourceNode) {
      this.ctx.resume()
      this.isPaused = false
      this.isPlaying = true
      this.playStartTime = this.ctx.currentTime
      this.startAnalyserLoop()
      return
    }
    this.sourceNode = this.ctx.createBufferSource()
    this.sourceNode.buffer = this.audioBuffer
    if (this.channelSplitter) { this.sourceNode.connect(this.channelSplitter) }
    this.sourceNode.onended = () => {
      if (!this.isPaused) { this.playStartOffset = 0; this.isPlaying = false; this.sourceNode = null; this.stopAnalyserLoop(); this.onEnded?.() }
    }
    this.sourceNode.start(0, this.playStartOffset)
    this.isPlaying = true
    this.isPaused = false
    this.playStartTime = this.ctx.currentTime
    this.startAnalyserLoop()
  }

  pause() {
    if (!this.ctx || !this.isPlaying) return
    this.ctx.suspend()
    this.isPaused = true
    this.isPlaying = false
    this.playStartOffset += this.ctx.currentTime - this.playStartTime
    this.stopAnalyserLoop()
  }

  stop() {
    if (this.sourceNode) { this.sourceNode.onended = null; try { this.sourceNode.stop() } catch { } this.sourceNode = null }
    this.isPlaying = false; this.isPaused = false; this.playStartOffset = 0; this.stopAnalyserLoop()
  }

  seek(time: number) {
    if (!this.audioBuffer || !this.currentTrack) return
    const wasPlaying = this.isPlaying
    this.stop()
    this.playStartOffset = Math.max(0, Math.min(time, this.audioBuffer.duration))
    if (wasPlaying) this.play()
  }

  getCurrentTime(): number {
    if (!this.ctx) return this.playStartOffset
    if (this.isPlaying) return this.playStartOffset + (this.ctx.currentTime - this.playStartTime)
    return this.playStartOffset
  }

  getDuration(): number { return this.audioBuffer?.duration || 0 }
  isTrackPlaying(): boolean { return this.isPlaying }
  isTrackPaused(): boolean { return this.isPaused }
  getCurrentTrack(): TrackWithWork | null { return this.currentTrack }

  setOnTimeUpdate(cb: ((time: number) => void) | null) { this.onTimeUpdate = cb }
  setOnEnded(cb: (() => void) | null) { this.onEnded = cb }
  setOnLoad(cb: (() => void) | null) { this.onLoad = cb }
  setOnAnalyser(cb: ((data: number[]) => void) | null) { this.onAnalyser = cb }

  resumeContext() {
    if (!this.ctx) return
    if (this.ctx.state === 'suspended' && this.isPlaying) { this.ctx.resume() }
    if (this.isPlaying && this.animationId === null) {
      this.startAnalyserLoop()
    }
  }

  private startAnalyserLoop() {
    this.stopAnalyserLoop()
    this.lastTimeUpdate = 0
    this.lastAnalyserUpdate = 0
    const tick = (now: number) => {
      if (!this.isPlaying) return
      this.analyserNode!.getByteFrequencyData(this.analyserData)

      if (now - this.lastAnalyserUpdate >= this.analyserThrottleMs) {
        this.lastAnalyserUpdate = now
        this.onAnalyser?.(Array.from(this.analyserData))
      }
      if (now - this.lastTimeUpdate >= this.timeThrottleMs) {
        this.lastTimeUpdate = now
        this.onTimeUpdate?.(this.getCurrentTime())
      }
      this.animationId = requestAnimationFrame(tick)
    }
    this.animationId = requestAnimationFrame(tick)
  }

  private stopAnalyserLoop() {
    if (this.animationId !== null) { cancelAnimationFrame(this.animationId); this.animationId = null }
  }

  destroy() { this.stop(); this.ctx?.close(); this.ctx = null }
}
