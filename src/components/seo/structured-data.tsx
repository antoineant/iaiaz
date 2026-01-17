import Script from "next/script";

// Organization structured data
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "iaiaz",
    alternateName: "BAJURIAN SAS",
    url: "https://www.iaiaz.com",
    logo: "https://www.iaiaz.com/logo.png",
    description:
      "Intelligence Artificielle Intelligemment Accessible, Zéro engagement. Accédez aux meilleurs modèles d'IA sans abonnement.",
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
      availableLanguage: ["French"],
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
export function ProductSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "iaiaz",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Plateforme d'accès aux modèles d'IA (Claude, GPT-4, Gemini, Mistral) sans abonnement. Payez uniquement ce que vous utilisez.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: "1",
      highPrice: "100",
      offerCount: "4",
      offers: [
        {
          "@type": "Offer",
          name: "Crédits gratuits",
          price: "0",
          priceCurrency: "EUR",
          description: "1€ de crédits offerts à l'inscription",
        },
        {
          "@type": "Offer",
          name: "Pack Starter",
          price: "5",
          priceCurrency: "EUR",
          description: "5€ de crédits",
        },
        {
          "@type": "Offer",
          name: "Pack Regular",
          price: "10",
          priceCurrency: "EUR",
          description: "10€ de crédits - Le plus populaire",
        },
        {
          "@type": "Offer",
          name: "Pack Power",
          price: "20",
          priceCurrency: "EUR",
          description: "20€ de crédits",
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
    featureList: [
      "Accès à Claude, GPT-4, Gemini, Mistral",
      "Pas d'abonnement",
      "Paiement à l'usage",
      "Crédits sans expiration",
      "Interface en français",
      "Données hébergées en Europe",
    ],
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
export function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "iaiaz",
    alternateName: "iaiaz - IA Accessible",
    url: "https://www.iaiaz.com",
    description:
      "Intelligence Artificielle Intelligemment Accessible, Zéro engagement",
    inLanguage: "fr-FR",
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
