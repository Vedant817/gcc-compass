import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl">
      <h1>This page doesn&apos;t exist</h1>
      <p className="text-sm text-muted mt-2">
        The link may be wrong or truncated. A plan link is long by design — it carries the inputs,
        the weights and every citation in the URL itself.
      </p>
      <div className="flex items-center gap-4 mt-4 text-sm">
        <Link href="/truth" className="text-slate underline">
          Truth table
        </Link>
        <Link href="/navigator" className="text-slate underline">
          Setup Navigator
        </Link>
        <Link href="/ask" className="text-slate underline">
          Ask the registry
        </Link>
      </div>
    </div>
  );
}
