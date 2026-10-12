/**
 * LLM client: one OpenAI-compatible chat-completions call path (05).
 * Env: LLM_API_KEY, LLM_BASE_URL, LLM_MODEL (+ optional LLM_FALLBACK_MODELS,
 * comma-separated, tried in order when the primary model is rate-limited or
 * slow). Server-side only — never import this from a client component.
 */

export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMError";
  }
}

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL && process.env.LLM_MODEL);
}

const TIMEOUT_MS = 40_000;

/**
 * Total budget for one call across the whole model chain. Without this, a chain
 * of unhealthy models turns a "wait a minute" into a multi-minute hang.
 */
const CHAIN_BUDGET_MS = 25_000;

/** Primary model first, then any fallbacks. */
function models(): string[] {
  const primary = process.env.LLM_MODEL as string;
  const extra = (process.env.LLM_FALLBACK_MODELS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [primary, ...extra.filter((m) => m !== primary)];
}

/**
 * Short-lived memory of rate-limited or overloaded models, so a request doesn't
 * pay the whole chain's latency on every call. Cooldowns are per warm instance.
 */
const coolingUntil = new Map<string, number>();
const COOLDOWN_MS: Record<number, number> = { 429: 120_000, 503: 60_000 };

function cooling(model: string): boolean {
  const until = coolingUntil.get(model);
  return until !== undefined && Date.now() < until;
}

function markUnhealthy(model: string, status: number): void {
  const ms = COOLDOWN_MS[status];
  if (ms) coolingUntil.set(model, Date.now() + ms);
}

function markHealthy(model: string): void {
  coolingUntil.delete(model);
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

/** One chat completion. Throws LLMError with a plain-words message on any failure. */
export async function chat(system: string, user: string, opts: ChatOptions = {}): Promise<string> {
  if (!llmConfigured()) {
    throw new LLMError("AI is off in this deployment (no LLM_API_KEY).");
  }
  const base = (process.env.LLM_BASE_URL as string).replace(/\/$/, "");
  const body: Record<string, unknown> = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: opts.temperature ?? 0.15,
    // Some OpenAI-compatible endpoints (Gemini's included) spend hidden
    // reasoning tokens before the visible answer, so leave real headroom.
    max_tokens: opts.maxTokens ?? 4096,
  };
  if (opts.json !== false) body.response_format = { type: "json_object" };

  const chain = models();
  const ordered = [
    ...chain.filter((m) => !cooling(m)),
    ...chain.filter((m) => cooling(m)),
  ];
  let lastError = "";
  const deadline = Date.now() + CHAIN_BUDGET_MS;
  for (const model of ordered) {
    const maxAttempts = cooling(model) ? 1 : 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (Date.now() >= deadline) {
        throw new LLMError(
          lastError.includes("rate-limited")
            ? lastError
            : "The model service is slow right now. Try again in a minute.",
        );
      }
      if (attempt > 0) {
        const backoff = attempt * 2000;
        if (Date.now() + backoff >= deadline) continue;
        await new Promise((r) => setTimeout(r, backoff));
      }
      const controller = new AbortController();
      // each attempt is bounded by both its own timeout and the chain's budget
      const budget = Math.max(1000, Math.min(TIMEOUT_MS, deadline - Date.now()));
      const timer = setTimeout(() => controller.abort(), budget);
      let res: Response;
      try {
        res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LLM_API_KEY}`,
          },
          body: JSON.stringify({ ...body, model }),
          signal: controller.signal,
          cache: "no-store",
        });
      } catch (e) {
        clearTimeout(timer);
        lastError =
          (e as Error).name === "AbortError"
            ? "The model took too long to answer. Try again."
            : "Could not reach the model service.";
        console.error(`[llm] ${model} attempt ${attempt + 1} failed: ${(e as Error).message}`);
        continue;
      }
      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // plain-words message per failure class; quota messages are the common one
        lastError =
          res.status === 429
            ? "The model service is rate-limited right now. Try again in a minute."
            : res.status === 503
              ? "The model service is overloaded right now. Try again in a minute."
              : `The model service returned ${res.status}.`;
        console.error(`[llm] ${model} attempt ${attempt + 1} -> ${res.status}: ${text.slice(0, 200)}`);
        // rate limits and transient overload get one more try, then the model rests
        if (res.status === 429 || res.status === 503) {
          markUnhealthy(model, res.status);
          continue;
        }
        break;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = "The model returned an empty answer.";
        console.error(`[llm] ${model} attempt ${attempt + 1} -> empty content`);
        continue;
      }
      markHealthy(model);
      return content;
    }
  }
  throw new LLMError(lastError || "The model service is unavailable.");
}

/** Parse the model's JSON, tolerating ```json fences. Throws LLMError on bad JSON. */
export function parseJsonLoose(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    console.error(`[llm] unparseable model output (first 400 chars): ${cleaned.slice(0, 400)}`);
    throw new LLMError("The model returned text that is not valid JSON.");
  }
}

/** chat() + one retry with the parse error appended (05 "Failure handling"). */
export async function chatJson(
  system: string,
  user: string,
  opts: ChatOptions = {},
): Promise<unknown> {
  let lastErr: LLMError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chat(
      system,
      attempt === 0
        ? user
        : `${user}\n\nYour previous reply failed validation: ${lastErr?.message}. Return JSON only, no prose.`,
      opts,
    );
    try {
      return parseJsonLoose(raw);
    } catch (e) {
      lastErr = e as LLMError;
    }
  }
  throw lastErr ?? new LLMError("The model could not produce valid JSON.");
}
