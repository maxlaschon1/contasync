import { brandConfig } from "@/config/brand.config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function PromotionSection() {
  const promotions = brandConfig.content.promotions;

  if (!promotions.length) return null;

  const promo = promotions[0]; // Primary promotion

  return (
    <section className="py-0">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Text side */}
        <div className="bg-primary text-primary-foreground flex items-center px-8 py-16 lg:px-16 lg:py-24">
          <div className="max-w-md">
            {promo.badge && (
              <Badge
                variant="secondary"
                className="mb-4 bg-secondary text-secondary-foreground"
              >
                {promo.badge}
              </Badge>
            )}
            <p className="text-sm uppercase tracking-widest opacity-70 mb-3">
              {promo.title}
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold leading-tight">
              {promo.subtitle}
            </h2>
            <p className="mt-4 text-sm leading-relaxed opacity-80">
              {promo.description}
            </p>
            <Button
              asChild
              className="mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Link href={promo.ctaLink}>{promo.ctaText}</Link>
            </Button>
          </div>
        </div>

        {/* Image side */}
        <div
          className="h-[400px] lg:h-auto bg-cover bg-center img-placeholder"
          style={{ backgroundImage: `url(${promo.image})` }}
        >
          <span className="sr-only">{promo.subtitle}</span>
        </div>
      </div>
    </section>
  );
}
