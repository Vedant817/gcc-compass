> **Historical brief, not a description of this app.** This file is the original client brief, kept as a record of what was asked for. It is not a description of what GCC Compass does today.
>
> Three specified items were deliberately not built: the demo persona, the built-in Telangana sample article, and the cached-extraction fallback. `DEVIATIONS.md` at the repo root records why.
>
> Where a path named here differs from the repo, the repo wins. Read the code and `DEVIATIONS.md`, not this file.

---

# 01 Context

## The assignment (Flexiple, Product Intern)
- India has **2,000+ Global Capability Centres** (the brief's figure; published sources say 1,700 to 1,900, see the seed). GCCs are offshore centres that global companies own and run for engineering, operations, finance and analytics.
- The ecosystem is **fragmented**: entrants, advisors, lawyers/CAs, real-estate firms, recruiters, EOR/payroll firms, state governments and report publishers each see one slice. Data conflicts and nobody agrees on basic numbers.
- Ask: design a **single source of truth** for this ecosystem.
- Deliverables: (1) a **deck** covering problem, opportunities, solution and first user, and positioning per stakeholder (done, separately); (2) a **working AI prototype** (this pack).
- Flexiple says: **use a lot of AI, but no unthought-through slop.** Both the thinking and the look are judged.

## Chosen wedge: GCC Setup Navigator on a verified registry
**First user:** VP Operations or CFO of a 200-2,000-person US/EU company planning its first India centre, 20-150 seats.
**Job to be done:** "Help me shortlist 2 cities, know which incentives I qualify for, see the 3-year cost, and know who to call, with sources."

**Demo persona:** 400-person US fintech, not Global 2000, 40 seats in year 1 growing to 120 by year 3, engineering + operations, cost-sensitive, not considering Tier-2.

## Why this wedge (keep this logic visible in the product)
1. **Flexiple already sells GCC setup** (Managed Teams at $299/person/month + salary at cost, entity build in 4-6 months, city-selection advice; flexiple.com/gcc). The navigator becomes its top of funnel and captures intent before the sales call.
2. **A provider lead feed would arm Flexiple's competitors**, and that space is crowded (GCC Index, GCC Explorer, GCCPROs, Draup).
3. **Mid-market is the growth segment:** 480+ mid-market GCCs, ~27% of all (Zinnov-nasscom 2025). They can't afford Big 4 engagements and rely on referrals.
4. **Cold start is solvable:** policies, rents and city counts are public; entrants need city- and policy-level truth, not a full company database.

## The core insight the app must demonstrate
The numbers conflict mostly because of **definitions and dates**, not missing data. nasscom-Zinnov report 1,700+ GCCs (companies) but 2,975+ centres (locations). Bengaluru is 487 (Vestian), 875+ centres (ANAROCK), ~950 (ANSR). So every fact stores its definition and date, and conflicts are displayed side by side.

Second insight (demo-able): the top two cities give the least direct incentive. Karnataka pays only outside Bengaluru, Telangana has no fiscal GCC policy, and TN/UP eligibility rules exclude most mid-market firms.

## Neutrality rule
Flexiple appears as **"Our service"** next to alternatives (ANSR, Big 4, DIY). The ranking never favours Flexiple; the formula is visible. Trust first, monetise via the plan and the call.
