/**
 * Remotion bundle entry point.
 *
 * This file is what @remotion/bundler compiles — it must call registerRoot()
 * and export the composition via <Composition />.  It has NO Node.js imports.
 *
 * The composition ID is "CampexVideo" — referenced by name in renderRemotionVideo.ts.
 */
import React from "react";
import { Composition, registerRoot } from "remotion";
import { CampexVideo } from "./CampexVideo.js";
import type { CampexVideoProps } from "./types.js";

// Cast needed because Remotion's LooseComponentType requires Record<string,unknown>
// which CampexVideoProps satisfies via its index signature extension.
const CampexVideoComp = CampexVideo as React.ComponentType<Record<string, unknown>>;

// Default props used by Remotion Studio / preview mode only.
// The real props are injected at render time by renderRemotionVideo.ts.
const DEFAULT_PROPS: CampexVideoProps = {
  fps: 30,
  width: 1080,
  height: 1920,
  scenes: [
    {
      id: "preview",
      startFrame: 0,
      durationFrames: 90,
      bgPath: "",
      headline: "Preview Scene",
      animation: "fade-in",
      textColor: "#ffffff",
      accentColor: "#e94560",
      fontFamily: "Arial",
      isCta: false,
    },
  ],
  musicPath: null,
  musicVolume: 0.2,
  voicePaths: [null],
  voiceDurationFrames: [0],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CampexVideo"
      component={CampexVideoComp}
      durationInFrames={DEFAULT_PROPS.scenes.reduce(
        (sum, s) => sum + s.durationFrames,
        0
      )}
      fps={DEFAULT_PROPS.fps}
      width={DEFAULT_PROPS.width}
      height={DEFAULT_PROPS.height}
      defaultProps={DEFAULT_PROPS}
    />
  );
};

registerRoot(RemotionRoot);
