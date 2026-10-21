import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The per-IP limiter on /api/why must charge only a request that is about to
 * reach the model. Answers that cost nothing — malformed requests, empty
 * queries, AI-off builds and cache hits — must not spend allowance, or a few
 * users behind one office NAT cap everyone out of notes that come from cache
 * or never needed the model at all.
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
vi.mock("@/lib/prompts", () => ({ buildWhySystem: () => "system prompt" }));
vi.mock("@/lib/grounding", () => ({
  checkGrounded: (_note: string, cited_ids: string[]) => ({ ok: true, resolvedIds: cited_ids }),
}));

// a synthetic registry: any id resolves, so a caller can mint fresh fact pairs
// for limiter-trip tests without coupling them to seed data
vi.mock("@/lib/registry", () => ({
  registry: {
    fact: (id: string) => ({ id, entity_id: id, value_num: 1, value_text: null }),
    factsByMetric: (metric: string) => {
      void metric;
      return [];
    },
  },
}));

/** POST /api/why and carry no proxy headers, so every call shares one "local" bucket. */
function postWhy(POST: (req: Request) => Promise<Response>, body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/why", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("/api/why spend limiter", () => {
  beforeEach(() => {
    mocks.chatJson.mockReset();
    mocks.llmConfigured.mockReset();
    vi.resetModules();
  });

  it("answers that never reach the model do not spend allowance", async () => {
    const { POST } = await import("@/app/api/why/route");
    mocks.llmConfigured.mockReturnValue(false);

    // the old placement charged before the AI-off exit, so this would 429 at 31
    for (let i = 0; i < 31; i++) {
      const res = await postWhy(POST, { factIds: ["f0", "f1"] });
      expect(res.status, `request ${i + 1}`).toBe(200);
      expect((await res.json()).aiOff).toBe(true);
    }
    expect(mocks.chatJson).not.toHaveBeenCalled();
  });

  it("malformed requests are free and cannot burn a shared address's allowance", async () => {
    const { POST } = await import("@/app/api/why/route");
    mocks.llmConfigured.mockReturnValue(true);
    mocks.chatJson.mockResolvedValue({ note: "n", cited_ids: ["a", "b"] });

    for (let i = 0; i < 30; i++) {
      const res = await postWhy(POST, "not json at all");
      expect(res.status).toBe(400);
    }

    // under the old placement these 30 charges would have tripped this call
    const fresh = await postWhy(POST, { factIds: ["a", "b"] });
    expect(fresh.status).toBe(200);
    expect(mocks.chatJson).toHaveBeenCalledTimes(1);
  });

  it("requests that reach the model still trip the per-IP limit", async () => {
    const { POST } = await import("@/app/api/why/route");
    mocks.llmConfigured.mockReturnValue(true);
    mocks.chatJson.mockResolvedValue({ note: "n", cited_ids: ["a", "b"] });

    let counted = 0;
    for (let i = 0; i < 30; i++) {
      // a distinct fact pair every time, so each request is a cache miss
      const pair = [String(2 * i), String(2 * i + 1)];
      const res = await postWhy(POST, { factIds: pair });
      counted += res.status === 200 ? 1 : 0;
      expect(res.status, `request ${i + 1}`).toBe(200);
    }
    expect(counted).toBe(30);

    const over = await postWhy(POST, { factIds: ["x", "y"] });
    expect(over.status).toBe(429);
    expect(over.headers.get("Retry-After")).toBe("60");
  });
});
