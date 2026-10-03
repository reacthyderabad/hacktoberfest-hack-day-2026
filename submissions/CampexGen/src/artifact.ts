import { z } from "zod";

// Animation types assigned per scene — used by the Remotion composition layer.
// "none" means static (ELAH-compatible fallback).
export const AnimationTypeSchema = z.enum([
  "none",
  "fade-in",       // opacity 0→1
  "slide-up",      // translateY 60px→0 + fade
  "slide-down",    // translateY -60px→0 + fade
  "zoom-in",       // scale 0.8→1 + fade
  "zoom-out",      // scale 1.2→1 + fade
  "pop",           // scale 0→1 spring bounce
  "wipe-right",    // reveal mask left→right
]);

export type AnimationType = z.infer<typeof AnimationTypeSchema>;

export const SceneSchema = z.object({
  id: z.string(),
  duration: z.number().positive(),
  purpose: z.enum(["hook", "product", "benefit", "info", "urgency", "cta", "offer", "discount"]),
  headline: z.string(),
  subtext: z.string().optional(),
  asset: z.string().optional(),
  voiceover: z.string().optional(),
  // Gemma-generated prompt for AI background image generation
  image_prompt: z.string().optional(),
  // Animation style for text/image entrance in Remotion
  animation: AnimationTypeSchema.optional().default("fade-in"),
});

export const VideoArtifactSchema = z.object({
  type: z.literal("video"),
  campaign: z.object({
    type: z.enum([
      "product_launch",
      "discount",
      "feature_announcement",
      "event",
      "general",
    ]),
    product_name: z.string().min(1),
    key_facts: z.array(z.string()),
    cta_text: z.string().min(1),
    cta_url: z.string().optional(),
  }),
  duration: z.number().positive(),
  aspect_ratio: z.enum(["9:16", "16:9", "1:1"]),
  style: z.object({
    mood: z.enum(["energetic", "calm", "premium", "playful"]),
    palette: z.object({
      bg1: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      bg2: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }),
    font_family: z.string().default("Arial"),
  }),
  scenes: z.array(SceneSchema).min(3).max(6),
  voiceover: z.object({
    enabled: z.boolean(),
    voice: z.string().optional(),
  }),
  music: z.object({
    enabled: z.boolean(),
    mood: z.string().optional(),
    volume: z.number().min(0).max(1).default(0.2),
  }),
});

export type VideoArtifact = z.infer<typeof VideoArtifactSchema>;
export type Scene = z.infer<typeof SceneSchema>;
