/**
 * A single scene layer in the Remotion composition.
 *
 * Layer order (bottom to top):
 *   1. Background PNG (with Ken Burns motion)
 *   2. Dark gradient overlay (improves text legibility)
 *   3. User product image (optional, with entrance animation)
 *   4. Headline text (with entrance animation)
 *   5. Subtext (with entrance animation, offset 6 frames after headline)
 *   6. Scene-cut flash overlay
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  staticFile,
} from "remotion";
import type { RemotionScene } from "./types.js";
import {
  useAnimationStyle,
  useKenBurns,
  useSceneFlash,
} from "./animations.js";

// Ken Burns variant cycles through scenes to add visual variety
const KB_VARIANTS: Array<"zoom-in" | "zoom-out" | "pan-right" | "pan-left"> = [
  "zoom-in",
  "pan-right",
  "zoom-out",
  "pan-left",
];

interface SceneCompProps {
  scene: RemotionScene;
  sceneIndex: number;
  voicePath: string | null;
  voiceDurationFrames: number;
}

export const SceneComp: React.FC<SceneCompProps> = ({
  scene,
  sceneIndex,
  voicePath,
  voiceDurationFrames,
}) => {
  const frame = useCurrentFrame(); // relative to this <Sequence>'s start
  const { fps, width, height } = useVideoConfig();

  const kbVariant = KB_VARIANTS[sceneIndex % KB_VARIANTS.length];
  const kenBurnsStyle = useKenBurns(frame, scene.durationFrames, kbVariant);
  const flashStyle = useSceneFlash(frame);

  // Text animation — headline enters at frame 0, subtext at frame 6
  const headlineStyle = useAnimationStyle(scene.animation, frame, fps);
  const subtextStyle = useAnimationStyle(
    scene.animation,
    Math.max(0, frame - 6),
    fps
  );

  // Asset image — enters 3 frames after headline
  const assetStyle = useAnimationStyle(
    scene.animation,
    Math.max(0, frame - 3),
    fps
  );

  // Headline font size: CTA bigger, shrinks for long text
  const headlineFontSize = scene.isCta
    ? Math.round(height * 0.056)
    : scene.headline.length > 18
    ? Math.max(Math.round(height * 0.031), Math.round(height * 0.05) - (scene.headline.length - 18) * 2)
    : Math.round(height * 0.05);

  const subtextFontSize = Math.round(height * 0.025);

  // Whether the headline should sit low (when a product image is present)
  const hasAsset = Boolean(scene.assetPath);
  const headlineY = hasAsset ? "78%" : "50%";
  const headlineTranslateY = hasAsset ? "-50%" : "-50%";
  const subtextY = hasAsset ? "87%" : "62%";

  return (
    <AbsoluteFill>
      {/* ── Layer 1: Background image with Ken Burns ── */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={scene.bgPath}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            ...kenBurnsStyle,
          }}
        />
      </AbsoluteFill>

      {/* ── Layer 2: Gradient overlay for legibility ── */}
      <AbsoluteFill
        style={{
          background: hasAsset
            ? "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.75) 100%)"
            : "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.50) 50%, rgba(0,0,0,0.70) 100%)",
        }}
      />

      {/* ── Layer 3: Product / user image ── */}
      {scene.assetPath && (
        <AbsoluteFill
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            paddingTop: "8%",
            ...assetStyle,
          }}
        >
          <Img
            src={scene.assetPath}
            style={{
              maxWidth: "80%",
              maxHeight: "55%",
              objectFit: "contain",
              borderRadius: 12,
              boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* ── Layer 4: Headline text ── */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          position: "absolute",
          top: headlineY,
          left: 0,
          right: 0,
          transform: `translateY(${headlineTranslateY})`,
          paddingLeft: "6%",
          paddingRight: "6%",
          ...headlineStyle,
        }}
      >
        <span
          style={{
            fontFamily: scene.fontFamily,
            fontSize: headlineFontSize,
            fontWeight: "900",
            color: scene.isCta ? scene.accentColor : scene.textColor,
            textAlign: "center",
            lineHeight: 1.15,
            textShadow: "0 3px 18px rgba(0,0,0,0.6)",
            letterSpacing: scene.isCta ? "0.03em" : "0.01em",
            // Uppercase for hook and CTA scenes
            textTransform: scene.isCta ? "uppercase" : "none",
          }}
        >
          {scene.headline}
        </span>
      </AbsoluteFill>

      {/* ── Layer 5: Subtext ── */}
      {scene.subtext && (
        <AbsoluteFill
          style={{
            position: "absolute",
            top: subtextY,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            paddingLeft: "8%",
            paddingRight: "8%",
            ...subtextStyle,
          }}
        >
          <span
            style={{
              fontFamily: scene.fontFamily,
              fontSize: subtextFontSize,
              fontWeight: "400",
              color: scene.textColor,
              textAlign: "center",
              lineHeight: 1.4,
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              opacity: 0.92,
            }}
          >
            {scene.subtext}
          </span>
        </AbsoluteFill>
      )}

      {/* ── Layer 6: Scene-cut flash ── */}
      <AbsoluteFill
        style={{
          backgroundColor: "#000000",
          pointerEvents: "none",
          ...flashStyle,
        }}
      />

      {/* ── Voiceover audio ── */}
      {voicePath && (
        <Audio
          src={voicePath}
          startFrom={0}
          endAt={voiceDurationFrames}
          volume={1}
        />
      )}
    </AbsoluteFill>
  );
};
