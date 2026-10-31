import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { PerfSummary } from './PerfSummary'
import { installTraceGlobal } from './trace'

describe('PerfSummary', () => {
  beforeEach(() => {
    ;(globalThis as any).window = globalThis
    installTraceGlobal()
    window.__trace?.none()
  })

  afterEach(() => {
    window.__trace?.none()
    delete (globalThis as any).window
    vi.restoreAllMocks()
  })

  it('is inactive when PERF trace channel is off', () => {
    const perf = new PerfSummary()
    expect(perf.active).toBe(false)
  })

  it('becomes active when PERF trace channel is on', () => {
    window.__trace?.on('PERF')
    const perf = new PerfSummary()
    expect(perf.active).toBe(true)
  })

  it('measure() runs the callback and returns its value regardless of active state', () => {
    const perf = new PerfSummary()
    const result = perf.measure('resolve', () => 42)
    expect(result).toBe(42)

    window.__trace?.on('PERF')
    const resultActive = perf.measure('render', () => 'done')
    expect(resultActive).toBe('done')
  })

  it('does not log or record when inactive', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const perf = new PerfSummary(100)

    perf.measure('resolve', () => 1)
    perf.count('tick')
    perf.endTick(10)

    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('records ticks and emits PERF trace when window has elapsed', () => {
    window.__trace?.on('PERF')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    let nowTime = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => nowTime)

    const perf = new PerfSummary(1000) // 1 second window

    // Tick 1 at t=1000
    perf.measure('resolve', () => {})
    perf.count('notifications')
    perf.endTick(16) // not elapsed yet

    expect(consoleSpy).not.toHaveBeenCalled()

    // Tick 2 at t=1500
    nowTime = 1500
    perf.measure('resolve', () => {})
    perf.endTick(40) // long frame (> 33ms)

    // Tick 3 at t=2100 (elapsed = 1100ms >= 1000ms)
    nowTime = 2100
    perf.endTick(20, { fps: 60 })

    expect(consoleSpy).toHaveBeenCalledOnce()
    expect(consoleSpy.mock.calls[0][0]).toBe('[PERF]')
    const payload = consoleSpy.mock.calls[0][1] as Record<string, unknown>

    expect(payload.ticksPerSec).toBeDefined()
    expect(payload.avgTickMs).toBeDefined()
    expect(payload.p95TickMs).toBeDefined()
    expect(payload.maxTickMs).toBe(40)
    expect(payload.longFramesPerSec).toBeDefined()
    expect(payload.fps).toBe(60)
  })

  it('clears collected ticks if disabled mid-window', () => {
    window.__trace?.on('PERF')
    const perf = new PerfSummary(1000)

    let nowTime = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => nowTime)

    perf.endTick(16)

    // Disable PERF mid-window
    window.__trace?.off('PERF')
    perf.endTick(16)

    // Re-enable PERF
    window.__trace?.on('PERF')
    expect(perf.active).toBe(true)
  })
})
