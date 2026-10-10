# 04 Scoring, eligibility rules and 3-year cost

Reference implementation: `scripts/reference_scoring.py`. Expected output for the demo persona: `seed/expected_demo_output.json`. Port to `lib/scoring.ts`, `lib/eligibility.ts`, `lib/cost.ts` and unit-test against the JSON (tolerance ±0.1 score, ±0.1 lakh).

## 1. Candidate cities
Tier-1 always; Tier-2 only if `open_to_tier2`. (Tier-2 cities currently have no rent/talent facts, so they appear under "Not enough data". That is correct and honest.)

## 2. Components (raw values from the seed)
| Component | Raw value | Better | Fact used |
|---|---|---|---|
| talent | Zinnov FY25 share of GCC talent, % | higher | `gcc_talent_share_pct` |
| rent | Grade A rent ₹/sq ft/month | lower | `office_rent_grade_a` from `src_office_annual_2025` only (one methodology across cities; Bengaluru Q4 96.0 is shown in Truth table but not used for scoring) |
| salary | est. mid SWE CTC ₹ lakh/yr | lower | Bengaluru `swe_ctc_mid` (20); other cities = 20 × (1 − `swe_ctc_discount_vs_blr_pct`/100); missing if no discount fact |
| attrition | % annual | lower | `attrition_pct` (city) |
| incentives | best eligibility status among the city's state policies: eligible 1.0, needs check 0.5, not eligible / no policy 0.0 | higher | `policies` + rules engine |

## 3. Normalisation
Min-max across candidate cities that have the value: `x = (v − min)/(max − min)`; for "lower is better" use `1 − x`. If all equal (or one value), x = 1. Missing value → component is `null` (not zero, not imputed).

## 4. Score
```
coverage(city) = Σ w_k for components k that are not null
score(city)    = 100 × Σ (w_k × x_k) / coverage      over non-null k
rank only if coverage ≥ 0.60; otherwise list under "Not enough data to rank" with missing components named
```
Weights are normalised to sum to 1. Presets (user can override with sliders):
| Preset | talent | rent | salary | attrition | incentives |
|---|---|---|---|---|---|
| Lowest cost | 0.20 | 0.20 | 0.35 | 0.15 | 0.10 |
| Talent depth | 0.45 | 0.10 | 0.15 | 0.20 | 0.10 |
| Incentives | 0.20 | 0.15 | 0.15 | 0.10 | 0.40 |
| Balanced | 0.25 | 0.20 | 0.25 | 0.15 | 0.15 |
Weights are a product judgment, not data. Say so in the UI ("Weights are our default; change them").

## 5. Eligibility rules engine
For each policy, evaluate `eligibility_json.all` against the inputs plus `city_id`:
1. Input value missing (e.g. `investment_inr_cr` blank) → rule result `needs_check`, reason "Need your <field> to check: <fail_reason>".
2. Rule fails → `not_eligible`, reason = `fail_reason`.
3. Combine: any not_eligible → **Not eligible** (list all failing reasons); else any needs_check or non-empty `needs_check` array → **Needs check** (list them); else **Eligible**.
TN rule `seats_y3 >= 200` uses year-3 seats as a proxy for "200+ direct employees"; show that in the reason tooltip.
States with no policy: Telangana → "No GCC fiscal policy on record (2025)"; Haryana → "Policy expected [UNVERIFIED]". Both count as 0.0 incentive.

## 6. Three-year cost estimate (label: "Estimate")
```
seats:      y1 = seats_y1, y2 = (seats_y1 + seats_y3)/2, y3 = seats_y3     (A2)
rent_y      = seats_y × 150 sq ft × rent ₹/sq ft/month × 12                 (A1, A3)
salary_y    = seats_y × CTC_city × (1 + 9.9%)^(y−1)                          (A4, A5)
total       = Σ (rent_y + salary_y)   shown in ₹ lakh and ₹ Cr
```
Assumptions (list all on screen):
- **A1** 150 sq ft per seat (planning assumption, not sourced).
- **A2** Linear ramp; year 2 is the midpoint.
- **A3** Rent flat over 3 years (Bengaluru saw +9% YoY in 2025; not applied).
- **A4** Every seat costs the mid-level SWE CTC for that city (proxy, applies to ops seats too; overstates ops cost). Source: HRBx 2026, low confidence.
- **A5** Salaries rise 9.9%/yr (Talent500 2025 average increment).
- Excludes: incentives (shown separately, not netted), fit-out, capex, setup fees, Flexiple fees, FX, taxes.
If CTC is missing → show rent rows and "Salary data missing; total not computed".

