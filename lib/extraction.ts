import type { ExtractedFactT } from "./types";

/**
 * The rules that decide which extracted rows a reviewer actually sees.
 *
 * A model answering the extract prompt tends to produce two kinds of noise:
 * the same entity+metric twice with slightly different wording, and a
 * qualitative value that is just a slice of the quote it was pulled from
 * ("being considered" out of "State officials said a GCC policy is being
 * considered"). Both make the review screen harder to read and easier to
 * approve something wrong, so both are filtered here, in one place, before the
 * rows reach the UI.
 */

/** Normalised for comparison, not for display. */
function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * A qualitative value has to read as an answer, not as an excerpt.
 *
 * It must be a phrase of several words, and it must not be a verbatim substring
 * of the fact's own quote: the quote is already shown to the reviewer, so a value
 * that is just part of it adds nothing and usually means the model copied rather
 * than summarised. Numeric values (published ranges like "1,800-1,900") are
 * excluded from this rule — those legitimately appear inside their quote.
 */
export function isUsableQualitativeValue(valueText: string, quote: string): boolean {
  const value = valueText.replace(/\s+/g, " ").trim();
  // a published figure or range is already the value, and it does appear inside
  // its own quote — that is correct, not a copy
  if (/^[\d,.%₹\-\s]+$/.test(value)) return true;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;
  return !norm(quote).includes(norm(value));
}

/** A fact the reviewer can act on: a quote, and a value worth a decision. */
export function isReviewableFact(f: ExtractedFactT): boolean {
  if (!f.quote || !f.quote.trim()) return false;
  if (!f.metric) return false;
  if (f.value_num !== null && f.value_num !== undefined) return true;
  if (!f.value_text) return false;
  return isUsableQualitativeValue(f.value_text, f.quote);
}

/**
 * Which of two rows for the same entity+metric is the more complete value.
 *
 * A measurable value beats prose: "30 lakh" is chartable and "about thirty lakh per
 * year" is not, and the one that survives the review is the one the registry can
 * use. After that, the longer value wins, then the row carrying more context
 * (definition, as-of date, unit, entity name).
 */
function preferRow<T extends ExtractedFactT>(challenger: T, held: T): T {
  const hasNum = (f: T) => (f.value_num !== null && f.value_num !== undefined ? 1 : 0);
  if (hasNum(challenger) !== hasNum(held)) return hasNum(challenger) ? challenger : held;
  const len = (f: T) => (f.value_text?.trim().length ?? 0);
  if (len(challenger) !== len(held)) return len(challenger) > len(held) ? challenger : held;
  const context = (f: T) =>
    [f.definition_note, f.as_of, f.unit, f.entity_name].filter(Boolean).length;
  return context(challenger) > context(held) ? challenger : held;
}

/**
 * One row per entity+metric, keeping the most complete value.
 *
 * The same fact often comes back twice — once as the policy status, once as the
 * approval process, or twice as the status phrased differently — and a reviewer
 * should decide on it once.
 */
export function dedupeExtractedFacts<T extends ExtractedFactT>(facts: T[]): T[] {
  const byKey = new Map<string, T>();
  const order: string[] = [];
  for (const f of facts) {
    const key = `${f.entity_id ?? f.entity_name ?? "?"}|${f.metric}`;
    const held = byKey.get(key);
    if (!held) {
      byKey.set(key, f);
      order.push(key);
      continue;
    }
    byKey.set(key, preferRow(f, held));
  }
  return order.map((k) => byKey.get(k) as T);
}

/**
 * The full filter, in order: drop unusable rows, then collapse duplicates.
 * Returns the rows to show plus how many of each were removed, so the UI can say
 * what it did rather than silently shrinking the list.
 */
export function shapeExtractedFacts<T extends ExtractedFactT>(facts: T[]): {
  facts: T[];
  droppedUnusable: number;
  deduped: number;
} {
  const reviewable = facts.filter(isReviewableFact);
  const droppedUnusable = facts.length - reviewable.length;
  const kept = dedupeExtractedFacts(reviewable);
  return { facts: kept, droppedUnusable, deduped: reviewable.length - kept.length };
}
