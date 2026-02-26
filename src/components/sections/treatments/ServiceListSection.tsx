import type { Service } from "@/types/brand";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock } from "lucide-react";

interface ServiceListSectionProps {
  services: Service[];
}

export function ServiceListSection({ services }: ServiceListSectionProps) {
  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Available Treatments
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Choose a treatment and book your appointment today
          </p>
        </div>

        {/* Service cards */}
        <div className="space-y-6">
          {services.map((service) => (
            <Card
              key={service.name}
              className="overflow-hidden border-border hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex flex-col md:flex-row">
                {/* Image */}
                <div className="md:w-48 h-48 md:h-auto bg-muted img-placeholder shrink-0 overflow-hidden">
                  {service.image ? (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${service.image})` }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                      {service.name}
                    </div>
                  )}
                </div>

                {/* Content */}
                <CardContent className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-heading text-lg font-semibold">
                        {service.name}
                      </h3>
                      {service.popular && (
                        <Badge
                          variant="secondary"
                          className="bg-secondary/10 text-secondary text-xs"
                        >
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {service.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {service.duration}
                      </span>
                      <span className="font-semibold text-lg text-foreground">
                        {service.price}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0">
                    <Button
                      asChild
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    >
                      <Link href="/book">Book Now</Link>
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
