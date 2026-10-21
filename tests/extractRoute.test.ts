import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The /api/extract spend limiter must charge only a request that is about to
 * reach the model. Malformed body shapes and short pastes fail before any model
 * work happens, so they must not burn a shared address's allowance — the same
 * policy /api/why pins.
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
vi.mock("@/lib/prompts", () => ({ buildExtractSystem: () => "system prompt" }));

/** POST /api/extract with no proxy headers, so every call shares one "local" bucket. */
function postExtract(POST: (req: Request) => Promise<Response>, body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/extract", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const LONG_SOURCE =
  "India runs most of the world's garment factories, and Europe imports heavily from Tirupur.";

describe("/api/extract spend limiter", () => {
  beforeEach(() => {
    mocks.chatJson.mockReset();
    mocks.llmConfigured.mockReset();
    vi.resetModules();
  });

  it("malformed body shapes do not spend allowance", async () => {
    const { POST } = await import("@/app/api/extract/route");
    mocks.llmConfigured.mockReturnValue(true);
    mocks.chatJson.mockResolvedValue({ facts: [], warnings: [] });

    for (let i = 0; i < 10; i++) {
      const res = await postExtract(POST, "not json at all");
      expect(res.status, `request ${i + 1}`).toBe(400);
    }

    // under the old placement these 10 charges would have tripped this call
    const fresh = await postExtract(POST, {
      text: LONG_SOURCE,
      meta: { title: "T", publisher: "P", type: "industry_report" },
    });
    expect(fresh.status).toBe(200);
    expect(mocks.chatJson).toHaveBeenCalledTimes(1);
  });

  it("a too-short paste fails before any charge", async () => {
    const { POST } = await import("@/app/api/extract/route");
    mocks.llmConfigured.mockReturnValue(true);
    mocks.chatJson.mockResolvedValue({ facts: [], warnings: [] });

    for (let i = 0; i < 10; i++) {
      const res = await postExtract(POST, {
        text: "too short",
        meta: { title: "T", publisher: "P", type: "industry_report" },
      });
      expect(res.status, `request ${i + 1}`).toBe(400);
    }

    const fresh = await postExtract(POST, {
      text: LONG_SOURCE,
      meta: { title: "T", publisher: "P", type: "industry_report" },
    });
    expect(fresh.status).toBe(200);
    expect(mocks.chatJson).toHaveBeenCalledTimes(1);
  });

  it("requests that reach the model still trip the per-IP limit", async () => {
    const { POST } = await import("@/app/api/extract/route");
    mocks.llmConfigured.mockReturnValue(true);
    mocks.chatJson.mockResolvedValue({ facts: [], warnings: [] });

    for (let i = 0; i < 10; i++) {
      const res = await postExtract(POST, {
        text: LONG_SOURCE,
        meta: { title: "T", publisher: "P", type: "industry_report" },
      });
      expect(res.status, `request ${i + 1}`).toBe(200);
    }

    const over = await postExtract(POST, {
      text: LONG_SOURCE,
      meta: { title: "T", publisher: "P", type: "industry_report" },
    });
    expect(over.status).toBe(429);
    expect(over.headers.get("Retry-After")).toBe("60");
  });
});
