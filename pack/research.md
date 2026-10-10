# Flexiple Product Intern Take-home: GCC "Single Source of Truth"
Prepared Oct 11 2026 (IST). Due ~4:15 PM IST, Tue Oct 13 2026.
Rule I followed: every number has a source next to it. Anything marked [UNVERIFIED] still needs checking before it goes on a slide.

---
## 0. TL;DR (the call)
**Wedge: "India GCC Setup Navigator" for mid-market companies deciding whether, where and how to open their first India centre.** It sits on top of a **verified registry** where every GCC, city, policy and provider fact carries its source, date and a confidence score, and where conflicting sources are shown side by side instead of averaged away.

Why this one, for Flexiple specifically:
1. **Flexiple already sells GCC setup.** It offers Managed Teams at $299/person/month, a full entity build (4-6 months), and city-selection advice (flexiple.com/gcc). Its buyer is exactly the person using a navigator. The product becomes Flexiple's top of funnel: intent data on who is planning India, which city, and what headcount.
2. **A service-provider lead feed would sell Flexiple's own prospects to its competitors** (EOR firms, recruiters, Big 4). That's strategically backwards for wedge #1. Keep it as a later, curated partner layer.
3. **The mid-market is the growth segment.** There are 480+ mid-market GCCs, 27% of the total, and 35% of them were set up in FY23-25 (Zinnov-nasscom Mid-Market GCC Report 2025). These firms can't afford a Zinnov or Big 4 engagement and lean on referrals, which is the exact information asymmetry the brief describes.
4. **The cold start is solvable.** Policies (state PDFs), office rents (broker reports), city counts (published reports) and job/MCA signals are public. Entrants need city- and policy-level truth, which we can seed in a day. They don't need a perfect company-level database on day 1.

---
## 1. Key facts with sources

### 1.1 How many GCCs? Sources disagree (this is the core "problem" slide)
| Source | Count | As-of / scope |
|---|---|---|
| nasscom-Zinnov, India GCC Landscape Report (5-yr journey) | 1,700+ GCCs, 2,975+ centres; $64.6B revenue; 1.9M employees | FY2024 (nasscom.in/knowledge-center/publications/india-gcc-landscape-report-5-year-journey) |
| Zinnov / nasscom GCC page | 1,760+ | 2025 (zinnov.com blog "5 shifts"; nasscom.in/markets-industry/gcc) |
| FICCI-ANAROCK "Workplaces 2025" | 1,700+ GCCs, 1.9M people, $64B | end-2024; projects 2,400+ by 2030 (thehindubusinessline.com; economictimes) |
| Vestian | ~1,700 GCCs in India (~53% of ~3,200 worldwide) | Jul 2025 (yourstory.com) |
| EY (Tax podcast) | ~1,800 GCCs, 2M+ people, ~100 added per year | Mar 2026 (ey.com/en_in/media/podcasts/...) |
| ANSR (via Outlook Business) | 1,800-1,900 now; ~2,500 by 2030 | Dec 2025 (outlookbusiness.com year-ender) |
| GCCPROs (commercial DB) | claims 4,641+ verified GCCs globally, 2,533 India records | gccpros.com/data [definition likely broader] |
| The brief | "2,000+" | Flexiple brief |

**2030 projections also disagree:** nasscom 2,100-2,200; EY 2,400 (up to 2,550); ANAROCK 2,400+; ANSR ~2,500.
**Why they disagree:** different definitions (a "GCC" is a parent company, a "centre/unit" is a location: 1,700 vs ~3,000), different as-of dates, and whether mid-market, captive-BPM and hybrid/BOT models are counted. That's the insight for the deck: **the problem is definitional and temporal, not just missing data.** So the product must store the definition and date with every number.

