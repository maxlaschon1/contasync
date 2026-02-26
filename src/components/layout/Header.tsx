"use client";

import Link from "next/link";
import { useState } from "react";
import { brandConfig, navigation } from "@/config/brand.config";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, ShoppingBag, Search, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { business } = brandConfig;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-heading text-xl md:text-2xl font-bold tracking-wider uppercase">
            {business.name}
          </span>
        </Link>

        {/* Desktop Navigation — visible at md (768px+) */}
        <nav className="flex max-md:hidden items-center gap-0.5 lg:gap-1">
          {navigation.map((item) => (
            <div key={item.label} className="relative group">
              <Link
                href={item.href}
                className={cn(
                  "px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium tracking-wide uppercase transition-colors",
                  "hover:text-secondary border-b-2 border-transparent hover:border-secondary"
                )}
              >
                {item.label}
                {item.children && (
                  <ChevronDown className="ml-1 inline h-3 w-3" />
                )}
              </Link>

              {/* Dropdown */}
              {item.children && (
                <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-card border border-border rounded-lg shadow-lg py-2 min-w-[200px]">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right Side — Search, Account, Cart, Book Now, Mobile Menu */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" className="flex max-md:hidden" aria-label="Search">
            <Search className="h-5 w-5" />
          </Button>

          {/* Account / Login icon */}
          <Button variant="ghost" size="icon" asChild aria-label="Account">
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>

          {brandConfig.features.shop && (
            <Button variant="ghost" size="icon" asChild aria-label="Shopping bag">
              <Link href="/shop">
                <ShoppingBag className="h-5 w-5" />
              </Link>
            </Button>
          )}

          {brandConfig.features.booking && (
            <Button
              asChild
              className="inline-flex max-lg:hidden bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Link href={brandConfig.integrations.bookingUrl || "/book"}>
                Book Now
              </Link>
            </Button>
          )}

          {/* Mobile hamburger — only on small screens */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="max-md:block hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] pt-12">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="flex flex-col gap-4">
                {navigation.map((item) => (
                  <div key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-lg font-medium tracking-wide uppercase hover:text-secondary transition-colors"
                    >
                      {item.label}
                    </Link>
                    {item.children && (
                      <div className="ml-4 mt-2 flex flex-col gap-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Mobile account link */}
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-medium tracking-wide uppercase hover:text-secondary transition-colors"
                >
                  My Account
                </Link>

                {brandConfig.features.booking && (
                  <Button
                    asChild
                    className="mt-4 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  >
                    <Link
                      href={brandConfig.integrations.bookingUrl || "/book"}
                      onClick={() => setMobileOpen(false)}
                    >
                      Book Now
                    </Link>
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
