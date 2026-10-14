> **Historical brief, not a description of this app.** This file is the original client brief, kept as a record of what was asked for. It is not a description of what GCC Compass does today.
>
> Three specified items were deliberately not built: the demo persona, the built-in Telangana sample article, and the cached-extraction fallback. `DEVIATIONS.md` at the repo root records why.
>
> Where a path named here differs from the repo, the repo wins. Read the code and `DEVIATIONS.md`, not this file.

---

# 03 Data model

Full DDL: `schema.sql`. Seed files in `seed/` map 1:1 to tables (JSON arrays; JSON columns are nested objects in the files).

## Entities and relations
```
states 1─* cities
states 1─* policies
sources 1─* facts, policies, states, providers
facts *─1 entity  (entity_type + entity_id → country 'IN' | city | state | provider)
plans 1─* leads
```

## Key rules
- **Conflicts = multiple rows.** Same `entity_id` + `metric` from different sources are separate facts. Never merge, never average, never pick a "winner" in storage.
- **Definition matters:** `gcc_count` (parent companies) and `gcc_centre_count` (locations) are different metrics on purpose; `gcc_count_records` (GCCPROs) is a third. The Truth table can show them together, but always labelled.
- **Ranges:** `value_num` holds the midpoint for charting only; `value_text` holds the published range and is what the UI displays.
- **Qualitative facts:** `value_num` null, `value_text` set (e.g. Chennai attrition note).
- **[UNVERIFIED]:** `unverified=true`, `confidence='L'`, UI badge. Validator enforces this.
- **Domain-only URLs:** `sources.url_precision='domain_only'` means research only recorded the site, not the exact page. UI shows a small "site-level link" flag. Upgrading these to exact URLs is a nice pre-submission task (don't invent paths).
- **Staleness (nice-to-have):** rent facts stale after 180 days from `as_of`, counts after 365; show a "may be stale" badge.
- **AI-extracted facts:** `extracted_by='ai'`, `verified_by_human=true` only after the Approve click, `quote` required.

## Metric dictionary (seeded)
| metric | entity | unit | notes |
|---|---|---|---|
| gcc_count | IN, city | GCCs | parent companies (city: GCCs present in city) |
| gcc_centre_count | IN, city | centres | locations |
| gcc_count_records | IN | records | commercial DB records |
| gcc_count_2030_projection | IN | GCCs | forecasts |
| gcc_revenue | IN | USD bn | |
| gcc_employees | IN | million | |
| new_gccs_per_year, new_gccs_window | IN | GCCs | |
| midmarket_gcc_count, midmarket_share_pct, new_gccs_midmarket_pct | IN | | |
| gcc_talent_share_pct | city | % | Zinnov FY25; value_text = talent pool |
| office_rent_grade_a | IN, city | ₹/sq ft/month | scoring uses source `src_office_annual_2025` only (same methodology across cities) |
| office_rent_yoy_pct | city | % | |
| swe_ctc_entry/mid/senior/lead | bengaluru | ₹ lakh/yr | |
| swe_ctc_discount_vs_blr_pct | hyderabad, pune | % | midpoint of published range |
| attrition_pct | city, IN | % | |
| attrition_note, tier2_attrition_gap | city, IN | text | |
| salary_increment_pct | IN | %/yr | used in 3-yr cost |
| gcc_share_office_leasing_pct, gcc_share_office_absorption_pct, top6_city_share_pct, tier2_share_pct | | % | |
| gcc_policy_status | state | text | HR seeded; TS added by the demo extraction |
| managed_team_fee | provider | USD/person/month | Flexiple |

## Policy JSON shapes
```json
"eligibility_json": {
  "all": [ { "field": "global2000", "op": "==", "value": true, "fail_reason": "TN scheme requires a Forbes/Fortune Global 2000 company." } ],
  "needs_check": [ "Eligibility thresholds are not in the registry." ]
}
"incentives_json": [ { "type": "payroll", "pct": 30, "cap_inr_cr": null, "duration_yrs": 3, "conditions": "30% / 20% / 10% over 3 years for jobs above ₹1 lakh/month" } ]
```
Allowed `field`s (navigator inputs): `hq_country, company_size, global2000, seats_y1, seats_y3, functions, open_to_tier2, investment_inr_cr, city_id`. Ops: `== != >= <= in not_in`.
`cap_inr_cr` holds the highest published cap when a range is given; `conditions` keeps the full wording.

## Counts in the seed
28 sources, 70 facts, 11 cities, 8 states, 6 policies, 12 providers. Run `python3 scripts/validate_seed.py`.
