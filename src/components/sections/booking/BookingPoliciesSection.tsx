import { brandConfig } from "@/config/brand.config";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Phone } from "lucide-react";

export function BookingPoliciesSection() {
  const booking = brandConfig.content.booking;
  if (!booking) return null;

  return (
    <section className="py-20 bg-muted">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
          Booking Policies
        </h2>

        <Accordion type="multiple" className="w-full">
          {booking.policies.map((policy, index) => (
            <AccordionItem key={index} value={`policy-${index}`}>
              <AccordionTrigger className="font-medium">
                Policy {index + 1}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {policy}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact note */}
        {booking.contactNote && (
          <Card className="mt-10">
            <CardContent className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-secondary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {booking.contactNote}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
