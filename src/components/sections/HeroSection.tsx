import { brandConfig } from "@/config/brand.config";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  const { hero } = brandConfig.content;

  return (
    <section className="relative h-[80vh] min-h-[600px] flex items-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat img-placeholder"
        style={{
          backgroundImage: `url(${hero.backgroundImage})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/20" />
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="max-w-xl">
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
            {hero.headline}
          </h1>
          <p className="mt-6 text-lg text-white/80 leading-relaxed max-w-md">
            {hero.subheadline}
          </p>
          {hero.ctaText && hero.ctaLink && (
            <Button
              asChild
              size="lg"
              className="mt-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base px-8 py-6"
            >
              <Link href={hero.ctaLink}>{hero.ctaText}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
