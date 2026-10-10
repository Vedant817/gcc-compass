/** en-IN number formatting, per the design guide. */

const inrFmt0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inrFmt1 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export function inr(n: number, decimals = 0): string {
  return `₹${(decimals ? inrFmt1 : inrFmt0).format(n)}`;
}

export function inrNum(n: number, decimals = 0): string {
  return (decimals ? inrFmt1 : inrFmt0).format(n);
}

/** ₹62.6 L for below a crore, ₹1,444.1 L stays lakh, ₹44.7 Cr above. */
export function lakhCr(lakh: number): string {
  if (Math.abs(lakh) >= 100) return `₹${inrFmt1.format(Math.round(lakh / 10) / 10)} Cr`;
  return `₹${inrFmt1.format(lakh)} L`;
}

export function lakhFull(lakh: number): string {
  return `₹${inrFmt0.format(lakh * 100000)}`;
}

export function pct(x: number, digits = 0): string {
  return `${x.toFixed(digits)}%`;
}

export function score(x: number | null): string {
  return x === null ? "—" : x.toFixed(1);
}

/** Fact display value: published text if present, else the number + unit. */
export function factValue(f: { value_num: number | null; value_text: string | null; unit: string | null }): string {
  if (f.value_text) return f.value_text;
  if (f.value_num === null) return "—";
  const n = Number.isInteger(f.value_num) ? inrNum(f.value_num) : inrFmt1.format(f.value_num);
  return f.unit ? `${n} ${f.unit}` : n;
}
