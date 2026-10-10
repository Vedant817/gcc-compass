"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput, Checkbox } from "@/components/ui/field";
import { appendLead } from "@/lib/overlay";

export function PlanActions({ planId }: { planId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}/plan/${planId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="no-print flex flex-wrap items-center gap-3">
      <Button variant="secondary" onClick={copy}>
        {copied ? "Link copied" : "Copy link"}
      </Button>
      <Button variant="secondary" onClick={() => window.print()}>
        Download PDF
      </Button>
      <span className="text-xs text-muted">
        The link carries the inputs, the weights and every citation, so it reopens the same plan.
      </span>
    </div>
  );
}

export function LeadForm({ planId }: { planId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errors, setErrors] = useState<{ name?: string; email?: string; consent?: string }>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "Your name, so we know who we're emailing.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "A work email we can reply to.";
    if (!consent) errs.consent = "We need your consent to email you about this.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setState("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, name: name.trim(), email: email.trim(), note: note.trim(), consent: true }),
      });
      if (!res.ok) throw new Error("failed");
      appendLead({
        id: `lead_${Date.now()}`,
        plan_id: planId,
        name: name.trim(),
        email: email.trim(),
        note: note.trim(),
        consent: true,
        created_at: new Date().toISOString(),
      });
      setState("done");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="border border-rule rounded bg-white p-4 text-sm">
        Thanks. Someone from Flexiple will email you within one working day.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-rule rounded bg-white p-4 flex flex-col gap-3" noValidate>
      <h3 className="text-[18px]">Talk to someone who has built 20-person GCCs</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Name" htmlFor="lead-name" error={errors.name}>
          <TextInput id="lead-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Work email" htmlFor="lead-email" error={errors.email}>
          <TextInput id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <Field label="Note (optional)" htmlFor="lead-note">
        <TextArea
          id="lead-note"
          className="min-h-[72px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything about your timeline, functions or shortlist."
        />
      </Field>
      <div>
        <Checkbox
          label="Flexiple can email me about this plan. No newsletter, no list."
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        {errors.consent && (
          <p className="text-xs text-status-noteligible mt-1" role="alert">
            {errors.consent}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Request a call"}
        </Button>
        {state === "error" && (
          <p className="text-sm text-status-noteligible">
            That didn&apos;t go through. Try again, or email hello@flexiple.com.
          </p>
        )}
      </div>
    </form>
  );
}
