import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, makeRateLimiter } from "../lib/rateLimit";

/** A request stub with just the header access clientIp needs. */
function reqFrom(headers: Record<string, string>): { headers: { get(name: string): string | null } } {
  return { headers: new Headers(headers) };
}

describe("clientIp", () => {
  it("trusts the platform-set x-real-ip over a client-supplied XFF prefix", () => {
    const req = reqFrom({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "1.2.3.4, 198.51.100.9",
    });
    expect(clientIp(req)).toBe("203.0.113.7");
  });

  it("takes the rightmost x-forwarded-for entry (platform-appended), not the leftmost spoof", () => {
    const req = reqFrom({ "x-forwarded-for": "1.2.3.4, 9.9.9.9, 198.51.100.9" });
    expect(clientIp(req)).toBe("198.51.100.9");
  });

  it("falls back to local when no proxy header is present", () => {
    expect(clientIp(reqFrom({}))).toBe("local");
  });
});

describe("makeRateLimiter", () => {
  it("counts per bucket key and trips the limit", () => {
    const limited = makeRateLimiter({ limitPerMinute: 2 });
    expect(limited("203.0.113.7")).toBe(false);
    expect(limited("203.0.113.7")).toBe(false);
    expect(limited("203.0.113.7")).toBe(true);
  });

  it("a forged x-forwarded-for prefix does not mint a fresh bucket", () => {
    const limited = makeRateLimiter({ limitPerMinute: 2 });
    // the limit-burner keeps inventing leftmost XFF values; the real IP is pinned
    const attempts = [
      "1.2.3.4, 198.51.100.9",
      "9.9.9.9, 198.51.100.9",
      "77.77.77.77, 198.51.100.9",
    ];
    const results = attempts.map((xff) =>
      limited(clientIp(reqFrom({ "x-real-ip": "203.0.113.7", "x-forwarded-for": xff }))),
    );
    expect(results).toEqual([false, false, true]); // all spoofed prefixes land in one bucket
  });

  it("evicts expired buckets first when the map is at its cap", () => {
    const limited = makeRateLimiter({ limitPerMinute: 1, maxTrackedIps: 3 });
    expect(limited("old")).toBe(false);

    // "old" expired, so two fresh keys fit while it quietly stays in the map
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 61_000);
    expect(limited("x1")).toBe(false);
    expect(limited("x2")).toBe(false);

    // at cap: the expired "old" is reclaimed first — no live counter is touched
    expect(limited("x3")).toBe(false);
    // x1's own window still counts: 2nd hit over the 1/min limit
    expect(limited("x1")).toBe(true);
  });

  it("crossing the cap does not reset other clients' active counters", () => {
    const limited = makeRateLimiter({ limitPerMinute: 2, maxTrackedIps: 5 });
    for (const ip of ["a", "b", "c", "d"]) limited(ip);
    expect(limited("victim")).toBe(false);
    expect(limited("victim")).toBe(false); // at the limit now

    limited("flood-1"); // cap reached: one oldest entry is evicted, never the map

    expect(limited("victim")).toBe(true); // counter survived: not reset, not wiped
    expect(limited("e2")).toBe(false); // eviction made room for a fresh key
  });

  it("eviction is bounded: entries outlive map-cap crossings instead of a wiped map", () => {
    const limited = makeRateLimiter({ limitPerMinute: 2, maxTrackedIps: 5 });
    for (const ip of ["a", "b", "c", "d", "e"]) limited(ip);
    expect(limited("b")).toBe(false); // second hit, active

    limited("f"); // evicts only the oldest ("a")
    expect(limited("b")).toBe(true); // b keeps its counter: 3rd hit over the limit

    limited("g"); // evicts the next-oldest ("b") one at a time — never a wholesale wipe
    expect(limited("e")).toBe(false); // e, newer than b, is still tracked
  });
});

afterEach(() => {
  vi.useRealTimers();
});
