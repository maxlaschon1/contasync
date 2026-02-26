import Link from "next/link";
import { brandConfig, navigation } from "@/config/brand.config";
import { Separator } from "@/components/ui/separator";
import { Instagram, Facebook, Youtube, Twitter, Phone, Mail, MapPin } from "lucide-react";

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  twitter: Twitter,
};

export function Footer() {
  const { business, features } = brandConfig;

  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 — Brand + About */}
          <div>
            <h3 className="font-heading text-xl font-bold mb-4">
              {business.name}
            </h3>
            <p className="text-sm opacity-80 leading-relaxed">
              {business.description}
            </p>
            {/* Social Icons */}
            <div className="mt-6 flex gap-4">
              {Object.entries(business.socialMedia).map(([platform, url]) => {
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
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Column 2 — Quick Links */}
          <div>
            <h3 className="font-heading text-lg font-semibold mb-4">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm opacity-80 hover:opacity-100 transition-opacity"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {features.giftCards && (
                <li>
                  <Link
                    href="/gift-cards"
                    className="text-sm opacity-80 hover:opacity-100 transition-opacity"
                  >
                    Gift Cards
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 3 — Our Store */}
          <div>
            <h3 className="font-heading text-lg font-semibold mb-4">
              Our Store
            </h3>
            <div className="space-y-3 text-sm opacity-80">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  {business.address.street}
                  <br />
                  {business.address.city}, {business.address.zip}
                </p>
              </div>
              <Separator className="bg-footer-foreground/20" />
              {Object.entries(business.hours).map(([day, time]) => (
                <div key={day} className="flex justify-between">
                  <span>{day}</span>
                  <span>{time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4 — Contact / Policy */}
          <div>
            <h3 className="font-heading text-lg font-semibold mb-4">
              Customer Service
            </h3>
            <div className="space-y-3 text-sm opacity-80">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${business.phone}`} className="hover:opacity-100">
                  {business.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${business.email}`} className="hover:opacity-100">
                  {business.email}
                </a>
              </div>
              <Separator className="bg-footer-foreground/20" />
              <ul className="space-y-2">
                <li>
                  <Link href="/shipping" className="hover:opacity-100">
                    Shipping & Returns
                  </Link>
                </li>
                <li>
                  <Link href="/store-policy" className="hover:opacity-100">
                    Store Policy
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:opacity-100">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <Separator className="my-8 bg-footer-foreground/20" />
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs opacity-60">
            &copy; {new Date().getFullYear()} {business.name}. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs opacity-60">
            <Link href="/privacy" className="hover:opacity-100">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:opacity-100">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
