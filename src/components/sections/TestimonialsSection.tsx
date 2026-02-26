"use client";

import { brandConfig } from "@/config/brand.config";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export function TestimonialsSection() {
  if (!brandConfig.features.testimonials) return null;

  const testimonials = brandConfig.content.testimonials;

  return (
    <section className="py-20 bg-muted">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            What Our Clients Say
          </h2>
          <p className="mt-3 text-muted-foreground">
            Real reviews from real clients
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-card border-border">
              <CardContent className="pt-6">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < testimonial.rating
                          ? "fill-secondary text-secondary"
                          : "fill-muted text-muted"
                      }`}
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  &ldquo;{testimonial.text}&rdquo;
                </p>

                {/* Author */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="font-medium text-sm">{testimonial.name}</p>
                  {testimonial.service && (
                    <p className="text-xs text-muted-foreground">
                      {testimonial.service}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
