import { brandConfig } from "@/config/brand.config";

export function StatsSection() {
  const stats = brandConfig.content.aboutPage?.stats;

  if (!stats || stats.length === 0) return null;

  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl font-heading font-bold">{stat.value}</p>
              <p className="mt-2 text-sm uppercase tracking-widest opacity-80">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
