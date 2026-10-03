/**
 * LLM client abstraction — provider-swappable.
 * Supports: google (AI Studio / Vertex), openai-compat (Ollama, vLLM), hf (HF Inference API).
 *
 * All providers are driven through the OpenAI SDK because:
 *   - Google AI Studio exposes an OpenAI-compatible endpoint
 *   - Ollama / vLLM are OpenAI-compatible by design
 *   - HF Inference API has an OpenAI-compatible endpoint too
 */
import OpenAI from "openai";

export interface LLM {
  generateJSON(
    system: string,
    user: string,
    schemaHint: object,
    images?: Buffer[]
  ): Promise<string>;
}

function stripFences(raw: string): string {
  // 1. Strip <thought>...</thought> or <thinking>...</thinking> blocks (Gemma 4 thinking mode)
  let s = raw.replace(/<thought>[\s\S]*?<\/thought>/gi, "");
  s = s.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  // 2. Strip ```json ... ``` or ``` ... ``` code fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  // 3. Find the first { and last } to extract bare JSON even if there's prose around it
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return s.trim();
}

function buildClient(): { client: OpenAI; model: string } {
  const provider = process.env.GEMMA_PROVIDER ?? "google";
  const model = process.env.GOOGLE_MODEL ?? "gemma-4-it";

  if (provider === "google") {
    // Google AI Studio OpenAI-compatible endpoint
    const client = new OpenAI({
      apiKey: process.env.GOOGLE_API_KEY ?? "",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    return { client, model };
  }

  if (provider === "openai") {
    // Ollama / vLLM / any local server
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "ollama",
      baseURL: process.env.OPENAI_BASE_URL ?? "http://localhost:11434/v1",
    });
    return { client, model };
  }

  if (provider === "hf") {
    // Hugging Face Inference API (OpenAI-compatible)
    const client = new OpenAI({
      apiKey: process.env.HF_API_KEY ?? "",
      baseURL: `https://api-inference.huggingface.co/models/${model}/v1`,
    });
    return { client, model };
  }

  throw new Error(`Unknown GEMMA_PROVIDER: ${provider}`);
}

// ponytail: single client instance per process; no pooling needed at this scale
let _instance: { client: OpenAI; model: string } | null = null;
function getInstance() {
  if (!_instance) _instance = buildClient();
  return _instance;
}

export function createLLM(): LLM {
  return {
    async generateJSON(system, user, _schemaHint, images) {
      const { client, model } = getInstance();

      // Build the user content — include images if the provider can handle them
      type ContentPart =
        | OpenAI.Chat.ChatCompletionContentPartText
        | OpenAI.Chat.ChatCompletionContentPartImage;

      const userContent: ContentPart[] = [{ type: "text", text: user }];

      if (images && images.length > 0) {
        for (const buf of images) {
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${buf.toString("base64")}`,
            },
          });
        }
      }

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ];

      const isGoogle = (process.env.GEMMA_PROVIDER ?? "google") === "google";

      const resp = await client.chat.completions.create(
        {
          model,
          messages,
          temperature: 0.5,
          max_tokens: 2048,
          // NOTE: response_format: json_object is NOT supported on the Gemini OpenAI-compat
          // endpoint for Gemma models — it returns 400. We enforce JSON via the system prompt
          // and extract it with stripFences() instead.
        },
        { timeout: 60_000 }
      );

      const raw = resp.choices[0]?.message?.content ?? "";
      return stripFences(raw);
    },
  };
}