## 7. Worked example: demo persona
Inputs: US HQ, 400 employees, not Global 2000, 40 → 120 seats, eng + ops, Lowest cost preset, Tier-2 off, investment blank.

Raw values:
| City | talent % | rent | CTC ₹L | attrition % | incentive |
|---|---|---|---|---|---|
| Bengaluru | 36 | 102 | 20.0 | 18 | 0 (KA: only outside Bengaluru) |
| Hyderabad | 21 | 70 | 17.5 | 15 | 0 (TS: no policy) |
| Pune | 12 | 87 | 15.0 | 14 | 0.5 (MH: needs check) |
| Chennai | 10 | 79 | – | – | 0 (TN: not eligible) |
| Mumbai | 12 | 148 | – | – | 0.5 (MH) |
| Gurugram | 14 | – | – | – | 0 (HR) |
| Noida | – | – | – | – | 0.5 (UP: needs FDI figure) |

Normalised (min-max over cities with values; talent 10–36, rent 70–148, CTC 15–20, attrition 14–18, incentive 0–0.5):
| City | talent | rent | salary | attrition | incentive | coverage | **score** |
|---|---|---|---|---|---|---|---|
| Pune | 0.077 | 0.782 | 1.000 | 1.000 | 1.000 | 1.00 | **77.2** |
| Hyderabad | 0.423 | 1.000 | 0.500 | 0.750 | 0.000 | 1.00 | **57.2** |
| Bengaluru | 1.000 | 0.590 | 0.000 | 0.000 | 0.000 | 1.00 | **31.8** |
| Chennai | 0.000 | 0.885 | – | – | 0.000 | 0.50 | not ranked |
| Mumbai | 0.077 | 0.000 | – | – | 1.000 | 0.50 | not ranked |
| Gurugram | 0.154 | – | – | – | 0.000 | 0.30 | not ranked |
| Noida | – | – | – | – | 1.000 | 0.10 | not ranked |

Pune check: 0.20×0.077 + 0.20×0.782 + 0.35×1 + 0.15×1 + 0.10×1 = 0.772 → 77.2.

Eligibility: TN **Not eligible** ("requires Global 2000", "requires 200+ direct employees"); KA **Not eligible** for Bengaluru ("only outside Bengaluru"); MH **Needs check** (size class and zone thresholds not in registry); UP **Needs check** (₹50 Cr FDI; investment unknown); GJ, MP Needs check (shown only if Tier-2 on).

3-year cost (₹ lakh):
| City | Y1 (40) | Y2 (80) | Y3 (120) | 3-yr total |
|---|---|---|---|---|
| Pune | 62.6 rent + 600.0 sal = 662.6 | 125.3 + 1,318.8 = 1,444.1 | 187.9 + 2,174.0 = 2,362.0 | **4,468.7 (≈ ₹44.7 Cr)** |
| Hyderabad | 50.4 + 700.0 = 750.4 | 100.8 + 1,538.6 = 1,639.4 | 151.2 + 2,536.4 = 2,687.6 | **5,077.4 (≈ ₹50.8 Cr)** |
| Bengaluru | 73.4 + 800.0 = 873.4 | 146.9 + 1,758.4 = 1,905.3 | 220.3 + 2,898.7 = 3,119.0 | **5,897.7 (≈ ₹59.0 Cr)** |

Talking point: Pune ≈ ₹14 Cr cheaper than Bengaluru over 3 years on these assumptions; salary is ~93% of cost, so rent arguments alone are second-order. Chennai can't be ranked because the registry has no CTC/attrition figure, and the app says so instead of guessing.

Other presets for the same persona (unit-test these too). Cities ranked with coverage < 1.0 must carry a "Partial data" badge listing missing components:
| Preset | Ranking |
|---|---|
| Lowest cost | Pune 77.2 · Hyderabad 57.2 · Bengaluru 31.8 |
| Talent depth | Pune 56.3 · Hyderabad 51.5 · Bengaluru 50.9 · Mumbai 20.7 (partial) · Chennai 13.6 (partial) |
| Incentives | Pune 78.3 · Mumbai 55.4 (partial) · Hyderabad 38.5 · Bengaluru 28.8 · Chennai 17.7 (partial) · Gurugram 5.1 (partial) |
| Balanced | Pune 72.6 · Hyderabad 54.3 · Bengaluru 36.8 · Chennai 29.5 (partial) · Mumbai 28.2 (partial) |

Slider demo line: "Switch to Talent depth and Bengaluru jumps from 31.8 to 50.9, almost level with Hyderabad. The ranking is a choice of weights, and you can see it." 
