/** Markdown-lite: citation chips [f402] / [pol_x] and **bold**. */
import { CitationChip } from "@/components/CitationChip";

export function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\[(?:f\d[\w]*|pol_[\w]+)\])/g);
  return parts.map((part, i) => {
    const m = /^\[((?:f\d[\w]*|pol_[\w]+))\]$/.exec(part);
    if (m) return <CitationChip key={i} id={m[1]} />;
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
