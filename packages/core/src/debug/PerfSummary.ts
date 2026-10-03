import { trace, traceEnabled } from './trace'

/**
 * A once-a-second reading of what the render loop actually costs.
 *
 * The editor "feeling laggy" is not something the existing GPU counters can
 * settle: they report decode and upload, which are the parts that were never
 * the problem. What matters is how long a whole tick takes, how often one
 * overruns its frame budget, and how much of that is work the loop repeats
 * without needing to. So this measures the tick, not the GPU.
 *
 * Silent unless the `PERF` channel is on (`__trace.on('PERF')`), and cheap
 * enough to leave in place: one `performance.now()` pair per phase and a
 * bounded array per second. Every caller still guards with {@link active} so
 * nothing is allocated at all when the channel is off.
 */
export class PerfSummary {
  private readonly _windowMs: number
  private _windowStart = 0
  private _ticks: number[] = []
  private readonly _phaseTotals = new Map<string, number>()
  private readonly _counters = new Map<string, number>()

  constructor(windowMs = 1000) {
    this._windowMs = windowMs
  }

  /** Whether measurement is on. Guard payload construction with this. */
  get active(): boolean {
    return traceEnabled('PERF')
  }

  /** Time one phase of the tick (resolve, render, prewarm…). */
  measure<T>(phase: string, run: () => T): T {
    if (!this.active) return run()
    const started = performance.now()
    try {
      return run()
    } finally {
      this._phaseTotals.set(phase, (this._phaseTotals.get(phase) ?? 0) + (performance.now() - started))
    }
  }

  /** Count something that happened — a store notification, a re-render. */
  count(name: string, by = 1): void {
    if (!this.active) return
    this._counters.set(name, (this._counters.get(name) ?? 0) + by)
  }

  /**
   * Record one completed tick and log the window if it has elapsed.
   *
   * @param tickMs Wall time the whole tick took.
   * @param extra Renderer-reported figures worth seeing beside the tick cost.
   */
  endTick(tickMs: number, extra?: Record<string, unknown>): void {
    if (!this.active) {
      // Left the channel mid-window: drop what was collected so a later
      // re-enable does not average across the gap.
      if (this._ticks.length > 0) this._reset(0)
      return
    }

    const now = performance.now()
    if (this._windowStart === 0) this._windowStart = now
    this._ticks.push(tickMs)

    const elapsed = now - this._windowStart
    if (elapsed < this._windowMs) return

    const sorted = [...this._ticks].sort((a, b) => a - b)
    const seconds = elapsed / 1000
    // 33ms is two missed frames at 60Hz — the threshold at which a user stops
    // reading motion as smooth.
    const long = sorted.filter((t) => t > 33).length

    trace('PERF', {
      ticksPerSec: round(sorted.length / seconds),
      avgTickMs: round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
      p95TickMs: round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]),
      maxTickMs: round(sorted[sorted.length - 1]),
      longFramesPerSec: round(long / seconds),
      ...Object.fromEntries(
        [...this._phaseTotals].map(([phase, total]) => [`${phase}MsPerSec`, round(total / seconds)]),
      ),
      ...Object.fromEntries(
        [...this._counters].map(([name, total]) => [`${name}PerSec`, round(total / seconds)]),
      ),
      ...extra,
    })

    this._reset(now)
  }

  private _reset(now: number): void {
    this._windowStart = now
    this._ticks = []
    this._phaseTotals.clear()
    this._counters.clear()
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
