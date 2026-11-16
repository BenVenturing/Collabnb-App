export const appStoreDraft = {
  appName: "Collabnb",
  subtitle: "Creator x host collaboration marketplace",
  supportEmail: "hellocollabnb@gmail.com",
  privacyEmail: "privacy@collabnb.com",
  supportUrl: "https://collabnb.com/faq.html",
  privacyPolicyUrl: "https://collabnb.com/privacy",
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
        "Push notification token",
      ],
      purpose: "Account management and push notifications.",
    },
    {
      title: "Purchases",
      items: [
        "Subscription and purchase state",
      ],
      purpose: "Unlocking paid features and restoring entitlements.",
    },
    {
      title: "Payment Info",
      items: [
        "Host payment method on file (card brand, last 4, Stripe IDs; full card or bank details are entered on Stripe and never reach Collabnb)",
      ],
      purpose: "Charging host listing fees and collaboration payments.",
    },
  ],
  submissionNotes: [
    "Support URL and Privacy Policy URL must be public web URLs before TestFlight/App Store submission.",
    "Re-check privacy labels against every production SDK, especially purchases, ads, maps, notifications, and analytics.",
    "Replace the support/privacy email addresses if Collabnb is no longer the launch brand.",
  ],
};

export default appStoreDraft;
