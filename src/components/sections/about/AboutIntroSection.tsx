import { brandConfig } from "@/config/brand.config";

export function AboutIntroSection() {
  const { about, aboutPage } = brandConfig.content;

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — text content */}
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">
              Our Story
            </h2>

            {aboutPage?.mission && (
              <p className="mt-6 text-lg text-secondary font-medium italic leading-relaxed">
                {aboutPage.mission}
              </p>
            )}

            <div className="mt-6 space-y-4">
              {about.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-muted-foreground leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {about.founderName && (
              <div className="mt-8 border-l-4 border-secondary pl-4">
                <p className="font-heading font-semibold">
                  {about.founderName}
                </p>
                {about.founderTitle && (
                  <p className="text-sm text-muted-foreground">
                    {about.founderTitle}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right — founder image */}
          <div className="relative">
            <div
              className="aspect-[3/4] rounded-lg overflow-hidden img-placeholder bg-cover bg-center bg-no-repeat"
              style={
                aboutPage?.founderImage
                  ? { backgroundImage: `url(${aboutPage.founderImage})` }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
