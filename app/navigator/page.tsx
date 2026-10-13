import { NavigatorView } from "@/components/navigator/NavigatorView";
import { getLiveLayer } from "@/lib/live";

/**
 * The navigator renders on the server so the World Bank figures are fetched
 * here, where a failure can be turned into the absence of data, instead of in
 * the reader's browser where it would be a console error and a blank panel.
 *
 * Rendered per request rather than cached as a page. The page-level `revalidate`
 * this replaces would have baked the *result* of the build-time fetch into the
 * HTML: a build that happened to run while the World Bank was down would have
 * served "Market context is unavailable" to everyone for six hours. Caching the
 * fetch instead of the page means the API is still called at most once every
 * six hours, but a failure is retried on the next request rather than pinned.
 * /truth is dynamic for the same reason - it reads searchParams.
 */
export const dynamic = "force-dynamic";

export default async function NavigatorPage() {
  const live = await getLiveLayer();
  return <NavigatorView live={live} />;
}