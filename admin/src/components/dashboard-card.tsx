type DashboardCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function DashboardCard({ label, value, detail }: DashboardCardProps) {
  return (
    <article className="panel">
      <p className="eyebrow">{label}</p>
      <h3>{value}</h3>
      <p className="muted">{detail}</p>
    </article>
  );
}
