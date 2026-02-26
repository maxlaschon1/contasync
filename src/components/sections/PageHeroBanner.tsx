interface PageHeroBannerProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
}

export function PageHeroBanner({ title, subtitle, backgroundImage }: PageHeroBannerProps) {
  return (
    <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat img-placeholder"
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
      >
        <div className="absolute inset-0 bg-primary/70" />
      </div>

      {/* Content */}
      <div className="relative text-center px-4">
        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 text-lg text-white/80 max-w-lg mx-auto">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
