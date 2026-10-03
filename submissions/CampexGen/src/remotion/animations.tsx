/**
 * Animation helpers for Remotion compositions.
 *
 * Each exported hook / component takes a `frame` (relative to the sequence
 * start, i.e. 0 = first frame of this scene) and returns CSS properties or
 * a style object that drives the entrance animation.
 *
 * All animations use Remotion's `interpolate()` with an easing curve so they
 * feel snappy rather than mechanical.
 */
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { AnimationType } from "./types.js";

// ── Easing helpers ────────────────────────────────────────────────────────────

/** Smooth ease-out cubic */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ── Per-animation style builders ──────────────────────────────────────────────

function fadeIn(frame: number, durationFrames = 18): React.CSSProperties {
  const opacity = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return { opacity };
}

function slideUp(frame: number, durationFrames = 22): React.CSSProperties {
  const opacity = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const translateY = interpolate(frame, [0, durationFrames], [60, 0], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return { opacity, transform: `translateY(${translateY}px)` };
}

function slideDown(frame: number, durationFrames = 22): React.CSSProperties {
  const opacity = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const translateY = interpolate(frame, [0, durationFrames], [-60, 0], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return { opacity, transform: `translateY(${translateY}px)` };
}

function zoomIn(frame: number, durationFrames = 20): React.CSSProperties {
  const opacity = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const scale = interpolate(frame, [0, durationFrames], [0.8, 1], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return { opacity, transform: `scale(${scale})` };
}

function zoomOut(frame: number, durationFrames = 20): React.CSSProperties {
  const opacity = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const scale = interpolate(frame, [0, durationFrames], [1.2, 1], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return { opacity, transform: `scale(${scale})` };
}

function popAnimation(
  frame: number,
  fps: number,
  durationFrames: number
): React.CSSProperties {
  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.6 },
    durationInFrames: durationFrames,
  });
  const opacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });
  return { opacity, transform: `scale(${scale})` };
}

function wipeRight(frame: number, durationFrames = 24): React.CSSProperties {
  const progress = interpolate(frame, [0, durationFrames], [0, 100], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return {
    clipPath: `inset(0 ${100 - progress}% 0 0)`,
    // Opacity follows so content isn't visible outside the clip
    opacity: progress > 0 ? 1 : 0,
  };
}

// ── Public hook ───────────────────────────────────────────────────────────────

/**
 * Returns the animated style for a given animation type.
 * `frame` should be the frame number RELATIVE to the sequence start (0-based).
 */
export function useAnimationStyle(
  animation: AnimationType,
  frame: number,
  fps: number
): React.CSSProperties {
  switch (animation) {
    case "fade-in":   return fadeIn(frame);
    case "slide-up":  return slideUp(frame);
    case "slide-down":return slideDown(frame);
    case "zoom-in":   return zoomIn(frame);
    case "zoom-out":  return zoomOut(frame);
    case "pop":       return popAnimation(frame, fps, 20);
    case "wipe-right":return wipeRight(frame);
    case "none":
    default:          return {};
  }
}

// ── Background Ken Burns effect ───────────────────────────────────────────────
/**
 * Subtle Ken Burns (slow pan/zoom) on the background image.
 * `totalFrames` = total frames of this scene.
 */
export function useKenBurns(
  frame: number,
  totalFrames: number,
  variant: "zoom-in" | "zoom-out" | "pan-right" | "pan-left" = "zoom-in"
): React.CSSProperties {
  const progress = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  switch (variant) {
    case "zoom-in": {
      const scale = interpolate(progress, [0, 1], [1, 1.06]);
      return { transform: `scale(${scale})`, transformOrigin: "center center" };
    }
    case "zoom-out": {
      const scale = interpolate(progress, [0, 1], [1.06, 1]);
      return { transform: `scale(${scale})`, transformOrigin: "center center" };
    }
    case "pan-right": {
      const tx = interpolate(progress, [0, 1], [0, 2]);
      return {
        transform: `scale(1.04) translateX(${tx}%)`,
        transformOrigin: "center center",
      };
    }
    case "pan-left": {
      const tx = interpolate(progress, [0, 1], [0, -2]);
      return {
        transform: `scale(1.04) translateX(${tx}%)`,
        transformOrigin: "center center",
      };
    }
  }
}

// ── Scene transition overlay ──────────────────────────────────────────────────
/**
 * A quick black flash at the very start of a scene (4 frames) to simulate a
 * hard-cut with a subtle flash.  Opacity 1→0 in 4 frames.
 */
export function useSceneFlash(frame: number): React.CSSProperties {
  const opacity = interpolate(frame, [0, 4], [0.35, 0], {
    extrapolateRight: "clamp",
  });
  return { opacity };
}

// Needed because this file uses JSX types but doesn't actually render JSX itself.
import type React from "react";
