import { Card } from "./Card";

const NUMBER = new Intl.NumberFormat("ar-SY");

/** One admin statistic: a label, a big number and an optional hint. */
export function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="text-3xl font-bold leading-tight text-text">{NUMBER.format(value)}</span>
      {hint && <span className="text-xs leading-5 text-muted">{hint}</span>}
    </Card>
  );
}
