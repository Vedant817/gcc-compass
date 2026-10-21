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
  lookup: vi.fn(),
}));

vi.mock("@/lib/llm", () => ({
  chatJson: (...args: unknown[]) => mocks.chatJson(...args),
  llmConfigured: () => mocks.llmConfigured(),
  LLMError: class extends Error {
    transient = false;
  },
}));
vi.mock("@/lib/prompts", () => ({ buildExtractSystem: () => "system prompt" }));
vi.mock("node:dns/promises", () => ({
  lookup: (...args: unknown[]) => mocks.lookup(...args),
}));

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
    mocks.lookup.mockReset();
    vi.resetModules();
    vi.unstubAllGlobals();
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

describe("/api/extract URL fetch limiter", () => {
  beforeEach(() => {
    mocks.chatJson.mockReset();
    mocks.llmConfigured.mockReset();
    mocks.lookup.mockReset();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  /** POST /api/extract with only a URL, so the fetch branch runs. */
  function postUrl(POST: (req: Request) => Promise<Response>, url: string): Promise<Response> {
    return postExtract(POST, {
      url,
      meta: { title: "T", publisher: "P", type: "industry_report" },
    });
  }

  it("an over-limit URL request is refused before any outbound fetch", async () => {
    const { POST } = await import("@/app/api/extract/route");
    mocks.lookup.mockResolvedValue([{ address: "93.184.216.34" }]);
    mocks.llmConfigured.mockReturnValue(true);
    mocks.chatJson.mockResolvedValue({ facts: [], warnings: [] });
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchSpy);

    for (let i = 0; i < 10; i++) {
      const res = await postUrl(POST, "https://example.invalid/page");
      expect(res.status, `request ${i + 1}`).toBe(400);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(10);

    // the 11th request must stop at the fetch gate: DNS lookup and fetch still
    // mocked, but neither may be reached
    const next = await postUrl(POST, "https://example.invalid/page");
    expect(next.status).toBe(429);
    expect(next.headers.get("Retry-After")).toBe("60");
    expect(await next.json()).toEqual({ error: "Too many URL fetches from this address. Wait a minute." });
    expect(fetchSpy).toHaveBeenCalledTimes(10);
    expect(mocks.lookup).toHaveBeenCalledTimes(10);
  });

  it("a URL that yields a too-short page cannot loop past the fetch cap either", async () => {
    const { POST } = await import("@/app/api/extract/route");
    mocks.lookup.mockResolvedValue([{ address: "93.184.216.34" }]);
    mocks.llmConfigured.mockReturnValue(true);
    mocks.chatJson.mockResolvedValue({ facts: [], warnings: [] });
    const fetchSpy = vi.fn().mockResolvedValue(new Response("short"));
    vi.stubGlobal("fetch", fetchSpy);

    for (let i = 0; i < 10; i++) {
      const res = await postUrl(POST, "https://example.invalid/page");
      expect(res.status, `request ${i + 1}`).toBe(400);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(10);

    const next = await postUrl(POST, "https://example.invalid/page");
    expect(next.status).toBe(429);
    expect(fetchSpy).toHaveBeenCalledTimes(10);
  });

  it("exhausting the fetch allowance leaves the spend allowance fresh", async () => {
    const { POST } = await import("@/app/api/extract/route");
    mocks.lookup.mockResolvedValue([{ address: "93.184.216.34" }]);
    mocks.llmConfigured.mockReturnValue(true);
    mocks.chatJson.mockResolvedValue({ facts: [], warnings: [] });
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchSpy);

    // ten failing URL requests burn the fetch bucket; the spend bucket is
    // untouched because none of them reached the model
    for (let i = 0; i < 10; i++) {
      const res = await postUrl(POST, "https://example.invalid/page");
      expect(res.status, `request ${i + 1}`).toBe(400);
    }
    expect(mocks.chatJson).not.toHaveBeenCalled();

    // a text paste still works: it never fetches, so only the spend bucket applies
    const paste = await postExtract(POST, {
      text: LONG_SOURCE,
      meta: { title: "T", publisher: "P", type: "industry_report" },
    });
    expect(paste.status).toBe(200);
    expect(mocks.chatJson).toHaveBeenCalledTimes(1);
  });
});
