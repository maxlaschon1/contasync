"use client";

import { brandConfig } from "@/config/brand.config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { newsletter } = brandConfig.content;

  if (!brandConfig.features.newsletter) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would call an API
    setSubmitted(true);
  };

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-xl px-4 text-center">
        <h2 className="font-heading text-3xl md:text-4xl font-bold italic">
          {newsletter.headline}
        </h2>
        <p className="mt-3 text-muted-foreground">{newsletter.subtitle}</p>

        {submitted ? (
          <p className="mt-8 text-secondary font-medium">
            Thank you for subscribing! ✨
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex gap-0">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-r-none border-r-0 h-12"
            />
            <Button
              type="submit"
              className="rounded-l-none h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {newsletter.buttonText}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
