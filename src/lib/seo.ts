/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PageSEOMetadata {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  ogType: 'website' | 'article';
  twitterCard: 'summary_large_image' | 'summary';
  robots: 'index, follow' | 'noindex, nofollow';
  jsonLd?: object;
}

const PRODUCTION_DOMAIN = 'https://oldletters.vercel.app';
const DEFAULT_OG_IMAGE = `${PRODUCTION_DOMAIN}/logo.png`;

export const SEO_REGISTRY: Record<string, PageSEOMetadata> = {
  landing: {
    title: 'OLD-LETTERS — Write Today. Let Tomorrow Remember.',
    description:
      'Write meaningful letters to the people who matter, seal them for the future, and deliver them when the time is right. OLD-LETTERS preserves personal messages for tomorrow.',
    canonical: `${PRODUCTION_DOMAIN}/`,
    ogTitle: 'OLD-LETTERS — Write Today. Let Tomorrow Remember.',
    ogDescription:
      'Write meaningful letters to the people who matter, seal them for the future, and deliver them when the time is right. OLD-LETTERS preserves personal messages for tomorrow.',
    ogUrl: `${PRODUCTION_DOMAIN}/`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${PRODUCTION_DOMAIN}/#organization`,
          name: 'OLD-LETTERS',
          url: `${PRODUCTION_DOMAIN}/`,
          logo: {
            '@type': 'ImageObject',
            url: `${PRODUCTION_DOMAIN}/logo.png`,
            width: 2172,
            height: 724,
            caption: 'OLD-LETTERS Official Brand Logo',
          },
          description:
            'Modern luxury digital correspondence platform for scheduled, meaningful letter delivery and personal media enclosures.',
          email: 'oldletters.mailroom@gmail.com',
        },
        {
          '@type': 'WebSite',
          '@id': `${PRODUCTION_DOMAIN}/#website`,
          url: `${PRODUCTION_DOMAIN}/`,
          name: 'OLD-LETTERS',
          description:
            'Write meaningful letters to the people who matter, seal them for the future, and deliver them when the time is right.',
          publisher: {
            '@id': `${PRODUCTION_DOMAIN}/#organization`,
          },
          inLanguage: 'en-US',
        },
        {
          '@type': 'WebPage',
          '@id': `${PRODUCTION_DOMAIN}/#webpage`,
          url: `${PRODUCTION_DOMAIN}/`,
          name: 'OLD-LETTERS — Write Today. Let Tomorrow Remember.',
          description:
            'Write meaningful letters to the people who matter, seal them for the future, and deliver them when the time is right. OLD-LETTERS preserves personal messages for tomorrow.',
          isPartOf: {
            '@id': `${PRODUCTION_DOMAIN}/#website`,
          },
          about: {
            '@id': `${PRODUCTION_DOMAIN}/#organization`,
          },
          inLanguage: 'en-US',
        },
        {
          '@type': 'WebApplication',
          '@id': `${PRODUCTION_DOMAIN}/#application`,
          name: 'OLD-LETTERS',
          url: `${PRODUCTION_DOMAIN}/`,
          applicationCategory: 'CommunicationApplication',
          operatingSystem: 'All',
          browserRequirements: 'Requires JavaScript. Requires HTML5.',
          description:
            'Modern digital correspondence desk. Compose authentic letters on curated stationery, select delivery dates, and seal them with cryptographic integrity.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'INR',
          },
        },
      ],
    },
  },

  'how-it-works': {
    title: 'How It Works — Digital Postal Protocol & FAQ · OLD-LETTERS',
    description:
      'Learn how OLD-LETTERS works: compose authentic letters, select scheduled delivery dates, optionally enclose private voice or video, and verify postal transit.',
    canonical: `${PRODUCTION_DOMAIN}/how-it-works`,
    ogTitle: 'How It Works — Digital Postal Protocol & FAQ · OLD-LETTERS',
    ogDescription:
      'Learn how OLD-LETTERS works: compose authentic letters, select scheduled delivery dates, optionally enclose private voice or video, and verify postal transit.',
    ogUrl: `${PRODUCTION_DOMAIN}/how-it-works`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Correspondence Desk',
              item: `${PRODUCTION_DOMAIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'How It Works & Postal Protocol',
              item: `${PRODUCTION_DOMAIN}/how-it-works`,
            },
          ],
        },
        {
          '@type': 'WebPage',
          '@id': `${PRODUCTION_DOMAIN}/how-it-works#webpage`,
          url: `${PRODUCTION_DOMAIN}/how-it-works`,
          name: 'How It Works — Digital Postal Protocol & FAQ · OLD-LETTERS',
          description:
            'Learn how OLD-LETTERS works: compose authentic letters, select scheduled delivery dates, optionally enclose private voice or video, and verify postal transit.',
          isPartOf: {
            '@id': `${PRODUCTION_DOMAIN}/#website`,
          },
          inLanguage: 'en-US',
        },
        {
          '@type': 'HowTo',
          name: 'How to Send a Letter with OLD-LETTERS',
          description:
            'Ten-stage protocol for composing, scheduling, sealing, and delivering intentional digital correspondence.',
          step: [
            {
              '@type': 'HowToStep',
              position: 1,
              name: 'Write a letter',
              text: 'Compose your correspondence on curated tactile stationery designed for emotional resonance.',
            },
            {
              '@type': 'HowToStep',
              position: 2,
              name: 'Choose recipient and delivery timing',
              text: 'Appoint the recipient contact details and choose an intentional transit interval (minimum 48 hours).',
            },
            {
              '@type': 'HowToStep',
              position: 3,
              name: 'Optionally add a voice or video personal message',
              text: 'Letters are free. Senders may optionally attach a private personal media enclosure (Voice Note at ₹99 or Video Note at ₹149).',
            },
            {
              '@type': 'HowToStep',
              position: 4,
              name: 'Submit payment where applicable',
              text: 'Scan the Bureau UPI QR code and submit the 12-digit transaction reference (UTR) if enclosing personal media.',
            },
            {
              '@type': 'HowToStep',
              position: 5,
              name: 'Record and preview personal message',
              text: 'Record audio or video directly in the browser studio (up to 120 seconds) and review playback.',
            },
            {
              '@type': 'HowToStep',
              position: 6,
              name: 'Submit the letter for verification',
              text: 'Post the correspondence into the encrypted postal vault with cryptographic integrity.',
            },
            {
              '@type': 'HowToStep',
              position: 7,
              name: 'Payment is reviewed',
              text: 'Bureau administrators verify the UTR against postal banking records before arrival.',
            },
            {
              '@type': 'HowToStep',
              position: 8,
              name: 'Approved personal media is delivered with the letter',
              text: 'Upon verification, personal media is bound to the letter and unlocked when the recipient opens the arrival link.',
            },
            {
              '@type': 'HowToStep',
              position: 9,
              name: 'Rejected payment results in letter-only delivery',
              text: 'If payment verification fails, the written letter itself is still faithfully delivered at the scheduled date with the enclosure excluded.',
            },
            {
              '@type': 'HowToStep',
              position: 10,
              name: 'Personal media is deleted according to retention policy',
              text: 'Unapproved media enters a 7-day grace window before automated, permanent cryptographic deletion.',
            },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What is OLD-LETTERS?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'OLD-LETTERS is a modern digital correspondence platform that restores the intentional ceremony of handwritten mail by allowing senders to compose letters, seal them in transit, and deliver them at a chosen future date.',
              },
            },
            {
              '@type': 'Question',
              name: 'How does OLD-LETTERS work?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Senders select a tactile stationery template, write their message, enter recipient contact details, choose an arrival date, optionally attach a private voice or video enclosure, and post the letter into an encrypted transit vault.',
              },
            },
            {
              '@type': 'Question',
              name: 'Who is OLD-LETTERS for?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'OLD-LETTERS is designed for anyone wishing to send thoughtful, enduring words—such as letters of love, gratitude, apology, anniversary milestones, encouragement, or letters to one’s future self.',
              },
            },
            {
              '@type': 'Question',
              name: 'How do scheduled letters work?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Senders choose an arrival timeline—either the standard 48-hour transit or a custom calendar date. The letter remains locked in the postal vault until that exact scheduled timestamp.',
              },
            },
            {
              '@type': 'Question',
              name: 'What happens after a letter is submitted?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'The letter is assigned a unique cryptographic tracking code, sealed in the database, and scheduled for arrival. The sender receives an immediate dispatch confirmation receipt.',
              },
            },
            {
              '@type': 'Question',
              name: 'How are payments verified?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Letters are completely free of charge. For optional personal media enclosures (₹99 for Voice Notes, ₹149 for Video Notes), senders submit their UPI transaction reference (UTR) after payment. Bureau administrators manually verify the UTR against postal banking records in the admin dashboard.',
              },
            },
            {
              '@type': 'Question',
              name: 'What happens when payment verification is rejected?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'If payment verification fails or is rejected, the written letter itself is still faithfully delivered at the scheduled arrival time, but the personal media attachment is safely excluded from delivery. Senders are notified, and unverified media enters a 7-day deletion grace period.',
              },
            },
            {
              '@type': 'Question',
              name: 'How do voice/video personal messages work?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Senders can record an in-browser audio or video message (up to 120 seconds) directly in the letter composer. The recording is encrypted and stored in secure cloud storage until verified and released upon arrival.',
              },
            },
            {
              '@type': 'Question',
              name: 'When does the recipient receive the letter?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'The recipient receives a delivery notification email containing their secure private arrival link at the exact scheduled arrival date and time selected by the sender.',
              },
            },
            {
              '@type': 'Question',
              name: 'How is private media handled?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'All uploaded voice and video recordings are protected behind authenticated and token-gated API endpoints, with access restricted strictly to the verified recipient upon letter arrival.',
              },
            },
          ],
        },
      ],
    },
  },

  privacy: {
    title: 'Privacy Policy & Archival Security · OLD-LETTERS',
    description:
      'Read how OLD-LETTERS protects your correspondence. End-to-end delivery tokens, tamper-evident seals, media deletion policies, and data rights.',
    canonical: `${PRODUCTION_DOMAIN}/privacy`,
    ogTitle: 'Privacy Policy & Archival Security · OLD-LETTERS',
    ogDescription:
      'Read how OLD-LETTERS protects your correspondence. End-to-end delivery tokens, tamper-evident seals, media deletion policies, and data rights.',
    ogUrl: `${PRODUCTION_DOMAIN}/privacy`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Correspondence Desk',
              item: `${PRODUCTION_DOMAIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Privacy Policy',
              item: `${PRODUCTION_DOMAIN}/privacy`,
            },
          ],
        },
        {
          '@type': 'WebPage',
          '@id': `${PRODUCTION_DOMAIN}/privacy#webpage`,
          url: `${PRODUCTION_DOMAIN}/privacy`,
          name: 'Privacy Policy & Archival Security · OLD-LETTERS',
          description:
            'Read how OLD-LETTERS protects your correspondence. End-to-end delivery tokens, tamper-evident seals, media deletion policies, and data rights.',
          isPartOf: {
            '@id': `${PRODUCTION_DOMAIN}/#website`,
          },
          inLanguage: 'en-US',
        },
      ],
    },
  },

  terms: {
    title: 'Terms of Service & Postal Trust · OLD-LETTERS',
    description:
      'Review the terms and conditions governing OLD-LETTERS. Postal trust principles, delivery scheduling, media retention policies, and user agreements.',
    canonical: `${PRODUCTION_DOMAIN}/terms`,
    ogTitle: 'Terms of Service & Postal Trust · OLD-LETTERS',
    ogDescription:
      'Review the terms and conditions governing OLD-LETTERS. Postal trust principles, delivery scheduling, media retention policies, and user agreements.',
    ogUrl: `${PRODUCTION_DOMAIN}/terms`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Correspondence Desk',
              item: `${PRODUCTION_DOMAIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Terms of Service',
              item: `${PRODUCTION_DOMAIN}/terms`,
            },
          ],
        },
        {
          '@type': 'WebPage',
          '@id': `${PRODUCTION_DOMAIN}/terms#webpage`,
          url: `${PRODUCTION_DOMAIN}/terms`,
          name: 'Terms of Service & Postal Trust · OLD-LETTERS',
          description:
            'Review the terms and conditions governing OLD-LETTERS. Postal trust principles, delivery scheduling, media retention policies, and user agreements.',
          isPartOf: {
            '@id': `${PRODUCTION_DOMAIN}/#website`,
          },
          inLanguage: 'en-US',
        },
      ],
    },
  },

  cookies: {
    title: 'Cookie & Session Storage Policy · OLD-LETTERS',
    description:
      'Understand how OLD-LETTERS uses essential cryptographic cookies and local session storage strictly for secure dispatch authentication.',
    canonical: `${PRODUCTION_DOMAIN}/cookies`,
    ogTitle: 'Cookie & Session Storage Policy · OLD-LETTERS',
    ogDescription:
      'Understand how OLD-LETTERS uses essential cryptographic cookies and local session storage strictly for secure dispatch authentication.',
    ogUrl: `${PRODUCTION_DOMAIN}/cookies`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Correspondence Desk',
              item: `${PRODUCTION_DOMAIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Cookie & Session Policy',
              item: `${PRODUCTION_DOMAIN}/cookies`,
            },
          ],
        },
        {
          '@type': 'WebPage',
          '@id': `${PRODUCTION_DOMAIN}/cookies#webpage`,
          url: `${PRODUCTION_DOMAIN}/cookies`,
          name: 'Cookie & Session Storage Policy · OLD-LETTERS',
          description:
            'Understand how OLD-LETTERS uses essential cryptographic cookies and local session storage strictly for secure dispatch authentication.',
          isPartOf: {
            '@id': `${PRODUCTION_DOMAIN}/#website`,
          },
          inLanguage: 'en-US',
        },
      ],
    },
  },

  // Private / Authenticated Routes (Explicitly Noindex)
  profile: {
    title: 'My Correspondence Bureau · OLD-LETTERS',
    description: 'Personal correspondence archive, sent letters ledger, and delivery tracking.',
    canonical: `${PRODUCTION_DOMAIN}/profile`,
    ogTitle: 'My Correspondence Bureau · OLD-LETTERS',
    ogDescription: 'Personal correspondence archive.',
    ogUrl: `${PRODUCTION_DOMAIN}/profile`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    robots: 'noindex, nofollow',
  },

  admin: {
    title: 'Admin Bureau · OLD-LETTERS',
    description: 'Administrative verification console and postal management.',
    canonical: `${PRODUCTION_DOMAIN}/admin`,
    ogTitle: 'Admin Bureau · OLD-LETTERS',
    ogDescription: 'Administrative verification console.',
    ogUrl: `${PRODUCTION_DOMAIN}/admin`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    robots: 'noindex, nofollow',
  },

  composer: {
    title: 'Compose Letter · OLD-LETTERS',
    description: 'Write an authentic letter on curated stationery and seal it for scheduled delivery.',
    canonical: `${PRODUCTION_DOMAIN}/`,
    ogTitle: 'Compose Letter · OLD-LETTERS',
    ogDescription: 'Write an authentic letter on curated stationery.',
    ogUrl: `${PRODUCTION_DOMAIN}/`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    robots: 'noindex, nofollow',
  },

  archive: {
    title: 'Letter Archive · OLD-LETTERS',
    description: 'Your preserved letters, dispatch history, and transit timeline.',
    canonical: `${PRODUCTION_DOMAIN}/profile`,
    ogTitle: 'Letter Archive · OLD-LETTERS',
    ogDescription: 'Your preserved letters and dispatch history.',
    ogUrl: `${PRODUCTION_DOMAIN}/profile`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    robots: 'noindex, nofollow',
  },

  recipient: {
    title: 'Incoming Dispatch · OLD-LETTERS',
    description: 'Unseal private correspondence held in archival trust.',
    canonical: `${PRODUCTION_DOMAIN}/`,
    ogTitle: 'Incoming Dispatch · OLD-LETTERS',
    ogDescription: 'Unseal private correspondence.',
    ogUrl: `${PRODUCTION_DOMAIN}/`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    robots: 'noindex, nofollow',
  },

  'not-found': {
    title: '404 Not Found · OLD-LETTERS',
    description: 'The requested correspondence ledger or archival dispatch could not be found.',
    canonical: `${PRODUCTION_DOMAIN}/`,
    ogTitle: '404 Not Found · OLD-LETTERS',
    ogDescription: 'The requested correspondence ledger could not be found.',
    ogUrl: `${PRODUCTION_DOMAIN}/`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    robots: 'noindex, nofollow',
  },
};

