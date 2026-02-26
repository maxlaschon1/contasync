import { brandConfig } from "@/config/brand.config";

export function TimelineSection() {
  const timeline = brandConfig.content.aboutPage?.timeline;

  if (!timeline || timeline.length === 0) return null;

  return (
    <section className="py-20 bg-muted">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Our Journey
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Center line — visible on desktop only */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />

          <div className="space-y-12">
            {timeline.map((milestone, index) => {
              const isEven = index % 2 === 0;

              return (
                <div key={milestone.year} className="relative">
                  {/* Desktop layout: alternating left/right */}
                  <div className="flex flex-col md:flex-row md:items-start">
                    {/* Left side content (desktop even items) */}
                    <div className="flex max-md:hidden md:w-1/2 md:pr-12 md:justify-end">
                      {isEven && (
                        <div className="max-w-md text-right">
                          <h3 className="font-heading text-lg font-semibold">
                            {milestone.title}
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                            {milestone.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Center badge — desktop */}
                    <div className="flex max-md:hidden absolute left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-secondary text-secondary-foreground text-sm font-bold rounded-full px-3 py-1">
                        {milestone.year}
                      </span>
                    </div>

                    {/* Right side content (desktop odd items) */}
                    <div className="flex max-md:hidden md:w-1/2 md:pl-12">
                      {!isEven && (
                        <div className="max-w-md">
                          <h3 className="font-heading text-lg font-semibold">
                            {milestone.title}
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                            {milestone.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile layout: all on right side of line */}
                  <div className="md:hidden flex items-start gap-4 pl-0">
                    {/* Badge */}
                    <div className="relative z-10 shrink-0">
                      <span className="bg-secondary text-secondary-foreground text-sm font-bold rounded-full px-3 py-1">
                        {milestone.year}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="pt-0.5">
                      <h3 className="font-heading text-lg font-semibold">
                        {milestone.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
