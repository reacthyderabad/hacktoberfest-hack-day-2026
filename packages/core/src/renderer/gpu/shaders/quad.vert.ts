/**
 * Vertex shader for the textured full-screen quad.
 *
 * Draws two triangles (TRIANGLE_STRIP, 4 vertices) that together cover the
 * clip's region on the canvas. The vertex positions are in clip space (-1..1).
 *
 * Uniforms:
 *   uTransform — 3×3 matrix (column-major) mapping normalized stage coords
 *                (0..1 in both axes, origin top-left) to clip space (-1..1).
 *   uCrop      — vec4 (x, y, w, h), a source-space sub-rect (0..1) to sample
 *                instead of the full texture. `w <= 0.0` (the default for
 *                every caller that never sets it) means "no crop" — samples
 *                the full 0..1 range, identical to before this uniform existed.
 *
 * Outputs:
 *   vTexCoord — UV coordinates (0..1) passed to the fragment shader, adjusted
 *               by uCrop.
 *   vQuadUv   — raw 0..1 quad-local coordinates, crop-independent. Used by
 *               effects that must follow the drawn box rather than the source
 *               sub-rect (e.g. the rounded-corner mask).
 */
export const QUAD_VERT_SRC = /* glsl */ `#version 300 es
precision highp float;

// Positions for a unit quad in normalized stage space (0..1, origin top-left).
// Laid out for TRIANGLE_STRIP: TL, BL, TR, BR.
const vec2 POSITIONS[4] = vec2[4](
  vec2(0.0, 0.0),
  vec2(0.0, 1.0),
  vec2(1.0, 0.0),
  vec2(1.0, 1.0)
);

// 3×3 column-major transform: maps normalized stage coords → clip space.
// Built by the CPU from the clip's Transform + stage/viewport geometry.
uniform mat3 uTransform;
uniform vec4 uCrop;

out vec2 vTexCoord;
out vec2 vQuadUv;

void main() {
  vec2 pos = POSITIONS[gl_VertexID];
  vQuadUv = vec2(pos.x, 1.0 - pos.y); // flip Y for GL texture convention

  vec4 crop = uCrop.z > 0.0 ? uCrop : vec4(0.0, 0.0, 1.0, 1.0);
  vTexCoord = vec2(crop.x + pos.x * crop.z, 1.0 - (crop.y + pos.y * crop.w));

  // Homogeneous multiply, then convert to clip space: stage Y is top-down,
  // GL NDC is bottom-up, so we negate the Y component produced by the matrix.
  vec3 ndc = uTransform * vec3(pos, 1.0);
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}
`