/**
 * Updates DOM head tags dynamically to maintain pristine SEO & social signals
 */
export function applySEO(view: string): void {
  if (typeof document === 'undefined') return;

  const meta = SEO_REGISTRY[view] || SEO_REGISTRY['not-found'];

  // 1. Document Title
  document.title = meta.title;

  // 2. Meta Description
  let descTag = document.querySelector('meta[name="description"]');
  if (!descTag) {
    descTag = document.createElement('meta');
    descTag.setAttribute('name', 'description');
    document.head.appendChild(descTag);
  }
  descTag.setAttribute('content', meta.description);

  // 3. Canonical URL
  let canonicalTag = document.querySelector('link[rel="canonical"]');
  if (!canonicalTag) {
    canonicalTag = document.createElement('link');
    canonicalTag.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalTag);
  }
  canonicalTag.setAttribute('href', meta.canonical);

  // 4. Robots Directives
  let robotsTag = document.querySelector('meta[name="robots"]');
  if (!robotsTag) {
    robotsTag = document.createElement('meta');
    robotsTag.setAttribute('name', 'robots');
    document.head.appendChild(robotsTag);
  }
  robotsTag.setAttribute('content', meta.robots);

  // 5. Open Graph Meta Tags
  const setMetaProperty = (property: string, content: string) => {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', property);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  setMetaProperty('og:title', meta.ogTitle);
  setMetaProperty('og:description', meta.ogDescription);
  setMetaProperty('og:url', meta.ogUrl);
  setMetaProperty('og:image', meta.ogImage);
  setMetaProperty('og:image:secure_url', meta.ogImage);
  setMetaProperty('og:image:type', 'image/png');
  setMetaProperty('og:image:width', '2172');
  setMetaProperty('og:image:height', '724');
  setMetaProperty('og:image:alt', meta.ogTitle);
  setMetaProperty('og:type', meta.ogType);
  setMetaProperty('og:site_name', 'OLD-LETTERS');
  setMetaProperty('og:locale', 'en_US');

  // 6. Twitter / X Meta Tags
  const setMetaName = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  setMetaName('twitter:title', meta.ogTitle);
  setMetaName('twitter:description', meta.ogDescription);
  setMetaName('twitter:image', meta.ogImage);
  setMetaName('twitter:image:alt', meta.ogTitle);
  setMetaName('twitter:card', meta.twitterCard);

  // 7. Dynamic JSON-LD Script for Route
  const existingDynamicSchema = document.getElementById('route-schema-json');
  if (existingDynamicSchema) {
    existingDynamicSchema.remove();
  }

  // If view is landing and root-schema-json is present, keep it pristine; otherwise inject route-schema-json
  if (meta.jsonLd && view !== 'landing') {
    const scriptTag = document.createElement('script');
    scriptTag.id = 'route-schema-json';
    scriptTag.type = 'application/ld+json';
    scriptTag.textContent = JSON.stringify(meta.jsonLd);
    document.head.appendChild(scriptTag);
  }
}
