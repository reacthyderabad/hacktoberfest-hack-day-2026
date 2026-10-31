import { describe, expect, it } from 'vitest'
import { isPurgeable, planBlobRestore, PURGE_GRACE_MS } from './blob-restore'

describe('planBlobRestore', () => {
  it('does nothing when nothing is stored', () => {
    expect(planBlobRestore([], new Set(['a']))).toEqual({ restore: [], purge: [] })
  })

  it('restores everything when every stored blob is wanted', () => {
    expect(planBlobRestore(['a', 'b'], new Set(['a', 'b', 'c']))).toEqual({
      restore: ['a', 'b'],
      purge: [],
    })
  })

  it('purges everything when nothing is wanted', () => {
    expect(planBlobRestore(['a', 'b'], new Set())).toEqual({ restore: [], purge: ['a', 'b'] })
  })

  it('splits a mixed set, preserving stored order', () => {
    expect(planBlobRestore(['a', 'b', 'c', 'd'], new Set(['d', 'b']))).toEqual({
      restore: ['b', 'd'],
      purge: ['a', 'c'],
    })
  })

  it('collapses duplicate ids so a blob is handled once', () => {
    expect(planBlobRestore(['a', 'a', 'b', 'b', 'a'], new Set(['a']))).toEqual({
      restore: ['a'],
      purge: ['b'],
    })
  })
})

describe('isPurgeable', () => {
  const now = 1_000_000_000_000

  it('protects a blob stored moments ago, so a reload during the snapshot debounce keeps the import', () => {
    expect(isPurgeable(now - 500, now)).toBe(false)
  })

  it('collects a blob older than the grace window', () => {
    expect(isPurgeable(now - PURGE_GRACE_MS - 1, now)).toBe(true)
  })

  it('treats a record with no timestamp as collectable', () => {
    expect(isPurgeable(undefined, now)).toBe(true)
    expect(isPurgeable(Number.NaN, now)).toBe(true)
  })
})
