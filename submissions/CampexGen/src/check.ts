/**
 * Self-check: validate the VideoArtifact schema + grounding logic without any external calls.
 * Run: npx tsx src/check.ts
 * Exits 0 on pass, 1 on fail.
 */
import { VideoArtifactSchema } from "./artifact.js";
import { validate, applyDurationEdit } from "./validate.js";

let failed = 0;

function assert(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}${detail ? ": " + detail : ""}`);
    failed++;
  }
}

// ── Test 1: valid artifact parses correctly ────────────────────────────────────
const VALID: unknown = {
  type: "video",
  campaign: {
    type: "product_launch",
    product_name: "XYZ Pro",
    key_facts: ["16-hour battery", "M3 chip", "$1299"],
    cta_text: "Pre-order now",
    cta_url: "xyz.com/pro",
  },
  duration: 25,
  aspect_ratio: "9:16",
  style: {
    mood: "premium",
    palette: { bg1: "#0a0a0a", bg2: "#1a1a2e", text: "#ffffff", accent: "#e94560" },
    font_family: "Arial",
  },
  scenes: [
    { id: "s1", duration: 4, purpose: "hook",    headline: "Meet XYZ Pro",        voiceover: "Meet XYZ Pro." },
    { id: "s2", duration: 5, purpose: "product", headline: "M3 Chip Inside",      subtext: "Performance redefined" },
    { id: "s3", duration: 5, purpose: "benefit", headline: "16-Hour Battery" },
    { id: "s4", duration: 5, purpose: "info",    headline: "Available October 10", subtext: "Starting at $1299" },
    { id: "s5", duration: 6, purpose: "cta",     headline: "Pre-order Now",        subtext: "xyz.com/pro" },
  ],
  voiceover: { enabled: true, voice: "en-US-AriaNeural" },
  music: { enabled: true, mood: "premium", volume: 0.2 },
};

console.log("\n── Schema tests ──");
const parsed = VideoArtifactSchema.safeParse(VALID);
assert("valid artifact parses", parsed.success, parsed.success ? "" : JSON.stringify((parsed as any).error?.errors));

// ── Test 2: validation passes for a grounded artifact ─────────────────────────
console.log("\n── Validation tests ──");
if (parsed.success) {
  const source = "Introducing XYZ Pro, our fastest laptop. 16-hour battery, M3 chip, available October 10 for $1299. Pre-order now at xyz.com/pro";
  const result = validate(parsed.data, [], source);
  assert("grounded artifact validates", result.ok, result.ok ? "" : (result as any).errors?.join("; "));
}

// ── Test 3: grounding blocks invented number ───────────────────────────────────
const INVENTED: unknown = JSON.parse(JSON.stringify(VALID));
(INVENTED as any).scenes[2].headline = "Beats 99% of laptops";
const parsedInvented = VideoArtifactSchema.safeParse(INVENTED);
if (parsedInvented.success) {
  const source = "Introducing XYZ Pro, our fastest laptop. 16-hour battery, M3 chip for $1299.";
  const result = validate(parsedInvented.data, [], source);
  assert("invented % blocked by grounding", !result.ok, result.ok ? "should have failed" : "");
}

// ── Test 4: duration rescale ────────────────────────────────────────────────────
if (parsed.success) {
  const rescaled = applyDurationEdit(parsed.data, 15);
  const total = rescaled.scenes.reduce((s, sc) => s + sc.duration, 0);
  assert("rescale to 15s", Math.abs(total - 15) < 0.5, `got ${total.toFixed(2)}`);
}

// ── Test 5: bad scene count rejected ──────────────────────────────────────────
const TWO_SCENES: unknown = JSON.parse(JSON.stringify(VALID));
(TWO_SCENES as any).scenes = (TWO_SCENES as any).scenes.slice(0, 2);
const parsedTwo = VideoArtifactSchema.safeParse(TWO_SCENES);
assert("< 3 scenes rejected by schema", !parsedTwo.success);

// ── Test 6: isEditMessage classifier ────────────────────────────────────────
import { isEditMessage } from "./pipeline.js";
console.log("\n── Edit classifier tests ──");
// Campaign text should NOT be classified as edit, even with "use" in it
assert(
  "campaign with 'use' is not an edit",
  !isEditMessage("Flash sale! 40% off all sneakers this weekend only. Use code FLASH40 at checkout. Sale ends Sunday midnight. Shop at kicks.co", true),
);
// Actual edits should still be recognized
assert("'make it 15 seconds' is an edit", isEditMessage("make it 15 seconds", true));
assert("'shorter' is an edit", isEditMessage("shorter", true));
assert("'remove the voiceover' is an edit", isEditMessage("remove the voiceover", true));
// No existing artifact = never an edit
assert("no artifact = not edit", !isEditMessage("make it shorter", false));
// Campaign with URL is not an edit
assert("URL means not edit", !isEditMessage("Buy now at shop.com", true));

// ── Summary ────────────────────────────────────────────────────────────────────
console.log(`\n${failed === 0 ? "✅ All checks passed" : `❌ ${failed} check(s) failed`}`);
process.exit(failed > 0 ? 1 : 0);
