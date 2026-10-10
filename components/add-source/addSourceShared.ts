/** Entities the extraction prompt is allowed to map to (from 05). */
export const ALLOWED_ENTITY_IDS = new Set<string>([
  "IN",
  "KA",
  "MH",
  "GJ",
  "UP",
  "TN",
  "MP",
  "TS",
  "HR",
  "bengaluru",
  "hyderabad",
  "pune",
  "chennai",
  "mumbai",
  "ncr_gurugram",
  "ncr_noida",
  "ahmedabad_gift",
  "coimbatore",
  "indore",
  "lucknow",
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
