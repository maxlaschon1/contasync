import { brandConfig } from "@/config/brand.config";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Heart, Users, Lightbulb } from "lucide-react";

const valueIcons = [Award, Heart, Users, Lightbulb];

export function ValuesSection() {
  const values = brandConfig.content.aboutPage?.values;

  if (!values || values.length === 0) return null;

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Our Values
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => {
            const Icon = valueIcons[index % valueIcons.length];
            return (
              <Card key={value.title} className="text-center border-border">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                    <Icon className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
