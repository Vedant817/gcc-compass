"use client";

import { useEffect, useRef, useState } from "react";
import { CitationChip } from "@/components/CitationChip";
import { Button } from "@/components/ui/button";
import { SiteLinkFlag } from "@/components/ui/badge";
import { readOverlay, readStoredPlan } from "@/lib/overlay";
import { renderInline } from "@/lib/markdown";
import type { NavigatorInputs } from "@/lib/types";

interface Citation {
  id: string;
  kind: "fact" | "policy";
  title: string;
  publisher: string | null;
  url: string | null;
  url_precision: string | null;
  as_of: string | null;
  value: string | null;
  confidence: string | null;
  unverified: boolean;
  sourced: boolean;
}

interface Message {
  role: "user" | "assistant";
  text?: string;
  citations?: Citation[];
  not_in_registry?: boolean;
  missing?: string | null;
  guardrail?: boolean;
  error?: string;
  loading?: boolean;
}

const SUGGESTIONS = [
  "What would Maharashtra pay me?",
  "Which state would pay part of my office rent for a 60-seat centre in a Tier-2 city?",
  "Why do GCC counts for Bengaluru differ?",
  "What is the attrition in Chennai?",
];

export function ChatThread() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<NavigatorInputs | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPlan(readStoredPlan()?.inputs ?? null);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ask = async (q: string, opts: { replace?: number } = {}) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    if (opts.replace !== undefined) {
      // A retry replaces the question and the failed reply already on screen.
      // Appending instead left one Busy message per attempt stacked down the
      // thread, so three retries read as three separate failures.
      setMessages((m) => [...m.slice(0, opts.replace), { role: "user", text }]);
    } else {
      setMessages((m) => [...m, { role: "user", text }]);
    }
    setMessages((m) => [...m, { role: "assistant", loading: true }]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          plan: plan ?? undefined,
          overlay: readOverlay(),
        }),
      });
      const data = await res.json();
      const msg: Message = res.ok
        ? {
            role: "assistant",
            text: data.aiOff
              ? "AI is off in this deployment."
              : data.answer,
            citations: data.citations ?? [],
            not_in_registry: data.not_in_registry,
            missing: data.missing,
            guardrail: data.guardrail,
          }
        : { role: "assistant", error: data.error ?? "The question failed. Try again." };
      setMessages((m) => [...m.slice(0, -1), msg]);
    } catch {
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: "assistant", error: "The question failed. Try again." },
      ]);
    } finally {
      setBusy(false);
      setQuestion("");
    }
  };

  /** Retry the last exchange in place, dropping the question and reply it replaces. */
  const retryLast = () => {
    let at = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        at = i;
        break;
      }
    }
    if (at >= 0) ask(messages[at].text ?? "", { replace: at });
  };

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="border border-rule rounded bg-white p-4">
          <p className="text-sm text-muted mb-3">
            Ask in plain English. Answers come only from the registry, cite the fact or policy ids
            they use, and say so when the data doesn&apos;t cover the question.
          </p>
          <ul className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  className="text-sm text-slate border border-rule rounded bg-white px-2.5 py-1 hover:border-slate-light"
                  onClick={() => {
                    // Fill the box rather than sending. The reader may want to
                    // edit or drop the suggestion, and on a scarce key an answer
                    // should not be spent on a click they didn't mean as final.
                    setQuestion(s);
                    inputRef.current?.focus();
                  }}
                  disabled={busy}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i}>
            {m.role === "user" ? (
              <p className="text-sm text-ink bg-white border border-rule rounded px-3 py-2">{m.text}</p>
            ) : m.loading ? (
              <p className="text-sm text-muted">Checking the registry…</p>
            ) : m.error ? (
              <div className="text-sm border border-rule rounded bg-white px-3 py-2">
                <p className="text-status-noteligible">{m.error}</p>
                <button className="text-slate underline text-sm mt-1" onClick={retryLast}>
                  Retry
                </button>
              </div>
            ) : (
              <div className="border border-rule rounded bg-white px-3 py-2">
                <AnswerBody text={m.text ?? ""} />
                {m.not_in_registry && (
                  <p className="mt-2 text-sm border border-rule bg-paper text-muted rounded px-2 py-1.5">
                    This isn&apos;t in the registry yet
                    {m.missing ? `: ${m.missing}.` : "."}{" "}
                    <a href="/add-source" className="text-slate underline">
                      Add a source
                    </a>
                    .
                  </p>
                )}
                {m.citations && m.citations.length > 0 && (
                  <CitationFooter citations={m.citations} />
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <div className="flex-1">
          <label htmlFor="ask-input" className="sr-only">
            Question
          </label>
          <input
            id="ask-input"
            ref={inputRef}
            className="h-9"
            placeholder="Ask the registry…"
            value={question}
            maxLength={500}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={busy}
          />
        </div>
        <Button type="submit" disabled={busy || question.trim().length < 2}>
          Ask
        </Button>
      </form>
      {plan && (
        <p className="text-xs text-muted">
          Your saved plan ({plan.seats_y1} → {plan.seats_y3} seats, {plan.hq_country} HQ) is passed as
          context.
        </p>
      )}
    </div>
  );
}

/** Paragraphs, bullets and [id] citation chips. */
function AnswerBody({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="text-sm space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        const isList = lines.length > 0 && lines.every((l) => /^\s*[-*]\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className="list-disc ml-5 space-y-1">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block)}</p>;
      })}
    </div>
  );
}

function CitationFooter({ citations }: { citations: Citation[] }) {
  return (
    <div className="mt-2 border-t border-rule pt-2">
      <p className="text-xs text-muted mb-1">
        Answered from {citations.length} sourced claim{citations.length === 1 ? "" : "s"}.
      </p>
      <ul className="flex flex-col gap-1">
        {citations.map((c) => (
          <li key={c.id} className="text-xs text-muted flex flex-wrap items-center gap-2">
            <CitationChip id={c.id} />
            <span>
              {c.title}
              {c.publisher ? ` — ${c.publisher}` : ""}
              {c.as_of ? `, ${c.as_of}` : ""}
              {c.value ? `: ${c.value}` : ""}
            </span>
            {c.url && (
              <a href={c.url} target="_blank" rel="noreferrer" className="text-slate underline">
                source
              </a>
            )}
            {c.url_precision === "domain_only" && <SiteLinkFlag />}
          </li>
        ))}
      </ul>
    </div>
  );
}

