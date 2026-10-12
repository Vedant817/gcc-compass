/**
 * The entity ids the extraction prompt and the review UI are allowed to map
 * to (from 05), derived from the seed so the list can never drift from it.
 */
import { seedRegistry } from "@/lib/registry";

export const ALLOWED_ENTITY_IDS = new Set<string>([
  "IN",
  ...seedRegistry.states.map((s) => s.id),
  ...seedRegistry.cities.map((c) => c.id),
]);

/** The demo snippet from 05, labelled as paraphrased sample text in the UI. */
export const TELANGANA_SAMPLE = {
  meta: {
    title: "Telangana mulls GCC policy",
    publisher: "The Hindu",
    url: "https://www.thehindu.com/",
    published_date: "2025",
    type: "news" as const,
  },
  text: "Telangana, home to Hyderabad's fast-growing GCC cluster, does not yet have a dedicated policy offering fiscal incentives to global capability centres. State officials said a GCC policy is being considered. For now, companies setting up in the state rely on the existing single-window approval system rather than GCC-specific subsidies.",
};
