'use client'

import { useCallback, useRef, useState, useEffect, type DragEvent } from 'react'
import {
  Upload,
  Plus,
  Trash2,
  Film,
  Music,
  Image as ImageIcon,
  Sparkles,
  Link2,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Eye,
  Info,
  Layers,
  X,
} from 'lucide-react'
import {
  useMediaLibrary,
  useMediaLibraryStore,
  importFiles,
  importUrl,
  MEDIA_DRAG_MIME,
  mediaDragKindMime,
  insertMediaAsset,
  useTimelineEngine,
  useTracksStore,
  usePlaybackStore,
  type MediaAsset,
} from '@elah/editor'
import { cn } from '@/lib/utils'
import { ProgressBar } from '../ai/ProgressBar'
import { saveMediaBlob, deleteMediaBlob } from '@/lib/media-file-storage'

export interface MediaLibraryPanelProps {
  style?: React.CSSProperties
}

function fmtDuration(sec: number | undefined): string {
  if (!sec || !Number.isFinite(sec)) return '00:00'
  const total = Math.round(sec)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtFileSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const SUPPORTED_VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.m4v', '.ogv']
const SUPPORTED_AUDIO_EXTS = ['.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a']
const SUPPORTED_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg']

function isSupportedFile(file: File): { supported: boolean; reason?: string } {
  const name = file.name.toLowerCase()
  const mime = file.type.toLowerCase()

  const hasExt = (list: string[]) => list.some((ext) => name.endsWith(ext))
  const isVideo = mime.startsWith('video/') || hasExt(SUPPORTED_VIDEO_EXTS)
  const isAudio = mime.startsWith('audio/') || hasExt(SUPPORTED_AUDIO_EXTS)
  const isImage = mime.startsWith('image/') || hasExt(SUPPORTED_IMAGE_EXTS)

  if (isVideo || isAudio || isImage) {
    return { supported: true }
  }

  const extMatch = name.match(/\.([a-z0-9]+)$/i)
  const ext = extMatch ? `.${extMatch[1]}` : 'unknown'
  return {
    supported: false,
    reason: `Unsupported file extension "${ext}". Supported formats: MP4, WebM, MOV, MP3, WAV, AAC, PNG, JPG, WebP.`,
  }
}

export function MediaLibraryPanel({ style }: MediaLibraryPanelProps) {
  const engine = useTimelineEngine()
  const { assets } = useMediaLibrary()
  const tracks = useTracksStore((s) => s.tracks)
  const clips = useTracksStore((s) => s.clips)

  const [filter, setFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all')
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [progressLabel, setProgressLabel] = useState('Importing media...')
  const [urlInput, setUrlInput] = useState('')
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [activePreviewAsset, setActivePreviewAsset] = useState<MediaAsset | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const quickPreviewMediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null)

  // Clear messages after 6s
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null)
        setSuccessMsg(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [errorMsg, successMsg])

  // Count clips on timeline for each asset
  const getTimelineClipCount = useCallback(
    (asset: MediaAsset) => {
      let count = 0
      for (const trackClips of Object.values(clips)) {
        for (const c of trackClips) {
          if (c.assetId === asset.id || c.src === asset.src) {
            count++
          }
        }
      }
      return count
    },
    [clips],
  )

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      if (!files.length) return

      setErrorMsg(null)
      setSuccessMsg(null)

      // 1. Validate file types
      const validFiles: File[] = []
      const invalidFiles: { name: string; reason: string }[] = []

      for (const f of files) {
        const check = isSupportedFile(f)
        if (check.supported) {
          validFiles.push(f)
        } else {
          invalidFiles.push({ name: f.name, reason: check.reason || 'Unsupported format' })
        }
      }

      if (invalidFiles.length > 0) {
        setErrorMsg(
          invalidFiles.map((inv) => `${inv.name}: ${inv.reason}`).join(' | '),
        )
      }

      if (!validFiles.length) return

      // 2. Process real uploads with progress feedback
      setProgressLabel(`Decoding ${validFiles.length} file(s)...`)
      setUploadProgress(25)

      try {
        setUploadProgress(50)
        setProgressLabel('Extracting frames, audio waveforms & thumbnails...')
        const res = await importFiles(validFiles)

        setUploadProgress(85)
        setProgressLabel('Saving to local persistent cache...')

        // Persist binary blobs in IndexedDB
        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i]
          const asset = res.imported.find((a) => a.name === file.name)
          if (asset && file) {
            await saveMediaBlob(asset.id, file, { name: file.name, type: file.type }).catch(() => {})
          }
        }

        setUploadProgress(100)
        setTimeout(() => setUploadProgress(null), 400)

        // Feedback for imported and skipped
        if (res.imported.length > 0) {
          setSuccessMsg(
            `Successfully imported ${res.imported.length} media file(s) into your library.`,
          )
        }

        if (res.skipped.length > 0) {
          const dupes = res.skipped.filter((s) => s.reason === 'duplicate')
          if (dupes.length > 0) {
            setErrorMsg(
              `${dupes.map((d) => d.file.name).join(', ')} is already in your media library.`,
            )
          }
        }
      } catch (err) {
        console.error('[MediaLibraryPanel] Import failed:', err)
        setErrorMsg(err instanceof Error ? err.message : 'Failed to import files.')
        setUploadProgress(null)
      }
    },
    [],
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDraggingOver(false)
      if (e.dataTransfer.files?.length) {
        void handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  const handleImportUrl = useCallback(async () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    setErrorMsg(null)
    setUploadProgress(30)
    setProgressLabel('Fetching remote media stream...')
    try {
      setUploadProgress(70)
      const asset = await importUrl(trimmed)
      setUrlInput('')
      setShowUrlModal(false)
      setUploadProgress(100)
      setSuccessMsg(`Imported "${asset.name}" from URL.`)
      setTimeout(() => setUploadProgress(null), 400)
    } catch (err) {
      console.error('Failed to import URL:', err)
      setErrorMsg('Could not fetch or decode media from provided URL. Please verify direct media link.')
      setUploadProgress(null)
    }
  }, [urlInput])

  // Quick Action: Sample media
  const loadSampleVideo = useCallback(async () => {
    setProgressLabel('Loading sample video...')
    setUploadProgress(30)
    try {
      const res = await fetch('/assets/scene-1.mp4')
      const blob = await res.blob()
      const file = new File([blob], 'demo-nature-scene.mp4', { type: 'video/mp4' })
      await handleFiles([file])
    } catch (err) {
      setErrorMsg('Failed to load local sample video.')
    } finally {
      setUploadProgress(null)
    }
  }, [handleFiles])

  const loadSampleAudio = useCallback(async () => {
    setProgressLabel('Loading sample soundtrack...')
    setUploadProgress(30)
    try {
      const res = await fetch('/assets/audio.mp3')
      const blob = await res.blob()
      const file = new File([blob], 'cinematic-soundtrack.mp3', { type: 'audio/mp3' })
      await handleFiles([file])
    } catch (err) {
      setErrorMsg('Failed to load local sample audio.')
    } finally {
      setUploadProgress(null)
    }
  }, [handleFiles])

  // Select video and load into preview
  const handleLoadIntoPreview = useCallback(
    async (asset: MediaAsset) => {
      // Find if this asset is already on any timeline track
      let foundClip: { clipId: string; trackId: string; startFrame: number } | null = null

      for (const [trackId, trackClips] of Object.entries(clips)) {
        for (const c of trackClips) {
          if (c.assetId === asset.id || c.src === asset.src) {
            foundClip = { clipId: c.id, trackId, startFrame: c.startFrame }
            break
          }
        }
        if (foundClip) break
      }

      if (foundClip) {
        // Already on timeline: seek playhead directly to clip start frame to load into WebGL2 Preview
        usePlaybackStore.getState().pause()
        usePlaybackStore.getState().setCurrentFrame(foundClip.startFrame)
        setSuccessMsg(`Seeked preview to "${asset.name}" at frame ${foundClip.startFrame}.`)
      } else {
        // Insert asset onto timeline, then seek to its position
        const res = await insertMediaAsset(engine, asset.id)
        if (res.ok) {
          const currentF = usePlaybackStore.getState().currentFrame
          usePlaybackStore.getState().setCurrentFrame(currentF)
          setSuccessMsg(`Loaded "${asset.name}" into timeline & active preview.`)
        } else {
          setErrorMsg(`Could not load media to timeline (${res.reason}).`)
        }
      }
    },
    [clips, engine],
  )

  // Remove media from the current project completely
  const handleRemoveFromProject = useCallback(
    (asset: MediaAsset) => {
      const assetId = asset.id
      const assetName = asset.name

      // 1. Remove all instances of this clip from timeline
      engine.batch(() => {
        for (const [trackId, trackClips] of Object.entries(clips)) {
          for (const c of trackClips) {
            if (c.assetId === assetId || c.src === asset.src) {
              engine.removeClip(c.id, trackId)
            }
          }
        }
      }, `Remove media ${assetName}`)

      // 2. Remove from MediaLibraryStore
      useMediaLibraryStore.getState().removeAsset(assetId)

      // 3. Remove from IndexedDB
      void deleteMediaBlob(assetId).catch(() => {})

      // 4. Release object URL if applicable
      if (asset.src.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(asset.src)
        } catch {}
      }

      // If this was active in quick preview, close it
      if (activePreviewAsset?.id === assetId) {
        setActivePreviewAsset(null)
        setPreviewPlaying(false)
      }

      setSuccessMsg(`Removed "${assetName}" and all associated clips from project.`)
    },
    [clips, engine, activePreviewAsset],
  )

  const handleDragStart = useCallback((e: React.DragEvent, asset: MediaAsset) => {
    e.dataTransfer.setData(
      MEDIA_DRAG_MIME,
      JSON.stringify({
        assetId: asset.id,
        kind: asset.kind,
        name: asset.name,
        src: asset.src,
        duration: asset.durationSec,
        width: asset.width,
        height: asset.height,
      }),
    )
    e.dataTransfer.setData(mediaDragKindMime(asset.kind), '')
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const filteredAssets = assets.filter((a) => {
    if (filter === 'all') return true
    return a.kind === filter
  })

  return (
    <div style={style} className="flex flex-col h-full bg-ed-bg border-r border-ed-border select-none">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ed-border bg-ed-bg-2 shrink-0">
        <div>
          <span className="text-[13px] font-semibold text-ed-text tracking-[-0.01em]">Media Library</span>
          <span className="ml-2 text-[11px] font-mono text-ed-text-muted">({assets.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowUrlModal((v) => !v)}
            title="Import from URL"
            className="flex items-center justify-center w-7 h-7 rounded border border-ed-border bg-ed-elevated text-ed-text-muted hover:text-ed-text transition-colors"
          >
            <Link2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-ed-accent text-ed-accent-text hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Upload Media
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,audio/*,image/*,.mp4,.webm,.mov,.m4v,.mp3,.wav,.aac,.ogg,.flac,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files)
            }}
          />
        </div>
      </div>

      {/* URL Import Dropdown */}
      {showUrlModal && (
        <div className="p-3 border-b border-ed-border bg-ed-bg-2 flex flex-col gap-2 shadow-inner">
          <span className="text-[11px] font-medium text-ed-text">Import direct video or audio stream URL:</span>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/video.mp4"
            className="w-full px-2.5 py-1.5 rounded border border-ed-border bg-ed-bg text-xs text-ed-text placeholder:text-ed-text-muted outline-none focus:border-ed-accent"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUrlModal(false)}
              className="px-2.5 py-1 text-xs text-ed-text-muted hover:text-ed-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportUrl}
              className="px-3 py-1 text-xs rounded bg-ed-elevated border border-ed-border text-ed-text font-medium hover:bg-ed-highest"
            >
              Import URL
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="px-3 py-2 border-b border-ed-border bg-ed-bg-2">
          <ProgressBar percent={uploadProgress} label={progressLabel} />
        </div>
      )}

      {/* Notifications / Error / Success Toasts */}
      {errorMsg && (
        <div className="mx-3 mt-2.5 p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[11px] flex items-start gap-2 animate-in fade-in">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span className="flex-1 leading-tight">{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-red-400/70 hover:text-red-400">
            <X size={12} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mx-3 mt-2.5 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={14} className="shrink-0" />
          <span className="flex-1 leading-tight">{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-400/70 hover:text-emerald-400">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-ed-border bg-ed-bg shrink-0">
        {(['all', 'video', 'audio', 'image'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              'px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors',
              filter === k
                ? 'bg-ed-elevated text-ed-text border border-ed-border'
                : 'text-ed-text-muted hover:text-ed-text',
            )}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'm-3 p-3 rounded-lg border border-dashed text-center cursor-pointer transition-colors shrink-0',
          isDraggingOver
            ? 'border-ed-accent bg-ed-accent/10 text-ed-text'
            : 'border-ed-border bg-ed-bg-2/50 text-ed-text-muted hover:border-ed-border-subtle hover:text-ed-text',
        )}
      >
        <Upload size={17} className="mx-auto mb-1 opacity-70" />
        <span className="block text-xs font-medium">Drop media files here, or browse</span>
        <span className="block text-[10px] text-ed-text-muted mt-0.5">MP4, WebM, MOV, MP3, WAV, PNG, JPG</span>
      </div>

      {/* Quick Sample Media Loader if library is empty */}
      {assets.length === 0 && (
        <div className="mx-3 mb-3 p-3 rounded-lg border border-ed-border bg-ed-bg-2/70 flex flex-col gap-2 shrink-0">
          <span className="text-[11px] font-medium text-ed-text flex items-center gap-1.5">
            <Sparkles size={13} className="text-ed-accent" /> Need sample files?
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void loadSampleVideo()
              }}
              className="px-2 py-1.5 rounded border border-ed-border bg-ed-elevated text-[11px] font-medium text-ed-text hover:bg-ed-highest transition-colors flex items-center justify-center gap-1"
            >
              <Film size={12} /> Sample Video
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void loadSampleAudio()
              }}
              className="px-2 py-1.5 rounded border border-ed-border bg-ed-elevated text-[11px] font-medium text-ed-text hover:bg-ed-highest transition-colors flex items-center justify-center gap-1"
            >
              <Music size={12} /> Sample Audio
            </button>
          </div>
        </div>
      )}

      {/* Inline Quick Preview Drawer */}
      {activePreviewAsset && (
        <div className="mx-3 mb-2 p-2 rounded-lg border border-ed-accent/50 bg-ed-bg-2 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ed-text truncate flex-1">
              Previewing: {activePreviewAsset.name}
            </span>
            <button
              type="button"
              onClick={() => setActivePreviewAsset(null)}
              className="text-ed-text-muted hover:text-ed-text p-0.5"
            >
              <X size={13} />
            </button>
          </div>
          {activePreviewAsset.kind === 'video' ? (
            <video
              ref={quickPreviewMediaRef as React.RefObject<HTMLVideoElement>}
              src={activePreviewAsset.src}
              controls
              autoPlay
              className="w-full aspect-video rounded bg-black object-contain max-h-36"
            />
          ) : activePreviewAsset.kind === 'audio' ? (
            <audio
              ref={quickPreviewMediaRef as React.RefObject<HTMLAudioElement>}
              src={activePreviewAsset.src}
              controls
              autoPlay
              className="w-full h-8"
            />
          ) : (
            <img
              src={activePreviewAsset.src}
              alt={activePreviewAsset.name}
              className="w-full max-h-36 object-contain rounded bg-black"
            />
          )}
          <button
            type="button"
            onClick={() => void handleLoadIntoPreview(activePreviewAsset)}
            className="w-full py-1 text-[11px] font-semibold rounded bg-ed-accent text-ed-accent-text hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
          >
            <Layers size={12} /> Place on Timeline & Edit
          </button>
        </div>
      )}

      {/* Asset Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
        {filteredAssets.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-center text-ed-text-muted">
            <Film size={24} className="opacity-30 mb-2" />
            <span className="text-xs">No {filter !== 'all' ? filter : 'media'} items found</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredAssets.map((asset) => {
              const timelineCount = getTimelineClipCount(asset)
              return (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset)}
                  onClick={() => void handleLoadIntoPreview(asset)}
                  title="Click to load into preview & timeline, or drag to timeline"
                  className="group relative flex flex-col rounded-lg border border-ed-border bg-ed-elevated overflow-hidden hover:border-ed-accent/70 transition-all cursor-pointer shadow-sm"
                >
                  {/* Thumbnail / Visual */}
                  <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : asset.kind === 'video' ? (
                      <Film size={22} className="text-ed-text-muted" />
                    ) : asset.kind === 'audio' ? (
                      <Music size={22} className="text-ed-text-muted" />
                    ) : (
                      <ImageIcon size={22} className="text-ed-text-muted" />
                    )}

                    {/* Quick Preview Hover Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActivePreviewAsset(asset)
                      }}
                      title="Quick inspection player"
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-ed-accent text-ed-accent-text shadow">
                        <Play size={14} fill="currentColor" className="ml-0.5" />
                      </span>
                    </button>

                    {/* Duration badge */}
                    {asset.durationSec ? (
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white/95">
                        {fmtDuration(asset.durationSec)}
                      </span>
                    ) : null}

                    {/* Format / Type badge */}
                    <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/70 text-[8px] font-bold uppercase tracking-wider text-white/90">
                      {asset.kind}
                    </span>

                    {/* On Timeline indicator */}
                    {timelineCount > 0 && (
                      <span className="absolute top-1 right-1 px-1 py-0.5 rounded bg-ed-accent/90 text-ed-accent-text text-[8px] font-semibold flex items-center gap-0.5 shadow">
                        <Layers size={9} /> {timelineCount}
                      </span>
                    )}
                  </div>

                  {/* Metadata & Actions */}
                  <div className="p-2 flex flex-col gap-1">
                    <span className="text-[11px] text-ed-text truncate font-semibold leading-tight" title={asset.name}>
                      {asset.name}
                    </span>

                    <div className="flex items-center justify-between text-[10px] text-ed-text-muted font-mono">
                      <span>{fmtFileSize(asset.byteSize)}</span>
                      {asset.width && asset.height && (
                        <span>{asset.width}×{asset.height}</span>
                      )}
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center justify-between pt-1 border-t border-ed-border/40 mt-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleLoadIntoPreview(asset)
                        }}
                        title="Load into preview"
                        className="text-[10px] font-medium text-ed-accent hover:underline flex items-center gap-0.5"
                      >
                        <Eye size={10} /> Preview
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFromProject(asset)
                        }}
                        title="Remove from project & timeline"
                        className="p-1 rounded text-ed-text-muted hover:text-red-400 hover:bg-black/30 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
