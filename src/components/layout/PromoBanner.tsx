"use client";

import { brandConfig } from "@/config/brand.config";
import { X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Instagram, Facebook, Youtube, Twitter } from "lucide-react";

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  twitter: Twitter,
};

export function PromoBanner() {
  const [visible, setVisible] = useState(true);
  const promo = brandConfig.integrations.promoBanner;

  if (!visible || !promo) return null;

  return (
    <div className="bg-primary text-primary-foreground relative">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-sm">
        {/* Search placeholder */}
        <div className="block max-md:hidden text-xs opacity-70">
          {/* spacer for layout */}
        </div>

        {/* Promo text */}
        <p className="mx-auto text-center">
          <span className="font-semibold">{promo.highlight}</span>
          {" "}{promo.text}
          {promo.link && (
            <Link href={promo.link} className="ml-2 underline underline-offset-2">
              Shop Now
            </Link>
          )}
        </p>

        {/* Social + close */}
        <div className="flex items-center gap-3">
          {Object.entries(brandConfig.business.socialMedia).map(
            ([platform, url]) => {
              const Icon = socialIcons[platform];
              if (!Icon || !url) return null;
              return (
                <Link
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            }
          )}
          <button
            onClick={() => setVisible(false)}
            className="ml-2 opacity-70 hover:opacity-100"
            aria-label="Close promotion banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
