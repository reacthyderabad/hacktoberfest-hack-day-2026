/**
 * Supabase project persistence service.
 * All methods return { data, error } and gracefully handle missing Supabase config.
 */
import { getSupabaseClient } from './client'
import type { StudioEditPlan } from '@/lib/ai/studioTypes'

export interface DbProject {
  id: string
  user_id: string
  name: string
  description?: string
  project_data?: Record<string, unknown>
  fps: number
  stage_width: number
  stage_height: number
  duration_frames: number
  thumbnail_url?: string
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface DbAiEditHistory {
  id: string
  project_id: string
  user_id: string
  prompt: string
  plan?: StudioEditPlan
  status: 'pending' | 'applied' | 'rejected' | 'failed'
  applied_summary?: string
  applied_count: number
  is_local_fallback: boolean
  created_at: string
}

type Result<T> = { data: T | null; error: string | null }

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<Result<{ id: string; email?: string }>> {
  const sb = getSupabaseClient()
  if (!sb) return { data: null, error: null } // Not configured — silent

  const { data, error } = await sb.auth.getUser()
  if (error) return { data: null, error: error.message }
  return { data: data.user ? { id: data.user.id, email: data.user.email } : null, error: null }
}

export async function signInWithEmail(email: string, password: string): Promise<Result<{ id: string }>> {
  const sb = getSupabaseClient()
  if (!sb) return { data: null, error: 'Supabase is not configured.' }

  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) return { data: null, error: error.message }
  return { data: data.user ? { id: data.user.id } : null, error: null }
}

export async function signUpWithEmail(email: string, password: string): Promise<Result<{ id: string }>> {
  const sb = getSupabaseClient()
  if (!sb) return { data: null, error: 'Supabase is not configured.' }

  const { data, error } = await sb.auth.signUp({ email, password })
  if (error) return { data: null, error: error.message }
  return { data: data.user ? { id: data.user.id } : null, error: null }
}

export async function signOut(): Promise<{ error: string | null }> {
  const sb = getSupabaseClient()
  if (!sb) return { error: null }

  const { error } = await sb.auth.signOut()
  return { error: error?.message ?? null }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<Result<DbProject[]>> {
  const sb = getSupabaseClient()
  if (!sb) return { data: [], error: null }

  const { data, error } = await sb
    .from('projects')
    .select('*')
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) return { data: null, error: error.message }
  return { data: data as DbProject[], error: null }
}

export async function createProject(
  name: string,
  projectData?: Record<string, unknown>,
  meta?: { fps?: number; stageWidth?: number; stageHeight?: number },
): Promise<Result<DbProject>> {
  const sb = getSupabaseClient()
  if (!sb) return { data: null, error: 'Supabase is not configured.' }

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated.' }

  const { data, error } = await sb
    .from('projects')
    .insert({
      user_id: user.id,
      name,
      project_data: projectData ?? null,
      fps: meta?.fps ?? 30,
      stage_width: meta?.stageWidth ?? 1920,
      stage_height: meta?.stageHeight ?? 1080,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as DbProject, error: null }
}

export async function saveProject(
  projectId: string,
  projectData: Record<string, unknown>,
  meta?: { name?: string; fps?: number; stageWidth?: number; stageHeight?: number; durationFrames?: number },
): Promise<Result<DbProject>> {
  const sb = getSupabaseClient()
  if (!sb) return { data: null, error: null } // Silent — localStorage handles local saves

  const patch: Record<string, unknown> = {
    project_data: projectData,
    updated_at: new Date().toISOString(),
  }
  if (meta?.name !== undefined) patch.name = meta.name
  if (meta?.fps !== undefined) patch.fps = meta.fps
  if (meta?.stageWidth !== undefined) patch.stage_width = meta.stageWidth
  if (meta?.stageHeight !== undefined) patch.stage_height = meta.stageHeight
  if (meta?.durationFrames !== undefined) patch.duration_frames = meta.durationFrames

  const { data, error } = await sb
    .from('projects')
    .update(patch)
    .eq('id', projectId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as DbProject, error: null }
}

export async function loadProject(projectId: string): Promise<Result<DbProject>> {
  const sb = getSupabaseClient()
  if (!sb) return { data: null, error: 'Supabase is not configured.' }

  const { data, error } = await sb
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as DbProject, error: null }
}

// ─── AI Edit History ──────────────────────────────────────────────────────────

export async function recordAiEdit(opts: {
  projectId: string
  prompt: string
  plan: StudioEditPlan
  status: DbAiEditHistory['status']
  appliedCount?: number
  appliedSummary?: string
  isLocalFallback?: boolean
}): Promise<Result<DbAiEditHistory>> {
  const sb = getSupabaseClient()
  if (!sb) return { data: null, error: null } // Silent — no Supabase

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { data: null, error: null } // Not logged in — skip silently

  const { data, error } = await sb
    .from('ai_edit_history')
    .insert({
      project_id: opts.projectId,
      user_id: user.id,
      prompt: opts.prompt,
      plan: opts.plan as unknown as Record<string, unknown>,
      status: opts.status,
      applied_summary: opts.appliedSummary,
      applied_count: opts.appliedCount ?? 0,
      is_local_fallback: opts.isLocalFallback ?? false,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as DbAiEditHistory, error: null }
}

export async function getAiEditHistory(projectId: string, limit = 20): Promise<Result<DbAiEditHistory[]>> {
  const sb = getSupabaseClient()
  if (!sb) return { data: [], error: null }

  const { data, error } = await sb
    .from('ai_edit_history')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return { data: data as DbAiEditHistory[], error: null }
}
