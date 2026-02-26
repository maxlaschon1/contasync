// ============================================
// BRAND CONFIG TYPE DEFINITIONS
// This is the master schema that drives every
// template. Change the config → change the site.
// ============================================

export interface BrandConfig {
  business: BusinessInfo;
  theme: ThemeConfig;
  content: ContentConfig;
  features: FeatureFlags;
  seo: SEOConfig;
  integrations: IntegrationConfig;
}

// ---- BUSINESS INFO ----
export interface BusinessInfo {
  name: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  hours: {
    [key: string]: string; // e.g. "Monday-Friday": "10am-8pm"
  };
  socialMedia: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    whatsapp?: string;
  };
  logo: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
}

// ---- THEME ----
export interface ThemeConfig {
  colors: {
    primary: string;       // Main brand color
    secondary: string;     // Secondary accent
    accent: string;        // Highlight / CTA color
    background: string;    // Page background
    foreground: string;    // Main text color
    muted: string;         // Subtle backgrounds
    mutedForeground: string; // Subtle text
    card: string;          // Card backgrounds
    cardForeground: string; // Card text
    border: string;        // Border color
    destructive: string;   // Error/warning
    footer: string;        // Footer background
    footerForeground: string; // Footer text
  };
  fonts: {
    heading: string;       // Google Font name for headings
    body: string;          // Google Font name for body
  };
  borderRadius: string;    // e.g. "0.5rem"
  style: "elegant" | "modern" | "minimal" | "bold";
}

// ---- CONTENT ----
export interface ContentConfig {
  hero: {
    headline: string;
    subheadline: string;
    backgroundImage: string;
    ctaText?: string;
    ctaLink?: string;
  };
  about: {
    title: string;
    subtitle: string;
    paragraphs: string[];
    image?: string;
    founderName?: string;
    founderTitle?: string;
    founderImage?: string;
  };
  services: ServiceCategory[];
  team: TeamMember[];
  testimonials: Testimonial[];
  gallery: GalleryItem[];
  promotions: Promotion[];
  newsletter: {
    headline: string;
    subtitle: string;
    buttonText: string;
  };
  // Inner-page data (optional — populated per client)
  aboutPage?: AboutPageContent;
  products?: Product[];
  productCategories?: ProductCategory[];
  blog?: BlogPost[];
  booking?: BookingConfig;
  contactPage?: ContactPageConfig;
}

export interface ServiceCategory {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  services: Service[];
}

export interface Service {
  name: string;
  description: string;
  duration: string;
  price: string;
  image?: string;
  popular?: boolean;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
  socialMedia?: {
    instagram?: string;
  };
}

export interface Testimonial {
  name: string;
  text: string;
  rating: number;   // 1-5
  image?: string;
  service?: string;  // Which service they reviewed
}

export interface GalleryItem {
  src: string;
  alt: string;
  category?: string;
}

export interface Promotion {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  badge?: string;   // e.g. "Limited Time", "New"
}

// ---- ABOUT PAGE (extended) ----
export interface AboutPageContent {
  mission: string;
  vision: string;
  values: { title: string; description: string }[];
  stats: { value: string; label: string }[];
  timeline: { year: string; title: string; description: string }[];
  founderImage?: string;
  studioImages?: string[];
}

// ---- SHOP / PRODUCTS ----
export interface ProductCategory {
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice?: string;
  category: string;
  image: string;
  badge?: string;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
}

// ---- BLOG ----
export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  category: string;
  author: { name: string; image?: string };
  date: string;
  readTime: string;
  featured?: boolean;
}

// ---- BOOKING ----
export interface BookingConfig {
  headline: string;
  subtitle: string;
  steps: string[];
  policies: string[];
  contactNote?: string;
}

// ---- CONTACT PAGE ----
export interface ContactPageConfig {
  headline: string;
  subtitle: string;
  formFields: ContactFormField[];
  additionalInfo?: string;
}

export interface ContactFormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  placeholder: string;
  required: boolean;
  options?: string[];
}

// ---- FEATURES (toggle on/off) ----
export interface FeatureFlags {
  booking: boolean;
  shop: boolean;
  blog: boolean;
  gallery: boolean;
  testimonials: boolean;
  newsletter: boolean;
  instagram: boolean;
  whatsappChat: boolean;
  liveChat: boolean;
  giftCards: boolean;
  loyaltyProgram: boolean;
  promoBanner: boolean;
  teamSection: boolean;
  googleMaps: boolean;
}

// ---- SEO ----
export interface SEOConfig {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  locale: string;
  url: string;
}

// ---- INTEGRATIONS ----
export interface IntegrationConfig {
  bookingUrl?: string;      // External booking system URL
  googleMapsEmbed?: string; // Google Maps embed URL
  instagramHandle?: string;
  whatsappNumber?: string;  // With country code
  analyticsId?: string;     // Google Analytics
  promoBanner?: {
    text: string;
    highlight?: string;     // Bold/colored portion
    link?: string;
  };
}

// ---- NAVIGATION ----
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}
