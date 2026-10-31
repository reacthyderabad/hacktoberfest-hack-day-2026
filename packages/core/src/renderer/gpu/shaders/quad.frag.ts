/**
 * Fragment shader for the textured quad.
 *
 * Samples a 2D texture and multiplies by an opacity uniform to produce the
 * final RGBA output. Used by VideoLayer (and future ImageLayer, TextLayer).
 *
 * Uniforms:
 *   uTexture — sampler2D bound to texture unit 0.
 *   uOpacity — float [0..1] composited via premultiplied alpha.
 *   uRadius  — vec2, per-axis corner radius in quad-uv units (0..0.5). Zero
 *              (the default for every caller that never sets it, e.g. Text/
 *              ShapeLayer) skips the mask entirely — same output as before
 *              this uniform existed.
 *
 * The corner mask is computed in `vQuadUv` (the drawn box's own 0..1 space),
 * not `vTexCoord` (the sampled, possibly cropped, source space) — otherwise a
 * crop would round a sub-rect of the source instead of the box actually drawn.
 */
export const QUAD_FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

uniform sampler2D uTexture;
uniform float uOpacity;
uniform vec2 uRadius;

in vec2 vTexCoord;
in vec2 vQuadUv;
out vec4 fragColor;

void main() {
  vec4 texel = texture(uTexture, vTexCoord);
  float mask = 1.0;
  if (uRadius.x > 0.0 && uRadius.y > 0.0) {
    // Rounded-box SDF in quad-uv space (centre at 0.5,0.5, half-extent 0.5).
    vec2 r = min(uRadius, vec2(0.5));
    vec2 p = abs(vQuadUv - 0.5) - (0.5 - r);
    float d = length(max(p, 0.0) / r) - 1.0;
    float aa = length(fwidth(vQuadUv) / r);
    mask = 1.0 - smoothstep(-aa, aa, d);
  }
  fragColor = vec4(texel.rgb * uOpacity * mask, texel.a * uOpacity * mask);
}
`
