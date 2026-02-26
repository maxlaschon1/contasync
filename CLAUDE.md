# Beauty Templates

## What This Project Is
A **white-label beauty salon website template system** built with Next.js 16. The entire site is driven by a single `brandConfig` object — change the config, change the site. Designed to be reskinned per client.

## Tech Stack
- **Framework:** Next.js 16.1.6 (App Router, RSC)
- **React:** 19.2.3
- **Styling:** Tailwind CSS 4 + CSS variables (driven by brand config)
- **UI Components:** shadcn/ui (new-york style) via Radix UI
- **Fonts:** Google Fonts — Playfair Display (headings) + Inter (body)
- **Icons:** lucide-react
- **Carousel:** embla-carousel-react
- **Utilities:** clsx, tailwind-merge, class-variance-authority

## Architecture

### Config-Driven Design
Everything flows from `src/config/brand.config.ts` which implements the `BrandConfig` type from `src/types/brand.ts`. The config controls:
- **Business info:** name, address, phone, email, hours, social media, logo
- **Theme:** 12 color tokens, fonts, border radius, style variant (elegant/modern/minimal/bold)
- **Content:** hero, about, services (categorized), team, testimonials, gallery, promotions, newsletter
- **Feature flags:** 14 boolean toggles (booking, shop, blog, gallery, testimonials, newsletter, instagram, whatsappChat, liveChat, giftCards, loyaltyProgram, promoBanner, teamSection, googleMaps)
- **SEO:** title, description, keywords, OG image, locale, URL
- **Integrations:** booking URL, Google Maps embed, Instagram handle, WhatsApp, analytics, promo banner

### Navigation
Defined in `brand.config.ts` as a `NavItem[]` export. Auto-generates treatment sub-menu from service categories. Conditionally shows Shop/Blog based on feature flags.

### CSS Variable System
`globals.css` maps brand colors to CSS custom properties (--primary, --secondary, --accent, etc.) which Tailwind consumes via `@theme inline`. The `bg-primary`, `text-secondary`, `bg-footer` etc. classes all reference these variables.

## Directory Structure
```
src/
  app/
    page.tsx              # Homepage — 7 sections
    layout.tsx            # Root layout — PromoBanner + Header + main + Footer
    globals.css           # CSS variables, Tailwind theme, base styles
    account/
      page.tsx            # Account dashboard (sidebar: profile, bookings, orders, favourites, gift cards, loyalty, settings)
      login/page.tsx      # Login (Google/Facebook OAuth + email/password)
      signup/page.tsx     # Signup (Google/Facebook OAuth + email/password)
  components/
    layout/
      Header.tsx          # Sticky header, desktop nav with dropdowns, mobile sheet menu, search/account/cart/book icons
      Footer.tsx          # 4-column footer (brand, quick links, store info/hours, customer service)
      PromoBanner.tsx     # Dismissible top banner with promo code + social icons
    sections/
      HeroSection.tsx     # Full-bleed background image, headline, CTA button
      PromotionSection.tsx # 2-column (dark bg text + image) monthly promotion
      ServicesPreview.tsx  # 3-card grid of popular services with price/duration
      TestimonialsSection.tsx # 4-column client review cards with star ratings
      GallerySection.tsx  # Filterable image grid with category tabs
      TeamSection.tsx     # Team member cards with photo, bio, Instagram link
      NewsletterSection.tsx # Email signup form
    shared/               # (empty — for shared components)
    ui/                   # shadcn components: accordion, badge, button, card, carousel, input, navigation-menu, scroll-area, separator, sheet
  config/
    brand.config.ts       # THE master config file — all content/theme/features
    brand.ts              # (exists but may be unused — check)
  types/
    brand.ts              # TypeScript interfaces: BrandConfig, BusinessInfo, ThemeConfig, ContentConfig, FeatureFlags, SEOConfig, IntegrationConfig, NavItem, ServiceCategory, Service, TeamMember, Testimonial, GalleryItem, Promotion
  lib/
    utils.ts              # cn() utility (clsx + tailwind-merge)
  data/                   # (exists — check contents)
templates/
  elegant/                # (empty — planned template variant)
  minimal/                # (empty — planned template variant)
  modern/                 # (empty — planned template variant)
clients/                  # (empty — for per-client config overrides)
public/                   # Static assets (images referenced as /assets/images/...)
```

## Default Demo Client
- **Business:** "Glow Studio" — luxury beauty salon in London
- **Theme:** elegant style — dark navy (#1A1A2E) + warm gold (#C4A265) + rose gold (#D4A574) on cream (#FAFAF8)
- **Services:** 5 categories (Brows/Lashes/Face, Body Contouring, Facials, Injectables, Teeth Whitening) with 11 total services
- **Team:** 3 members (Sarah, Emily, Amara)
- **Testimonials:** 4 reviews

## Auth System
- **Demo-only / localStorage-based** — no real backend
- Login accepts any email/password, stores `{ email, name }` in localStorage
- Signup creates user with name/email/password (min 6 chars)
- Account page reads from localStorage, redirects to login if no user
- Placeholder OAuth buttons for Google and Facebook (show alerts)

## What's Been Built
- Full homepage with 7 sections (all config-driven)
- Responsive header with desktop dropdown nav + mobile sheet menu
- 4-column footer with business info, links, hours, contact
- Dismissible promo banner
- Account dashboard with 7 tabs (profile with edit mode, bookings, orders, favourites, gift cards, loyalty points, settings)
- Login page (social + email)
- Signup page (social + email)
- Image placeholders via `.img-placeholder` CSS class (gradient backgrounds)

## What's NOT Built Yet
- Template variants (elegant/minimal/modern folders are empty)
- Client override system (clients/ folder is empty)
- Inner pages: /about, /treatments, /treatments/[slug], /shop, /blog, /contact, /book
- Real authentication (currently localStorage demo)
- Image assets (using placeholder gradients)
- ThemeProvider to dynamically inject CSS variables from config at runtime
- Shop/e-commerce functionality
- Blog system
- Booking integration
- Gift cards flow
- Google Maps integration on contact page

## Conventions
- All components read from `brandConfig` directly (imported from `@/config/brand.config`)
- Feature flags control conditional rendering: `{brandConfig.features.gallery && <GallerySection />}`
- Colors use CSS variable classes: `bg-primary`, `text-secondary`, `bg-footer`, etc.
- Headings use `font-heading` class, body uses default `font-body`
- Sections follow pattern: `<section className="py-20 bg-background">` with `max-w-7xl` container
- shadcn/ui components in `src/components/ui/` — don't modify these directly
- Images referenced as `/assets/images/...` paths (not yet created)

## CRITICAL: Tailwind 4 Responsive Utility Bug
**NEVER use `hidden md:flex` or `hidden lg:block` patterns.** In Tailwind 4, the base `hidden` class wins over responsive variants like `md:flex` due to CSS layer ordering.
- **WRONG:** `hidden md:flex` (nav will stay hidden on all screen sizes)
- **RIGHT:** `flex max-md:hidden` (flex is the base, hidden only below md)
- Same applies to all breakpoints: use `max-sm:hidden`, `max-md:hidden`, `max-lg:hidden` instead

## Commands
```bash
npm run dev    # Start dev server
npm run build  # Production build
npm run start  # Start production server
npm run lint   # ESLint
```
