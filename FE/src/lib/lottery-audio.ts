/**
 * Helper âm thanh trường quay xổ số sử dụng Web Audio API tích hợp sẵn.
 * Không phụ thuộc file âm thanh ngoài, chạy mượt mà trên mọi trình duyệt.
 */

class LotterySoundManager {
  private ctx: AudioContext | null = null
  private enabled: boolean = true

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    return this.ctx
  }

  public toggleSound(force?: boolean): boolean {
    if (typeof force === 'boolean') {
      this.enabled = force
    } else {
      this.enabled = !this.enabled
    }
    return this.enabled
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  /** Âm thanh lồng cầu xoay bóng */
  public playSpin(): void {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(300 + Math.random() * 400, now + i * 0.08)
      gain.gain.setValueAtTime(0.04, now + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.06)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.07)
    }
  }

  /** Âm thanh bóng rơi ra khay */
  public playBallDrop(): void {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15) // A5
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.35)
  }

  /** Âm thanh chúc mừng trúng thưởng (Fanfare) */
  public playWinnerFanfare(): void {
    if (!this.enabled) return
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + idx * 0.1)
      gain.gain.setValueAtTime(0.12, now + idx * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.1)
      osc.stop(now + idx * 0.1 + 0.45)
    })
  }
}

export const lotteryAudio = new LotterySoundManager()
