import { brandConfig } from "@/config/brand.config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function TreatmentCategoriesGrid() {
  const categories = brandConfig.content.services;

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Treatment Categories
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Browse our full range of beauty and aesthetic services
          </p>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/treatments/${cat.slug}`}
              className="block"
            >
              <Card className="group overflow-hidden border-border hover:shadow-lg transition-shadow duration-300 h-full">
                {/* Image */}
                <div className="h-56 bg-muted img-placeholder overflow-hidden">
                  {cat.image ? (
                    <div
                      className="h-full w-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundImage: `url(${cat.image})` }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                      {cat.name}
                    </div>
                  )}
                </div>

                <CardHeader>
                  <CardTitle className="font-heading text-xl">
                    {cat.name}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {cat.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="bg-secondary/10 text-secondary text-xs"
                    >
                      {cat.services.length}{" "}
                      {cat.services.length === 1 ? "treatment" : "treatments"}
                    </Badge>
                    <span className="flex items-center gap-1 text-sm text-secondary font-medium group-hover:gap-2 transition-all">
                      View
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
