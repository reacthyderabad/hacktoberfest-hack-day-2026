/**
 * Shared types used across all Remotion composition files.
 * These mirror the ElahSpec / VideoArtifact shape but are kept
 * independent so the Remotion bundle has no Node.js imports.
 */

export type AnimationType =
  | "none"
  | "fade-in"
  | "slide-up"
  | "slide-down"
  | "zoom-in"
  | "zoom-out"
  | "pop"
  | "wipe-right";

/** One scene's worth of data passed into the Remotion composition. */
export interface RemotionScene {
  id: string;
  /** Start frame (absolute) */
  startFrame: number;
  /** Duration in frames */
  durationFrames: number;
  /** Absolute path to the background PNG */
  bgPath: string;
  /** Absolute path to a user image, if any */
  assetPath?: string;
  headline: string;
  subtext?: string;
  /** Animation type for text/image entrance */
  animation: AnimationType;
  /** Colors */
  textColor: string;
  accentColor: string;
  fontFamily: string;
  /** true when this is the CTA scene */
  isCta: boolean;
  /** Generated AI image prompt (stored for metadata; not rendered on screen) */
  imagePrompt?: string;
}

/** Top-level props passed to the root <CampexVideo> composition. */
export interface CampexVideoProps extends Record<string, unknown> {
  fps: number;
  width: number;
  height: number;
  scenes: RemotionScene[];
  /** Absolute path to background music file, or null */
  musicPath: string | null;
  musicVolume: number;
  /** Absolute paths to per-scene voiceover files (index matches scenes[]) */
  voicePaths: (string | null)[];
  /** Duration in frames for each voiceover */
  voiceDurationFrames: number[];
}
