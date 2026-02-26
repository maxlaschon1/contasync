import { brandConfig } from "@/config/brand.config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";

export function ServicesPreview() {
  const categories = brandConfig.content.services;

  // Get the first "popular" service from each category, or just the first service
  const featuredServices = categories.slice(0, 3).map((cat) => ({
    category: cat.name,
    slug: cat.slug,
    service: cat.services.find((s) => s.popular) || cat.services[0],
    image: cat.image,
  }));

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Our Services
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Explore our range of premium beauty treatments
          </p>
        </div>

        {/* Service cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredServices.map(({ category, slug, service, image }) => (
            <Card
              key={slug}
              className="group overflow-hidden border-border hover:shadow-lg transition-shadow duration-300"
            >
              {/* Image */}
              <div className="h-48 bg-muted img-placeholder overflow-hidden">
                {(service.image || image) ? (
                  <div
                    className="h-full w-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url(${service.image || image})` }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                    {category}
                  </div>
                )}
              </div>

              <CardHeader>
                <p className="text-xs uppercase tracking-widest text-secondary font-medium">
                  {category}
                </p>
                <CardTitle className="font-heading text-xl">
                  {service.name}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {service.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {service.duration}
                    </span>
                    <span className="font-semibold text-foreground">
                      {service.price}
                    </span>
                    {service.popular && (
                      <Badge variant="secondary" className="bg-secondary/10 text-secondary text-xs">
                        Popular
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View all link */}
        <div className="mt-12 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/treatments" className="gap-2">
              View All Treatments
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