### 1.2 Which city leads? The same city gets 29% to 36% depending on source
| City | Vestian count (Jul 2025) | Zinnov share of GCC activity/talent FY25 | ANSR count (Dec 2025) |
|---|---|---|---|
| Bengaluru | 487 (29%) | 36% (660K+ talent) | ~950 |
| Hyderabad | 273 | 21% (235K+) | ~350 |
| Delhi-NCR | 272 (~16%) | 14% (270K+) | Gurugram ~170 |
| Mumbai | 207 | 12% (235K+) | n/a |
| Pune | 178 | 12% (230K+) | ~200 |
| Chennai | 162 | 10% (210K+) | ~280 |
Sources: yourstory.com (Vestian); zinnov.com/.../what-no-one-tells-you-about-picking-the-right-gcc-location-blog; outlookbusiness.com year-ender 2025 (ANSR). ANAROCK says Bengaluru has 875+ centres, ~29% of the total (BusinessLine).
- Note: Bengaluru is **487 GCCs (Vestian) vs ~950 (ANSR) vs 875+ centres (ANAROCK)**. That's roughly a 2x spread for the same city. Use this as the headline visual.
- Top 6 cities hold 92% (Zinnov) / 94% (Vestian) of GCCs. Tier-2 share is ~7% today, could reach 15-20% (ANSR via Outlook). 28% of new FY24 GCCs went to Tier-2 (AMS data via Outlook). Zinnov's own emerging-city talent share: 2.7% FY19 to 4.2% FY25.
- Office demand: GCCs drove ~42% of India office leasing in FY25. In Bengaluru they were 65% of absorption (12.43 msf), Hyderabad 46%, Chennai 42% (ETRealty, Jul 2025).

### 1.3 State GCC policies (incentives are the hardest thing for entrants to compare)
| State | Key incentives | Source |
|---|---|---|
| Karnataka (GCC Policy 2024-29) | Outside Bengaluru: 50% rental reimbursement up to ₹2 Cr, R&D grants 40% / up to ₹50 Cr [verify cap wording], ₹3,000 EPF/employee for 2 yrs, 25% internet reimbursement for 3 yrs; skilling and innovation-lab support | global.icai.org/state-policy.html |
| Maharashtra (GCC Policy 2025) | 20% capital subsidy (Small ₹10 Cr to Mega ₹100 Cr cap) OR rental subsidy 10% (Zone I) / 20% (Zone II) capped ₹1-4 Cr; payroll up to ₹50K/employee/month for high-skill; power ₹1-2/unit; 10-yr electricity-duty exemption; target 400+ GCCs, 4 lakh jobs | Grant Thornton summary PDF; industry.maharashtra.gov.in press note; ICAI |
| Gujarat (GCC Policy, GIFT) | Capex subsidy (20% infra / 30% IT per search synthesis [verify in PDF]); OPEX support 15% up to ₹20 Cr/yr for 5 yrs (higher tier up to ₹40 Cr); interest subsidy 7% capped ₹1 Cr/yr | api.giftgujarat.in/public/GCC_Policy.pdf |
| Uttar Pradesh (GCC Policy 2024) | 25% capital subsidy (₹10 Cr Level-1 / ₹25 Cr Advanced); 20% operating subsidy incl. lease, up to ₹40/80 Cr per yr for 5 yrs; payroll reimbursement up to ₹10/20 Cr/yr for 3 yrs; 30-50% land subsidy; min FDI ₹50 Cr | invest.up.gov.in/up-gcc-policy-2024 |
| Tamil Nadu (Special GCC scheme 2024-27) | Payroll subsidy 30%/20%/10% over 3 yrs for jobs >₹1 lakh/month; "GCC One" fast-track approvals; eligibility Forbes/Fortune Global 2000, 200+ direct employees | teamleaseregtech.com; elcot.tn.gov.in/it/gccs |
| Madhya Pradesh (GCC Policy 2025) | 40% capex subsidy up to ₹15/30 Cr; rental assistance up to ₹3/10 Cr; 6% interest assistance; 100% stamp duty | ICAI |
| Telangana | No dedicated GCC fiscal policy as of 2025 (being considered); single-window approvals | thehindu.com (Telangana mulls policy) [check for 2026 update] |
| Haryana | Policy "expected soon" per EY (Mar 2026) | EY podcast [UNVERIFIED status] |
**Insight:** the #1 city (Bengaluru) and #2 (Hyderabad) offer the least direct incentive. Karnataka only pays incentives *outside* Bengaluru, and Telangana has no fiscal GCC policy. Meanwhile UP, Gujarat, MP and Maharashtra are bidding hard. Eligibility thresholds (TN needs Global 2000 + 200 staff; UP needs ₹50 Cr FDI) **exclude most mid-market entrants**. That is a non-obvious, demo-able insight ("am I even eligible?").

