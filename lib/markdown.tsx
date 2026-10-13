/** Markdown-lite: citation chips [f402] / [pol_x] / [f402, pol_x] and **bold**. */
import { CitationChip } from "@/components/CitationChip";

/** One registry id, as the model is asked to cite them. */
const ID = "(?:f\\d[\\w]*|pol_[\\w]+)";

/**
 * A citation is either one id or a comma-separated list of them. The list form is
 * the reason a naive single-id matcher leaked "[f001, f008]" into the page as
 * literal text: models write it naturally, and the UI has to read it as chips.
 *
 * The outer group is capturing on purpose: String.split only returns the matched
 * text when the pattern has at least one capture group, so without it every
 * citation would be dropped from the sentence instead of being chipped.
 */
const CITED = new RegExp(`(\\[(?:${ID})(?:\\s*,\\s*(?:${ID}))*\\])`, "g");

const SINGLE = new RegExp(`^\\[(${ID})\\]$`);

export function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(CITED);
  return parts.map((part, i) => {
    const m = SINGLE.exec(part);
    if (m) return <CitationChip key={i} id={m[1]} />;
    // a list of ids: every id in it becomes its own chip, in order
    const ids = part.match(new RegExp(ID, "g"));
    if (ids && part.startsWith("[") && part.endsWith("]")) {
      return (
        <span key={i} className="inline-flex flex-wrap items-center gap-1 align-baseline">
          {ids.map((id, j) => (
            <CitationChip key={`${i}-${j}`} id={id} />
          ))}
        </span>
      );
    }
    return <span key={i}>{bold(part, i)}</span>;
  });
}

function bold(text: string, keyBase: number): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(part);
    if (m) return (
      <strong key={`${keyBase}-${i}`} className="font-medium">
        {m[1]}
      </strong>
    );
    return <span key={`${keyBase}-${i}`}>{part}</span>;
  });
}
