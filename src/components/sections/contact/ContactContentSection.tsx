"use client";

import { useState } from "react";
import { brandConfig } from "@/config/brand.config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export function ContactContentSection() {
  const { contactPage } = brandConfig.content;
  const { business } = brandConfig;
  const formFields = contactPage?.formFields ?? [];

  const initialFormData: Record<string, string> = {};
  formFields.forEach((field) => {
    initialFormData[field.name] = "";
  });

  const [formData, setFormData] = useState(initialFormData);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would call an API
    setSubmitted(true);
  };

  const fullAddress = `${business.address.street}, ${business.address.city}, ${business.address.state} ${business.address.zip}`;

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left — Contact Form (3 cols) */}
          <div className="lg:col-span-3">
            <h2 className="font-heading text-3xl md:text-4xl font-bold">
              Send Us a Message
            </h2>

            {submitted ? (
              <div className="mt-8 rounded-lg border border-secondary/30 bg-secondary/10 p-6 text-center">
                <p className="text-lg font-heading font-semibold text-secondary">
                  Message Sent!
                </p>
                <p className="mt-2 text-muted-foreground">
                  Thank you for reaching out. We will get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {formFields.map((field) => (
                  <div key={field.name}>
                    <label
                      htmlFor={field.name}
                      className="block text-sm font-medium mb-1.5"
                    >
                      {field.label}
                      {field.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </label>

                    {field.type === "textarea" ? (
                      <textarea
                        id={field.name}
                        name={field.name}
                        placeholder={field.placeholder}
                        required={field.required}
                        value={formData[field.name] ?? ""}
                        onChange={handleChange}
                        rows={5}
                        className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm resize-none"
                      />
                    ) : field.type === "select" ? (
                      <select
                        id={field.name}
                        name={field.name}
                        required={field.required}
                        value={formData[field.name] ?? ""}
                        onChange={handleChange}
                        className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                      >
                        <option value="" disabled>
                          {field.placeholder}
                        </option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        required={field.required}
                        value={formData[field.name] ?? ""}
                        onChange={handleChange}
                      />
                    )}
                  </div>
                ))}

                <Button
                  type="submit"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-11 px-8"
                >
                  Send Message
                </Button>
              </form>
            )}
          </div>

          {/* Right — Info Cards (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address */}
            <Card className="border-border">
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                  <MapPin className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold">Visit Us</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {fullAddress}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Phone */}
            <Card className="border-border">
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                  <Phone className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold">Call Us</h3>
                  <a
                    href={`tel:${business.phone.replace(/\s/g, "")}`}
                    className="mt-1 block text-sm text-muted-foreground hover:text-secondary transition-colors"
                  >
                    {business.phone}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Email */}
            <Card className="border-border">
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                  <Mail className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold">Email Us</h3>
                  <a
                    href={`mailto:${business.email}`}
                    className="mt-1 block text-sm text-muted-foreground hover:text-secondary transition-colors"
                  >
                    {business.email}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Hours */}
            <Card className="border-border">
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                  <Clock className="h-5 w-5 text-secondary" />
                </div>
                <div className="w-full">
                  <h3 className="font-heading font-semibold">Opening Hours</h3>
                  <table className="mt-2 w-full text-sm">
                    <tbody>
                      {Object.entries(business.hours).map(([day, hours]) => (
                        <tr key={day}>
                          <td className="py-1 text-muted-foreground">{day}</td>
                          <td className="py-1 text-right font-medium">
                            {hours}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Additional info note */}
            {contactPage?.additionalInfo && (
              <p className="text-sm text-muted-foreground italic">
                {contactPage.additionalInfo}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
