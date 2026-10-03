import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { clipLoadStore } from '@elah/core'
import { PreviewLoadingOverlay } from './PreviewLoadingOverlay'

/**
 * The preview is black while a clip's decoder opens. These assert that the
 * black window is narrated rather than left to look like a broken editor, and
 * that the overlay disappears the moment the renderer says the clip is drawable.
 */

const mounted: Array<{ root: Root; container: HTMLElement }> = []

function render(element: ReactElement): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(element)
  })
  mounted.push({ root, container })
  return container
}

const overlay = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-testid="preview-media-loading"]')

function report(clipId: string, state: 'loading' | 'error' | null): void {
  act(() => {
    clipLoadStore.getState().set(clipId, state)
  })
}

beforeEach(() => {
  clipLoadStore.getState().clear()
})

afterEach(() => {
  for (const { root, container } of mounted.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
  clipLoadStore.getState().clear()
})

describe('PreviewLoadingOverlay', () => {
  it('renders nothing while every clip is drawable', () => {
    const container = render(<PreviewLoadingOverlay />)
    expect(overlay(container)).toBeNull()
  })

  it('shows a spinner while a clip is loading and hides it once it is drawable', () => {
    const container = render(<PreviewLoadingOverlay />)

    report('clip-a', 'loading')
    const shown = overlay(container)
    expect(shown).not.toBeNull()
    expect(shown?.textContent).toContain('Loading media')

    report('clip-a', null)
    expect(overlay(container)).toBeNull()
  })

  it('names a clip that cannot be opened at all', () => {
    const container = render(<PreviewLoadingOverlay />)

    report('clip-a', 'error')
    expect(overlay(container)?.textContent).toContain("Couldn't load this video")
  })

  it('prefers the error over a clip that is still loading', () => {
    const container = render(<PreviewLoadingOverlay />)

    report('clip-a', 'loading')
    report('clip-b', 'error')
    expect(overlay(container)?.textContent).toContain("Couldn't load this video")

    // The failing clip leaving the scene falls back to the remaining wait.
    report('clip-b', null)
    expect(overlay(container)?.textContent).toContain('Loading media')
  })

  it('never intercepts pointer events from the overlays beneath it', () => {
    const container = render(<PreviewLoadingOverlay />)
    report('clip-a', 'loading')

    expect(overlay(container)?.className).toContain('pointer-events-none')
  })
})
