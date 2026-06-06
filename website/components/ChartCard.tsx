export default function ChartCard({
  index,
  title,
  description,
  children,
}: {
  index: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5">
        <p className="section-title mb-1.5">Figure {index}</p>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
