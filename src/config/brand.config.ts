import type { BrandConfig, NavItem } from "@/types/brand";

// ============================================
// 🎨 BRAND CONFIGURATION
// This single file controls the ENTIRE website.
// To reskin for a new client, duplicate this file
// and update the values below.
// ============================================

export const brandConfig: BrandConfig = {
  // ---- BUSINESS INFO ----
  business: {
    name: "Glow Studio",
    tagline: "Discover the Beauty Within",
    description:
      "Premium beauty services and cosmetic treatments to enhance your natural beauty. Expert aestheticians, luxury products, and a welcoming atmosphere.",
    phone: "+44 20 1234 5678",
    email: "hello@glowstudio.com",
    address: {
      street: "42 Beaumont Street",
      city: "London",
      state: "England",
      zip: "W1S 4LR",
      country: "UK",
    },
    hours: {
      "Monday - Friday": "10am - 8pm",
      Thursday: "10am - 6pm",
      Saturday: "10am - 6pm",
      Sunday: "Closed",
    },
    socialMedia: {
      instagram: "https://instagram.com/glowstudio",
      facebook: "https://facebook.com/glowstudio",
      tiktok: "https://tiktok.com/@glowstudio",
      youtube: "https://youtube.com/@glowstudio",
      whatsapp: "https://wa.me/442012345678",
    },
    logo: {
      src: "/assets/images/logo.svg",
      alt: "Glow Studio Logo",
      width: 160,
      height: 48,
    },
  },

  // ---- THEME ----
  theme: {
    colors: {
      primary: "#1A1A2E",         // Dark navy
      secondary: "#C4A265",       // Warm gold
      accent: "#D4A574",          // Rose gold
      background: "#FAFAF8",      // Off-white cream
      foreground: "#1A1A2E",      // Dark text
      muted: "#F5F0EB",           // Light beige
      mutedForeground: "#6B6B6B", // Muted text
      card: "#FFFFFF",            // White cards
      cardForeground: "#1A1A2E",  // Card text
      border: "#E8E0D8",          // Soft border
      destructive: "#DC2626",     // Error red
      footer: "#1A1A2E",          // Dark footer
      footerForeground: "#E8E0D8",// Light footer text
    },
    fonts: {
      heading: "Playfair Display", // Elegant serif
      body: "Inter",               // Clean sans-serif
    },
    borderRadius: "0.5rem",
    style: "elegant",
  },

  // ---- CONTENT ----
  content: {
    hero: {
      headline: "Discover the Beauty Within",
      subheadline:
        "We offer a wide range of beauty services and cosmetic products to enhance your natural beauty.",
      backgroundImage: "/assets/images/hero.jpg",
      ctaText: "Book Now",
      ctaLink: "/book",
    },
    about: {
      title: "About Us",
      subtitle: "Finding Inspiration in Every Turn",
      paragraphs: [
        "Glow Studio was founded with a passion for helping people feel their most beautiful and confident selves. Our team of expert aestheticians brings years of experience in advanced beauty treatments.",
        "From eyebrow threading to laser body contouring, microblading to semi-permanent makeup, we offer an extensive repertoire of over 60 treatments. Our commitment to excellence is evident in every service we provide.",
      ],
      founderName: "Sarah Johnson",
      founderTitle: "Founder & Lead Aesthetician",
    },
    services: [
      {
        name: "Brows, Lashes & Face",
        slug: "brows-lashes-face",
        description: "Expert shaping and enhancement for your natural features",
        image: "/assets/images/services/brows-lashes.jpg",
        services: [
          {
            name: "Lash Extensions - Classic",
            description:
              "Full set of classic lash extensions for a natural, elegant look.",
            duration: "1 hr",
            price: "£120",
            popular: true,
          },
          {
            name: "Eyebrow Threading",
            description:
              "Precise eyebrow shaping using the ancient threading technique.",
            duration: "15 min",
            price: "£15",
          },
          {
            name: "Brow Lamination",
            description:
              "Restructure brow hairs for a fuller, more defined shape.",
            duration: "45 min",
            price: "£45",
            popular: true,
          },
          {
            name: "Lash Lift & Tint",
            description:
              "Natural lash enhancement with semi-permanent curl and colour.",
            duration: "45 min",
            price: "£55",
          },
        ],
      },
      {
        name: "Body Contouring",
        slug: "body-contouring",
        description: "Advanced body sculpting and contouring treatments",
        image: "/assets/images/services/body-contouring.jpg",
        services: [
          {
            name: "Wood Therapy Session",
            description:
              "Colombian wood therapy for natural body contouring and lymphatic drainage.",
            duration: "1 hr",
            price: "£90",
          },
          {
            name: "Laser Lipo",
            description:
              "Non-invasive laser treatment for targeted fat reduction.",
            duration: "45 min",
            price: "£150",
            popular: true,
          },
        ],
      },
      {
        name: "Facials",
        slug: "facials",
        description: "Rejuvenating facial treatments for all skin types",
        image: "/assets/images/services/facials.jpg",
        services: [
          {
            name: "Bioactive Algae Peel",
            description:
              "Deep cleansing peel for radiant, renewed skin using natural algae.",
            duration: "45 min",
            price: "£250",
          },
          {
            name: "Hydra Facial",
            description:
              "Multi-step facial for deep cleansing, exfoliation, and hydration.",
            duration: "1 hr",
            price: "£120",
            popular: true,
          },
        ],
      },
      {
        name: "Injectables",
        slug: "injectables",
        description: "Professional aesthetic injection treatments",
        services: [
          {
            name: "Polynucleotide Skin Boosters",
            description:
              "Next-generation skin therapy for radiant, resilient skin.",
            duration: "30 min",
            price: "£300",
          },
          {
            name: "Lip Filler",
            description:
              "Natural-looking lip enhancement with premium dermal fillers.",
            duration: "30 min",
            price: "£250",
          },
        ],
      },
      {
        name: "Teeth Whitening",
        slug: "teeth-whitening",
        description: "Professional teeth whitening for a brighter smile",
        services: [
          {
            name: "Professional Teeth Whitening",
            description:
              "In-office LED teeth whitening for dramatically brighter results.",
            duration: "1 hr",
            price: "£199",
          },
        ],
      },
    ],
    team: [
      {
        name: "Sarah Johnson",
        role: "Founder & Lead Aesthetician",
        bio: "With over 15 years of experience in the beauty industry, Sarah founded Glow Studio to bring world-class treatments to London.",
        image: "/assets/images/team/sarah.jpg",
        socialMedia: { instagram: "https://instagram.com/sarahj" },
      },
      {
        name: "Emily Chen",
        role: "Senior Lash Technician",
        bio: "Specialising in Russian volume and mega volume lashes, Emily creates bespoke looks for every client.",
        image: "/assets/images/team/emily.jpg",
      },
      {
        name: "Amara Okafor",
        role: "Body Contouring Specialist",
        bio: "Certified in advanced body sculpting techniques including wood therapy and laser treatments.",
        image: "/assets/images/team/amara.jpg",
      },
    ],
    testimonials: [
      {
        name: "Jessica M.",
        text: "Absolutely love my lash extensions! The team at Glow Studio are incredibly skilled and professional. I wouldn't go anywhere else.",
        rating: 5,
        service: "Lash Extensions",
      },
      {
        name: "Priya K.",
        text: "Had the hydra facial and my skin has never looked better. The atmosphere is so relaxing and luxurious.",
        rating: 5,
        service: "Hydra Facial",
      },
      {
        name: "Lauren T.",
        text: "The wood therapy sessions have been amazing for my body confidence. Visible results after just three sessions!",
        rating: 5,
        service: "Wood Therapy",
      },
      {
        name: "Sophie R.",
        text: "Best brow lamination I've ever had. They really take the time to understand what shape you want.",
        rating: 4,
        service: "Brow Lamination",
      },
    ],
    gallery: [
      { src: "/assets/images/gallery/1.jpg", alt: "Lash extensions closeup", category: "Lashes" },
      { src: "/assets/images/gallery/2.jpg", alt: "Facial treatment", category: "Facials" },
      { src: "/assets/images/gallery/3.jpg", alt: "Brow lamination result", category: "Brows" },
      { src: "/assets/images/gallery/4.jpg", alt: "Studio interior", category: "Studio" },
      { src: "/assets/images/gallery/5.jpg", alt: "Body contouring session", category: "Body" },
      { src: "/assets/images/gallery/6.jpg", alt: "Teeth whitening result", category: "Teeth" },
    ],
    promotions: [
      {
        title: "Monthly Promotion",
        subtitle: "Polynucleotide Skin Boosters",
        description:
          "Transform tired, dull, or ageing skin into something radiant and resilient with our next-generation skin therapy.",
        image: "/assets/images/promo.jpg",
        ctaText: "Book Now",
        ctaLink: "/book",
        badge: "New",
      },
    ],
    newsletter: {
      headline: "Are you on the list?",
      subtitle: "Join to get exclusive offers & discounts",
      buttonText: "Join",
    },

    // ---- ABOUT PAGE (extended) ----
    aboutPage: {
      mission:
        "To empower every person who walks through our doors to feel their most confident and beautiful self, using advanced techniques and premium products in a warm, welcoming environment.",
      vision:
        "To be London\u2019s most trusted destination for transformative beauty treatments, setting the standard for excellence in aesthetics.",
      values: [
        {
          title: "Excellence",
          description:
            "We never stop learning. Our team undergoes continuous training to master the latest techniques and technologies.",
        },
        {
          title: "Integrity",
          description:
            "Honest consultations, transparent pricing, and genuine advice. We will always recommend what is truly best for you.",
        },
        {
          title: "Warmth",
          description:
            "Every client is family. From your first consultation to your hundredth visit, you will always feel welcomed and valued.",
        },
        {
          title: "Innovation",
          description:
            "We invest in cutting-edge treatments and premium products to deliver results that exceed expectations.",
        },
      ],
      stats: [
        { value: "15+", label: "Years Experience" },
        { value: "10,000+", label: "Happy Clients" },
        { value: "60+", label: "Treatments Offered" },
        { value: "4.9", label: "Average Rating" },
      ],
      timeline: [
        {
          year: "2010",
          title: "The Beginning",
          description:
            "Sarah Johnson opens a small beauty room in Mayfair with a vision to provide luxury treatments at accessible prices.",
        },
        {
          year: "2013",
          title: "Growing the Team",
          description:
            "With demand soaring, we expanded to a full studio and welcomed our first specialist team members.",
        },
        {
          year: "2016",
          title: "Award-Winning Studio",
          description:
            "Recognised as Best Beauty Salon in London at the Beauty Industry Awards.",
        },
        {
          year: "2019",
          title: "Advanced Aesthetics",
          description:
            "Launched our advanced aesthetics menu including injectables and laser treatments with qualified medical professionals.",
        },
        {
          year: "2023",
          title: "Digital Expansion",
          description:
            "Launched our online shop and loyalty programme, bringing the Glow Studio experience to clients at home.",
        },
        {
          year: "2025",
          title: "Today",
          description:
            "Over 60 treatments, a team of 12 specialists, and thousands of loyal clients across London.",
        },
      ],
      founderImage: "/assets/images/team/sarah.jpg",
      studioImages: [
        "/assets/images/gallery/4.jpg",
        "/assets/images/gallery/5.jpg",
        "/assets/images/gallery/6.jpg",
      ],
    },

    // ---- PRODUCTS ----
    productCategories: [
      { name: "Skincare", slug: "skincare", description: "Professional-grade skincare for radiant results at home" },
      { name: "Lash & Brow", slug: "lash-brow", description: "Aftercare and enhancement products for lashes and brows" },
      { name: "Body Care", slug: "body-care", description: "Luxurious body care essentials" },
      { name: "Gift Sets", slug: "gift-sets", description: "Curated gift sets for every occasion" },
    ],
    products: [
      {
        id: "prod-001",
        name: "Vitamin C Brightening Serum",
        slug: "vitamin-c-brightening-serum",
        description: "A powerful antioxidant serum that brightens and evens skin tone. Formulated with 15% L-ascorbic acid and hyaluronic acid.",
        price: "\u00a342.00",
        category: "skincare",
        image: "/assets/images/shop/products/vitamin-c-serum.jpg",
        badge: "Best Seller",
        inStock: true,
        rating: 5,
        reviewCount: 124,
      },
      {
        id: "prod-002",
        name: "Hydrating Rose Moisturiser",
        slug: "hydrating-rose-moisturiser",
        description: "Lightweight daily moisturiser infused with rose hip oil and ceramides. Locks in moisture for 24 hours.",
        price: "\u00a336.00",
        category: "skincare",
        image: "/assets/images/shop/products/rose-moisturiser.jpg",
        inStock: true,
        rating: 5,
        reviewCount: 89,
      },
      {
        id: "prod-003",
        name: "Retinol Night Cream",
        slug: "retinol-night-cream",
        description: "Advanced overnight renewal cream with encapsulated retinol. Reduces fine lines and improves skin texture.",
        price: "\u00a348.00",
        compareAtPrice: "\u00a358.00",
        category: "skincare",
        image: "/assets/images/shop/products/retinol-cream.jpg",
        badge: "Sale",
        inStock: true,
        rating: 4,
        reviewCount: 67,
      },
      {
        id: "prod-004",
        name: "Lash Extension Cleanser",
        slug: "lash-extension-cleanser",
        description: "Oil-free foaming cleanser specifically formulated for lash extension aftercare. Gentle enough for daily use.",
        price: "\u00a318.00",
        category: "lash-brow",
        image: "/assets/images/shop/products/lash-cleanser.jpg",
        inStock: true,
        rating: 5,
        reviewCount: 203,
      },
      {
        id: "prod-005",
        name: "Brow Growth Serum",
        slug: "brow-growth-serum",
        description: "Peptide-enriched serum that promotes fuller, thicker brows. Visible results in 4\u20136 weeks.",
        price: "\u00a328.00",
        category: "lash-brow",
        image: "/assets/images/shop/products/brow-serum.jpg",
        badge: "New",
        inStock: true,
        rating: 4,
        reviewCount: 45,
      },
      {
        id: "prod-006",
        name: "Firming Body Oil",
        slug: "firming-body-oil",
        description: "Luxurious blend of argan, jojoba and sweet almond oils with caffeine. Firms and tones skin with a golden shimmer.",
        price: "\u00a332.00",
        category: "body-care",
        image: "/assets/images/shop/products/body-oil.jpg",
        inStock: true,
        rating: 5,
        reviewCount: 56,
      },
      {
        id: "prod-007",
        name: "Exfoliating Body Scrub",
        slug: "exfoliating-body-scrub",
        description: "Sugar-based body scrub with coconut oil and vitamin E. Buffs away dead skin cells revealing silky smooth skin.",
        price: "\u00a324.00",
        category: "body-care",
        image: "/assets/images/shop/products/body-scrub.jpg",
        inStock: true,
        rating: 4,
        reviewCount: 78,
      },
      {
        id: "prod-008",
        name: "The Glow Edit Gift Set",
        slug: "glow-edit-gift-set",
        description: "Our bestselling trio: Vitamin C Serum, Rose Moisturiser and Lip Balm in a beautiful gift box.",
        price: "\u00a385.00",
        compareAtPrice: "\u00a396.00",
        category: "gift-sets",
        image: "/assets/images/shop/products/gift-set.jpg",
        badge: "Save 11%",
        inStock: true,
        rating: 5,
        reviewCount: 34,
      },
    ],

    // ---- BLOG ----
    blog: [
      {
        title: "The Ultimate Guide to Lash Extension Aftercare",
        slug: "lash-extension-aftercare-guide",
        excerpt: "Everything you need to know about keeping your lash extensions looking fabulous for longer. Our expert tips on cleansing, brushing, and what to avoid.",
        image: "/assets/images/blog/lash-aftercare.jpg",
        category: "Lash Care",
        author: { name: "Emily Chen", image: "/assets/images/team/emily.jpg" },
        date: "2025-05-10",
        readTime: "6 min read",
        featured: true,
      },
      {
        title: "5 Skincare Mistakes You Are Probably Making",
        slug: "skincare-mistakes",
        excerpt: "From over-exfoliating to skipping SPF, our aestheticians reveal the most common skincare errors and how to fix them for good.",
        image: "/assets/images/blog/skincare-mistakes.jpg",
        category: "Skincare",
        author: { name: "Sarah Johnson", image: "/assets/images/team/sarah.jpg" },
        date: "2025-04-28",
        readTime: "4 min read",
      },
      {
        title: "Brow Lamination vs Microblading: Which Is Right for You?",
        slug: "brow-lamination-vs-microblading",
        excerpt: "Two of the most popular brow treatments compared side by side. We break down the process, results, longevity and cost.",
        image: "/assets/images/blog/brow-comparison.jpg",
        category: "Brows",
        author: { name: "Sarah Johnson", image: "/assets/images/team/sarah.jpg" },
        date: "2025-04-15",
        readTime: "5 min read",
        featured: true,
      },
      {
        title: "What to Expect from Your First Body Contouring Session",
        slug: "first-body-contouring-session",
        excerpt: "Nervous about your first wood therapy or laser lipo appointment? Here is a complete walkthrough of what happens before, during and after.",
        image: "/assets/images/blog/body-contouring-guide.jpg",
        category: "Body",
        author: { name: "Amara Okafor", image: "/assets/images/team/amara.jpg" },
        date: "2025-03-20",
        readTime: "7 min read",
      },
      {
        title: "Spring Beauty Trends 2025: What We Are Loving",
        slug: "spring-beauty-trends-2025",
        excerpt: "From glass skin to fluffy brows, discover the top beauty trends our team is excited about this season and how to achieve them.",
        image: "/assets/images/blog/spring-trends.jpg",
        category: "Trends",
        author: { name: "Sarah Johnson", image: "/assets/images/team/sarah.jpg" },
        date: "2025-03-05",
        readTime: "4 min read",
      },
      {
        title: "How to Prepare for Your Facial Treatment",
        slug: "prepare-for-facial",
        excerpt: "Maximise the results of your next facial by following these simple preparation steps. What to do and avoid in the 48 hours before your appointment.",
        image: "/assets/images/blog/facial-prep.jpg",
        category: "Skincare",
        author: { name: "Sarah Johnson", image: "/assets/images/team/sarah.jpg" },
        date: "2025-02-18",
        readTime: "3 min read",
      },
    ],

    // ---- BOOKING ----
    booking: {
      headline: "Book Your Appointment",
      subtitle: "Choose a treatment and select a time that works for you. Our online booking makes it easy.",
      steps: [
        "Select a treatment category",
        "Choose your specific service",
        "Pick your preferred date and time",
        "Confirm your details",
      ],
      policies: [
        "A 50% deposit is required to secure your booking.",
        "Cancellations must be made at least 24 hours in advance for a full refund.",
        "Late arrivals of more than 15 minutes may result in a shortened appointment.",
        "Please arrive 5 minutes early for your first appointment to complete a consultation form.",
      ],
      contactNote: "Prefer to book by phone? Call us on +44 20 1234 5678 and we\u2019ll be happy to help.",
    },

    // ---- CONTACT PAGE ----
    contactPage: {
      headline: "Get in Touch",
      subtitle: "We\u2019d love to hear from you. Send us a message or visit us at our London studio.",
      formFields: [
        { name: "name", label: "Full Name", type: "text", placeholder: "Your name", required: true },
        { name: "email", label: "Email Address", type: "email", placeholder: "your@email.com", required: true },
        { name: "phone", label: "Phone Number", type: "tel", placeholder: "+44 ...", required: false },
        {
          name: "subject",
          label: "Subject",
          type: "select",
          placeholder: "What is this about?",
          required: true,
          options: ["General Enquiry", "Booking Question", "Treatment Advice", "Feedback", "Collaboration"],
        },
        { name: "message", label: "Message", type: "textarea", placeholder: "Tell us how we can help...", required: true },
      ],
      additionalInfo: "We aim to respond to all enquiries within 24 hours during business days.",
    },
  },

  // ---- FEATURES ----
  features: {
    booking: true,
    shop: true,
    blog: true,
    gallery: true,
    testimonials: true,
    newsletter: true,
    instagram: true,
    whatsappChat: true,
    liveChat: false,
    giftCards: true,
    loyaltyProgram: true,
    promoBanner: true,
    teamSection: true,
    googleMaps: true,
  },

  // ---- SEO ----
  seo: {
    title: "Glow Studio | Luxury Beauty Services | London",
    description:
      "Premium beauty services in London. Lash extensions, facials, body contouring, and more. Book your appointment today.",
    keywords: [
      "beauty salon london",
      "lash extensions",
      "facials",
      "body contouring",
      "brow lamination",
      "aesthetics",
    ],
    ogImage: "/assets/images/og-image.jpg",
    locale: "en_GB",
    url: "https://www.glowstudio.com",
  },

  // ---- INTEGRATIONS ----
  integrations: {
    bookingUrl: "/book",
    googleMapsEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2483.0!2d-0.14!3d51.51!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1",
    instagramHandle: "glowstudio",
    whatsappNumber: "+442012345678",
    promoBanner: {
      text: "15% sitewide! use promo code",
      highlight: "GLOW15",
    },
  },
};

// ---- NAVIGATION ----
export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  {
    label: "Treatments",
    href: "/treatments",
    children: brandConfig.content.services.map((cat) => ({
      label: cat.name,
      href: `/treatments/${cat.slug}`,
    })),
  },
  ...(brandConfig.features.shop
    ? [{ label: "Shop", href: "/shop" }]
    : []),
  ...(brandConfig.features.blog
    ? [{ label: "Blog", href: "/blog" }]
    : []),
  { label: "Contact", href: "/contact" },
];
