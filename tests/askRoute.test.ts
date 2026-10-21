import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The /api/ask spend limiter must charge only a request that is about to reach
 * the model. Malformed questions and AI-off deployments cost nothing, so they
 * must not burn a shared address's allowance — the same policy /api/why pins.
 */
const mocks = vi.hoisted(() => ({
  chatJson: vi.fn(),
  llmConfigured: vi.fn(),
}));

vi.mock("@/lib/llm", () => ({
  chatJson: (...args: unknown[]) => mocks.chatJson(...args),
  llmConfigured: () => mocks.llmConfigured(),
  LLMError: class extends Error {
    transient = false;
  },
}));
vi.mock("@/lib/prompts", () => ({ buildAskSystem: () => "system prompt" }));
vi.mock("@/lib/grounding", () => ({
  checkGrounded: (answer: string, cited_ids: string[]) => ({ ok: true, resolvedIds: cited_ids }),
}));

// ask reads the registry through RegistryView.load: any id resolves, so
// limiter tests never depend on the seed data
vi.mock("@/lib/registry", () => ({
  RegistryView: {
    load: () => ({
      fact: (id: string) => ({
        id,
        entity_id: id,
        source_id: "s0",
        as_of: "2024",
        value_text: "1",
        value_num: 1,
        confidence: "high",
        unverified: false,
      }),
      policy: () => null,
      source: () => null,
    }),
  },
}));

/** POST /api/ask with no proxy headers, so every call shares one "local" bucket. */
function postAsk(POST: (req: Request) => Promise<Response>, body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/ask", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("/api/ask spend limiter", () => {
  beforeEach(() => {
    mocks.chatJson.mockReset();
    mocks.llmConfigured.mockReset();
    vi.resetModules();
  });

  it("malformed questions do not spend allowance", async () => {
    const { POST } = await import("@/app/api/ask/route");
    mocks.llmConfigured.mockReturnValue(true);
    mocks.chatJson.mockResolvedValue({
      answer: "Grounded.",
      cited_ids: ["f0"],
      not_in_registry: false,
      missing: null,
    });

    for (let i = 0; i < 60; i++) {
      const res = await postAsk(POST, "no");
      expect(res.status, `request ${i + 1}`).toBe(400);
    }

    // the 60 rejections above must not have tripped the bucket
    const fresh = await postAsk(POST, { question: "What share of chewing does India run?" });
    expect(fresh.status).toBe(200);
    expect(mocks.chatJson).toHaveBeenCalledTimes(1);
  });

  it("an AI-off deployment answers without charging the allowance", async () => {
    const { POST } = await import("@/app/api/ask/route");
    mocks.llmConfigured.mockReturnValue(false);

    for (let i = 0; i < 61; i++) {
      const res = await postAsk(POST, { question: `Question number ${i}, garment share?` });
      expect(res.status, `request ${i + 1}`).toBe(200);
      expect((await res.json()).aiOff).toBe(true);
    }
    expect(mocks.chatJson).not.toHaveBeenCalled();
  });

  it("requests that reach the model still trip the per-IP limit", async () => {
    const { POST } = await import("@/app/api/ask/route");
    mocks.llmConfigured.mockReturnValue(true);
    mocks.chatJson.mockResolvedValue({
      answer: "Grounded.",
      cited_ids: ["f0"],
      not_in_registry: false,
      missing: null,
    });

    for (let i = 0; i < 60; i++) {
      const res = await postAsk(POST, { question: `Question number ${i}, garment share?` });
      expect(res.status, `request ${i + 1}`).toBe(200);
    }

    const over = await postAsk(POST, { question: "One more garment share question?" });
    expect(over.status).toBe(429);
    expect(over.headers.get("Retry-After")).toBe("60");
  });
});
