import Script from "next/script";

interface LocaleProps {
  locale?: string;
}

// Locale-specific content
const localizedContent = {
  fr: {
    orgDescription: "Intelligence Artificielle Intelligemment Accessible, Zéro engagement. Accédez aux meilleurs modèles d'IA sans abonnement.",
    productDescription: "Plateforme d'accès aux modèles d'IA (Claude, GPT-5, Gemini, Mistral) sans abonnement. Payez uniquement ce que vous utilisez.",
    websiteDescription: "Intelligence Artificielle Intelligemment Accessible, Zéro engagement",
    freeCredits: "1€ de crédits offerts à l'inscription",
    starterPack: "5€ de crédits",
    regularPack: "10€ de crédits - Le plus populaire",
    powerPack: "20€ de crédits",
    features: [
      "Accès à Claude, GPT-5, Gemini, Mistral",
      "Pas d'abonnement",
      "Paiement à l'usage",
      "Crédits sans expiration",
      "Interface en français",
      "Données hébergées en Europe",
    ],
  },
  en: {
    orgDescription: "Affordable AI Access, Zero commitment. Access the best AI models without subscription.",
    productDescription: "Platform for accessing AI models (Claude, GPT-5, Gemini, Mistral) without subscription. Pay only for what you use.",
    websiteDescription: "Affordable AI Access, Zero commitment",
    freeCredits: "$1 free credit on signup",
    starterPack: "$5 in credits",
    regularPack: "$10 in credits - Most popular",
    powerPack: "$20 in credits",
    features: [
      "Access to Claude, GPT-5, Gemini, Mistral",
      "No subscription",
      "Pay as you go",
      "Credits never expire",
      "Simple interface",
      "Data hosted in Europe",
    ],
  },
};

// Organization structured data
export function OrganizationSchema({ locale = "fr" }: LocaleProps) {
  const content = localizedContent[locale as keyof typeof localizedContent] || localizedContent.fr;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "iaiaz",
    alternateName: "BAJURIAN SAS",
    url: "https://www.iaiaz.com",
    logo: "https://www.iaiaz.com/logo.png",
    description: content.orgDescription,
    address: {
      "@type": "PostalAddress",
      streetAddress: "135 Avenue des Pyrénées",
      addressLocality: "Plaisance du Touch",
      postalCode: "31830",
      addressCountry: "FR",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: "admin@iaiaz.com",
      contactType: "customer service",
      availableLanguage: ["French", "English"],
    },
    sameAs: [],
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Product/Service structured data
export function ProductSchema({ locale = "fr" }: LocaleProps) {
  const content = localizedContent[locale as keyof typeof localizedContent] || localizedContent.fr;
  const currency = locale === "en" ? "USD" : "EUR";

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "iaiaz",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: content.productDescription,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: currency,
      lowPrice: "1",
      highPrice: "100",
      offerCount: "4",
      offers: [
        {
          "@type": "Offer",
          name: locale === "en" ? "Free credits" : "Crédits gratuits",
          price: "0",
          priceCurrency: currency,
          description: content.freeCredits,
        },
        {
          "@type": "Offer",
          name: "Pack Starter",
          price: "5",
          priceCurrency: currency,
          description: content.starterPack,
        },
        {
          "@type": "Offer",
          name: "Pack Regular",
          price: "10",
          priceCurrency: currency,
          description: content.regularPack,
        },
        {
          "@type": "Offer",
          name: "Pack Power",
          price: "20",
          priceCurrency: currency,
          description: content.powerPack,
        },
      ],
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "50",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: content.features,
  };

  return (
    <Script
      id="product-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// FAQ structured data
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSchema({ faqs }: { faqs: FAQItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// WebSite structured data with search
export function WebsiteSchema({ locale = "fr" }: LocaleProps) {
  const content = localizedContent[locale as keyof typeof localizedContent] || localizedContent.fr;
  const baseUrl = "https://www.iaiaz.com";

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "iaiaz",
    alternateName: locale === "en" ? "iaiaz - Affordable AI" : "iaiaz - IA Accessible",
    url: locale === "en" ? `${baseUrl}/en` : baseUrl,
    description: content.websiteDescription,
    inLanguage: locale === "en" ? "en" : "fr-FR",
    publisher: {
      "@type": "Organization",
      name: "BAJURIAN SAS",
    },
  };

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Mifa Product/Service structured data
const mifaLocalizedContent = {
  fr: {
    name: "mifa by iaiaz — IA familiale avec contrôle parental",
    description:
      "Plateforme d'IA familiale avec supervision adaptée à l'âge. Contrôle parental, crédits partagés, heures calmes. Essai gratuit 7 jours.",
    features: [
      "Contrôle parental intelligent",
      "Supervision adaptée à l'âge (guidé, confiance, adulte)",
      "Crédits partagés en famille",
      "Heures calmes configurables",
      "Tableau de bord parent avec insights",
      "Filtrage de contenu automatique",
    ],
  },
  en: {
    name: "mifa by iaiaz — Family AI with Parental Controls",
    description:
      "Family AI platform with age-adaptive supervision. Parental controls, shared credits, quiet hours. 7-day free trial.",
    features: [
      "Smart parental controls",
      "Age-adaptive supervision (guided, trusted, adult)",
      "Shared family credits",
      "Configurable quiet hours",
      "Parent dashboard with insights",
      "Automatic content filtering",
    ],
  },
};

export function MifaProductSchema({ locale = "fr" }: LocaleProps) {
  const content =
    mifaLocalizedContent[locale as keyof typeof mifaLocalizedContent] ||
    mifaLocalizedContent.fr;

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: content.name,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, iOS",
    description: content.description,
    url: "https://www.iaiaz.com/mifa",
    offers: {
      "@type": "Offer",
      price: "9.90",
      priceCurrency: "EUR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "9.90",
        priceCurrency: "EUR",
        billingIncrement: "P1M",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: "1",
          unitText: locale === "fr" ? "enfant" : "child",
        },
      },
      availability: "https://schema.org/InStock",
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "FR",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnNotPermitted",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "25",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: content.features,
    publisher: {
      "@type": "Organization",
      name: "BAJURIAN SAS",
      url: "https://www.iaiaz.com",
    },
  };

  return (
    <Script
      id="mifa-product-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Breadcrumb structured data
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
