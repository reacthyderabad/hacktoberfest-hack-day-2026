/**
 * The main Remotion composition that assembles all scenes.
 *
 * Structure:
 *   <AbsoluteFill>                       — root container
 *     <Sequence from={0} durationInFrames={totalFrames}>
 *       <Audio src={musicPath} …/>       — background music
 *     </Sequence>
 *     {scenes.map(scene =>
 *       <Sequence from={scene.startFrame} durationInFrames={scene.durationFrames}>
 *         <SceneComp …/>
 *       </Sequence>
 *     )}
 *   </AbsoluteFill>
 *
 * Each scene is an independent <Sequence> so Remotion renders them in
 * timeline order.  Voiceover audio lives inside the scene's own <Sequence>
 * so it is scoped correctly.
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import type { CampexVideoProps } from "./types.js";
import { SceneComp } from "./SceneComp.js";

export const CampexVideo: React.FC<CampexVideoProps> = ({
  scenes,
  musicPath,
  musicVolume,
  voicePaths,
  voiceDurationFrames,
}) => {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* ── Background music — spans the full video ── */}
      {musicPath && (
        <Sequence from={0} durationInFrames={durationInFrames} layout="none">
          <Audio src={musicPath} volume={musicVolume} />
        </Sequence>
      )}

      {/* ── Per-scene sequences ── */}
      {scenes.map((scene, i) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationFrames}
          layout="none"
          name={`Scene ${i + 1}: ${scene.headline}`}
        >
          <SceneComp
            scene={scene}
            sceneIndex={i}
            voicePath={voicePaths[i] ?? null}
            voiceDurationFrames={voiceDurationFrames[i] ?? 0}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
