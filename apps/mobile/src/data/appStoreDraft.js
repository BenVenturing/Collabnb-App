export const appStoreDraft = {
  appName: "Collabnb",
  subtitle: "Creator x host collaboration marketplace",
  supportEmail: "support@collabnb.com",
  privacyEmail: "privacy@collabnb.com",
  supportUrl: "https://your-domain.com/support",
  privacyPolicyUrl: "https://your-domain.com/privacy",
  appDescription:
    "Collabnb connects creators with hospitality hosts for content collaborations. Browse listings, apply to stays, chat in-app, manage deliverables, and keep every collaboration organized from first outreach to final content handoff.",
  keywords:
    "creator,ugc,travel,hotel,host,collaboration,brand deals,content creator",
  ageRating: {
    target: "12+",
    notes: [
      "Draft only. Confirm in App Store Connect's questionnaire before submission.",
      "User-generated profiles, listings, photos, and direct messaging likely push this above 4+.",
      "No gambling, medical, alcohol, or explicit mature themes are represented in the current product copy.",
    ],
  },
  privacySummary: [
    {
      title: "Contact Info",
      items: [
        "Name",
        "Email address",
        "Support messages",
      ],
      purpose: "Account creation, authentication, support, and platform communication.",
    },
    {
      title: "User Content",
      items: [
        "Profile bio",
        "Portfolio links and media",
        "Listings",
        "Applications",
        "Messages",
      ],
      purpose: "Core marketplace functionality and collaboration workflows.",
    },
    {
      title: "Identifiers",
      items: [
        "Account ID",
        "Device-linked auth/session state",
      ],
      purpose: "Account management, login persistence, and abuse prevention.",
    },
    {
      title: "Usage Data",
      items: [
        "Search activity",
        "Preferences",
        "Feature interactions",
      ],
      purpose: "Product improvement, personalization, and operations.",
    },
    {
      title: "Purchases",
      items: [
        "Subscription and purchase state",
      ],
      purpose: "Unlocking paid features and restoring entitlements.",
    },
    {
      title: "Diagnostics",
      items: [
        "Crash or error reports",
        "Basic logs",
      ],
      purpose: "App stability, debugging, and support.",
    },
    {
      title: "Location",
      items: [
        "Approximate or entered location",
      ],
      purpose: "Search relevance, nearby discovery, and profile/listing context.",
    },
  ],
  submissionNotes: [
    "Support URL and Privacy Policy URL must be public web URLs before TestFlight/App Store submission.",
    "Re-check privacy labels against every production SDK, especially purchases, ads, maps, notifications, and analytics.",
    "Replace the support/privacy email addresses if Collabnb is no longer the launch brand.",
  ],
};

export default appStoreDraft;
