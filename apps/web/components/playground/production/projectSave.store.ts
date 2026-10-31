import { create } from 'zustand'
import type { MissingMedia } from '@elah/editor'

export type SaveStatusKind = 'idle' | 'dirty' | 'saving' | 'saved'

interface ProjectSaveState {
  projectName: string
  saveStatus: SaveStatusKind
  missingMedia: MissingMedia[]

  setProjectName: (name: string) => void
  setSaveStatus: (status: SaveStatusKind) => void
  setMissingMedia: (missing: MissingMedia[]) => void
  reset: () => void
}

const INITIAL = {
  projectName: 'Untitled Project',
  saveStatus: 'saved' as SaveStatusKind,
  missingMedia: [] as MissingMedia[],
}

export const useProjectSaveStore = create<ProjectSaveState>((set) => ({
  ...INITIAL,
  setProjectName: (projectName) => set({ projectName }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setMissingMedia: (missingMedia) => set({ missingMedia }),
  reset: () => set(INITIAL),
}))