### 1.4 Office rent (Grade A, ₹/sq ft/month)
| City | Rent | Source |
|---|---|---|
| Mumbai (MMR) | 148 | India Office Market Annual Update 2025 (credai.app PDF) |
| Bengaluru | 102 (annual avg, +9% YoY); 96.0 Q4'25 weighted; ORR 105, CBD 162, Peripheral South 68.6 | same; Bengaluru Q4 2025 report (credai.app) |
| Pune | 87 | Annual Update 2025 |
| Chennai | 79 | Annual Update 2025 |
| Hyderabad | 70 | Annual Update 2025 |
| India avg (top 7) | 92 (+6%); vacancy 16.1% | Annual Update 2025 |
| Gurugram/NCR | [UNVERIFIED city figure]; CPRI: Gurugram +8.1% YoY Q2'25 | IIMB-CRE Matrix CPRI Q2 2025 |
Note: the publisher of the Annual Update PDF isn't confirmed (hosted on CREDAI). Confirm the publisher before citing on a slide. Different brokers (JLL/CBRE/Colliers) publish different numbers, which is another example of disagreement.

### 1.5 Talent cost and attrition
- Bengaluru SWE CTC: ~₹13L entry, ₹20L mid, ₹34L senior, ₹55L lead. Hyderabad ~10-15% cheaper, Pune ~20-30% cheaper (HRBx playbook 2026, a single vendor source, so mark medium confidence).
- Attrition: Bengaluru ~18%, Hyderabad ~15%, Pune ~14% (HRBx). Overall GCC attrition 16.9% in 2024 (voluntary 12.6%), 2025 increments avg 9.9% (Talent500 report).
- Tier-2 attrition 10-15% lower than Tier-1 (Zinnov 2026 salary report, per search summary). Chennai has the "lowest attrition of any Tier-I GCC city" (Zinnov).
- ~110 new GCCs established early 2024 to late 2025 (Zinnov). EY: ~70/yr in 2023 rising toward 115/yr. EY 2026: ~100/yr.

### 1.6 Existing players (what exists today and the gap)
| Player | What it is | Gap for a mid-market entrant |
|---|---|---|
| nasscom + Zinnov | Annual landscape reports, GCC Council | Aggregate PDFs, yearly, no company/provider level, no "for me" answer |
| Zinnov / Draup | Advisory + paid intelligence (Draup has a "GCC opportunity analysis" agent aimed at vendors selling to GCCs) | Enterprise-priced, vendor-sales oriented |
| ANAROCK, Vestian, JLL/CBRE/Colliers | Real-estate reports | Real-estate lens only, and each counts differently |
| ANSR, Inductus, Big 4, (ALMT [UNVERIFIED offering]) | Setup/BOT operators and advisors | Conflicted: they recommend what they sell; opaque pricing |
| GCC Index (gccindex.in) | Tracker of ~338 validated openings/expansions, MCA signals | News-tracker style, built for watchers/vendors |
| GCC Explorer (gccexplorer.com) | 1,600+ GCCs, 35K+ job signals | Company DB for prospecting |
| GCCPROs (gccpros.com) | Paid DB, 2,533 India records, API | Sales-lead DB |
| Tracxn / Crunchbase / LinkedIn | Generic company data | GCCs not cleanly identified |
**Gap:** everyone builds either (a) a lead database for *vendors* or (b) a PDF for *the industry*. **Nobody builds a neutral, sourced decision tool for the entrant**, which is the person who actually spends money (tens of crores) and decides who gets it.

### 1.7 Flexiple
- India offshore teams + GCC builder: Contractors, Managed Teams ($299/person/month + salary at cost, start in 72h), GCC entity build (4-6 months, EOR bridge). Claims 100M+ profiles and an AI screening funnel (~2,000 to ~400 to ~25 to 4-5). Says "past 25 people, entity economics beat managed employment" (flexiple.com/gcc).
- Already advises on city selection ("Bangalore for cross-functional depth, Hyderabad ops, Pune engineering, Chennai cost").
- **Fit:** the navigator productises the "Strategy & Planning" workstream and captures intent upstream of the sales call. Flexiple's own talent data (supply, time-to-hire, CTC by city/role) is a **proprietary layer competitors can't copy**.

---
## 2. Wedge evaluation
Scores are 1-5 (5 = best).
| Wedge | Pain severity | Flexiple fit | Monetisation | Data cold start | Defensibility | Total |
|---|---|---|---|---|---|---|
| A. Entrant Setup Navigator (mid-market) | 5: crore-level, multi-year decision | 5: feeds its core business | 4: indirect (setup/managed-team revenue, $299/head/month) + optional paid report | 4: policies/rents/city data public | 4: Flexiple talent data + intent data + verified provider outcomes | **22** |
| B. Service-provider lead feed | 3 | 1: arms competitors | 5: recurring SaaS | 2: needs fresh company-level signals | 2: GCC Index/Explorer/GCCPROs/Draup already here | 13 |
| C. State-govt benchmarking | 3 | 2 | 3: big but slow tenders | 3 | 3 | 14 |
| D. GCC talent intelligence for existing GCCs (comp/attrition benchmarks) | 4 | 4 | 4 | 2: needs Flexiple's private data | 4 | 18, a good v2 |
| E. Provider review / track-record marketplace | 4 | 3 | 3 | 1: reviews take years | 5 eventually | 16 |
Sequencing: **A now, then D (benchmarks for the GCCs A helped create), then E (verified outcomes from A's users), then B/C as monetised outputs of the data.** Each step reuses the data the previous one produced.

---
## 3. Deck outline (14 slides)
Visual style: plain, consulting-like, one idea per slide, real charts, no stock-AI gradients. Every number gets a footnote source.

1. **Title.** "One India GCC answer, with receipts." Vedant Mahajan, Product Intern take-home.
2. **The $64B decision made on referrals.** 1,700-1,800 GCCs, 1.9M people, $64.6B (nasscom FY24); ~100 new per year (EY 2026). Then the human version: "A 300-person US SaaS firm CFO has 6 weeks to pick a city and a partner."
3. **Who's in the ecosystem (map).** Entrant at the centre, around it advisors, lawyers/CAs, real estate, recruiters, EOR/payroll, states, plus information producers (nasscom/Zinnov, brokers, trackers). Arrows show each one sees a slice and sells a slice.
4. **The numbers don't agree.** Chart: GCC count by source (1,700 / 1,760 / ~1,800 / 1,800-1,900 / "2,000+") and the 2030 forecasts (2,100 to 2,500). Bengaluru: 487 vs 875+ vs ~950. Root causes: definitions (GCC vs centre), dates, scope.
5. **Who is hurt and how much.**
   - Entrants: a wrong city or partner is costly. Office rent ranges from ₹70 (Hyd) to ₹148 (MMR) per sq ft/month. Senior CTC differs ~20-30% Bengaluru vs Pune. Attrition is 14-18%.
   - Mid-market specifically: 480+ firms, 35% new in 2 yrs, no Big 4 budget.
   - Providers: high CAC, lose deals to referral networks. States: can't prove their pitch.
   - Back-of-envelope for a 100-seat centre, ~150 sq ft/seat (assumption, mark it): 15,000 sq ft × (₹102 − ₹70) × 12 ≈ ₹58 lakh/yr rent difference Bengaluru vs Hyderabad. Label it an illustrative calc.
6. **Today's workarounds.** Referrals, Big 4 decks, broker reports, nasscom PDFs, LinkedIn sleuthing. Table of each one's cost, speed and bias.
7. **The incentive maze.** State policy table (KA/MH/GJ/UP/TN/MP/TS). Hook: the top 2 cities give the least direct incentive, and TN/UP eligibility excludes most mid-market firms.
8. **Opportunities, ranked.** The wedge table from §2 with a 2x2 (pain × Flexiple fit).
9. **What we build first: GCC Setup Navigator.** Persona: VP Ops / CFO of a 200-2,000-employee US/EU company planning 20-150 seats. Job to be done: "Help me shortlist 2 cities, know which incentives I qualify for, see the 3-year cost, and know who to call, with sources."
10. **How truth works (the registry).** Every fact = value + source + date + definition + confidence. Conflicts are shown, not averaged. AI extracts facts from PDFs/news, and humans verify anything that drives a recommendation. Freshness SLA.
11. **Prototype walkthrough.** 3-4 screenshots (see §5 demo flow).
12. **Positioning: why each stakeholder switches.**
   - Entrant: neutral, sourced, free, in minutes instead of weeks.
   - Providers: qualified, consented intros instead of cold outreach; their track record becomes visible.
   - States: their policy shown accurately to the exact buyers they want, plus anonymised demand analytics.
   - Flexiple: owns the top of funnel and the data moat.
13. **Metrics, risks, what we won't build.** North star: qualified India-plans created per month (a completed plan with headcount + timeline). Inputs: plan completion rate, fact coverage/freshness, % of facts with ≥2 sources, intro acceptance rate. Business: plan → Flexiple call → Managed Team/GCC conversion. Risks and mitigations from §4.
14. **Roadmap and ask.** 0-3 mo navigator plus registry for top 8 cities/10 states. 3-9 mo talent benchmarks from Flexiple data, then a verified provider outcomes layer. 9-18 mo paid data products for providers/states.
Appendix: sources list, definitions, methodology for confidence score.

---
## 4. PM considerations
- **Neutrality vs Flexiple's interest (biggest risk).** If the navigator always says "use Flexiple," it loses trust. Mitigation: transparent ranking logic, list alternatives (Big 4, ANSR, Inductus, DIY), and mark Flexiple as "our service." Earn trust first and monetise via the plan, not by biasing it.
- **Data quality.** Each fact has a source URL, publish date, definition, extraction method (AI/human) and confidence (High: official policy/primary report; Medium: single reputable secondary; Low: single vendor blog). Conflicts get stored as separate facts. Staleness flag after 180 days for rents and 365 for counts. Policy facts need a human sign-off.
- **AI guardrails.** The AI answers only from the registry (RAG) with citations. If a fact isn't in the registry, it says "unknown." No AI-generated numbers.
- **Legal.** Respect report copyrights: cite and quote small facts and link out, don't republish PDFs. Provider claims need evidence. No PII scraping.
- **GTM.** SEO pages ("GCC incentives in Gujarat vs UP 2026"), shareable PDF plan reports, LinkedIn content around "the numbers don't agree," and Flexiple's existing inbound/sales team.
- **Moat.** (1) Verified, versioned, conflict-aware registry. (2) Flexiple's proprietary talent supply/CTC/time-to-hire data. (3) Intent data from plans. (4) Verified provider outcomes over time.
- **Won't build (v1):** a provider lead marketplace, state dashboards, a global (non-India) scope, a full company-level DB of every GCC, or price quotes for legal/real estate.
- **Open questions for interview:** what Flexiple sales sees as the #1 objection; does Flexiple have shareable anonymised CTC data.

---
## 5. Prototype spec (hand to coding agent; ~1 day)
**Name:** GCC Compass. Neutral palette, dense tables, small serif headings. Avoid purple gradients/emoji/hero blobs.

### Stack
Next.js (App Router) + TypeScript + Tailwind + shadcn/ui; data as JSON/SQLite (better-sqlite3) seeded from files; Recharts for charts; LLM via one API key (OpenAI/Anthropic/xAI compatible) for (a) the plan Q&A and (b) PDF fact extraction. Deploy on Vercel.

### Data model
- `sources(id, title, publisher, url, published_date, type[official_policy|industry_report|broker_report|news|vendor_blog], reliability[H|M|L])`
- `facts(id, entity_type[country|city|state|provider], entity_id, metric, value_num, value_text, unit, as_of, definition_note, source_id, confidence[H|M|L], verified_by_human bool, extracted_by[ai|human])`. Multiple facts per metric allowed, which is how conflicts are represented.
- `cities(id, name, state_id, tier)`
- `states(id, name)`
- `policies(id, state_id, name, year, summary, eligibility_json, incentives_json[{type:capex|rental|payroll|opex|interest|other, pct, cap_inr_cr, duration_yrs, conditions}], source_id)`
- `providers(id, name, category[setup_bot|eor|recruiting|legal_tax|real_estate|advisory], cities[], notes, source_id, is_flexiple bool)`. Seed ~12 from public websites, with descriptive text only and no ratings.
- `plans(id, inputs_json, created_at)`

### Seed data
Use ONLY the figures in §1 of this file, with their URLs: counts by source, city counts/shares (Vestian, Zinnov, ANSR), rents (§1.4), CTC/attrition (§1.5), and the 7 state policies (§1.3). Where a value is [UNVERIFIED], include it with confidence=L and a visible badge. Cities: Bengaluru, Hyderabad, Pune, Chennai, NCR (Gurugram/Noida), Mumbai, Ahmedabad/GIFT, Coimbatore, Indore, Lucknow/Noida (UP).

### Features (must-have)
1. **"Truth table" page.** Pick a metric (e.g. GCC count India, GCCs in Bengaluru). It shows every source's value as a bar chart plus a table (source, date, definition, confidence) and a one-line AI-written "why they differ" note grounded in the definition notes.
2. **Setup Navigator wizard.** Inputs: HQ country, company size, Global 2000 (y/n), planned seats yr1/yr3, functions (eng/ops/finance/analytics), budget priority (cost vs talent depth vs incentives), open to Tier-2 (y/n). Output:
   - City ranking with a transparent score breakdown: talent depth (Zinnov talent), cost (rent × seats × 150 sq ft + CTC × seats), attrition, incentives eligible. Show sliders for weights.
   - **Incentive eligibility checker:** a rules engine over `eligibility_json` with the result eligible / not eligible / needs check, plus the reason (e.g. "TN scheme requires Global 2000 + 200 employees").
   - 3-year cost estimate per top-3 city. Show the formula and assumptions, and label it an estimate.
   - Suggested provider categories plus listed providers (Flexiple shown as "our service," alongside alternatives).
3. **Ask the registry (AI chat).** RAG over facts+policies. Every answer cites fact IDs/sources as chips. If something isn't in the data it says so. Example: "Which state would pay part of my office rent for a 60-seat centre in a Tier-2 city?"
4. **Add a source (AI extraction demo).** Paste a URL/text from a policy PDF and the LLM proposes structured facts (metric, value, unit, as_of, definition). A human clicks approve/reject, and approved facts appear with extracted_by=ai, verified=true. This shows the "single source of truth" pipeline.
5. **Export plan** as a shareable page/PDF with all citations, plus a CTA "Talk to someone who has built 20-person GCCs" (lead capture: name, email).

Nice-to-have (skip if short on time): India map choropleth; staleness badges; compare 2 cities side by side.

### AI prompts (principles)
- System: "Answer only using the provided facts. Cite fact ids. If facts conflict, present all with sources and explain likely definitional/date reasons. Never produce a number not in the facts."
- Extraction: return strict JSON per schema, with null if unsure.

### Demo flow (3 min)
1. Truth table: "How many GCCs in India?" shows 5 answers from 1,700 to 2,000+, and "Bengaluru: 487 vs ~950."
2. Navigator: a 400-person US fintech, not Global 2000, 40 seats to 120, eng + ops, cost-sensitive. Result: Pune/Hyderabad/Chennai ranked. TN payroll scheme flagged "not eligible: Global 2000 required." Karnataka rental reimbursement only outside Bengaluru. ~₹ estimate shown.
3. Ask: "What would Maharashtra pay me?" gives a cited answer.
4. Add source: paste the Telangana news snippet, AI proposes "no GCC fiscal policy (2025)", approve it.
5. Export plan, then CTA.

### Time budget (~1 day)
Seed JSON 2h · Truth table 1.5h · Navigator + rules + scoring 3h · RAG chat 1.5h · Extraction 1h · Polish/deploy 1h.
