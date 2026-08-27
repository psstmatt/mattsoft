export const site = {
  name: "Matt Reynolds",

  throughline:
    "I design trustworthy products for complex AI, platform, and operational systems — and stay hands-on until they ship.",
  status:
    "Staff Product Designer leading advertiser-facing GenAI work at TikTok. Previously Meta, Uber, Expedia, and Boeing.",
  contact: [
    { label: "Email", value: "mr@hey.com", href: "mailto:mr@hey.com" },
    {
      label: "LinkedIn",
      value: "linkedin.com/in/psstmatt",
      href: "https://linkedin.com/in/psstmatt",
    },
    { label: "TikTok", value: "@psttmatt", href: "https://tiktok.com/@psttmatt" },
    { label: "Calendar", value: "cal.com/psstmatt", href: "https://cal.com/psstmatt" },
  ],
} as const;

export type CaseStudy = {
  slug: string;
  company: string;
  title: string;
  years: string;
  proof: string;
  headlineMetric: { value: string; label: string };
  role: string;
  problem: string[];
  scope: string[];
  decision: string[];
  shipped: CaseStudyListItem[];
  recognition?: CaseStudyListItem[];
  result: { value: string; label: string }[];
  resultNote: string;
};

export type CaseStudyListItem = string | { text: string; href: string };

export const cases: CaseStudy[] = [
  {
    slug: "symphony",
    company: "TikTok / ByteDance",
    title: "Symphony Creative Studio",
    years: "2024 — 2026",
    proof: "Zero-to-one multimodal AI creation for advertisers and creators.",
    headlineMetric: { value: "$23", label: "cost per finished avatar spot, down from ~$300" },
    role: "Staff Product Designer, GenAI",
    problem: [
      "Making platform-native video advertising is expensive, slow, and unfamiliar. An advertiser arrives with a product page and a budget, not a script, a face, a voice, or an edit.",
      "The underlying models could already generate scripts, avatars, voice, images, and video. None of that was a product. Capability was scattered across demos with no shared notion of intent, review, control, or recovery.",
    ],
    scope: [
      "Product model and interaction design for the end-to-end generation → review → edit → export loop.",
      "Custom Avatars, Creative Cue scripting, voice, image and video generation surfaces.",
      "The system-level behavior nobody owns by default: progress, partial failure, regeneration cost, and human override.",
      "Player-coach: I set the pattern language and personally designed the highest-risk interactions.",
    ],
    decision: [
      "I led the shift from a menu of model demos to one guided creation loop.",
      "Every generative step had to answer the same four questions in the same place: what am I about to spend, what did I get, what can I change, and how do I get back. That turned a set of impressive demos into a workflow an advertiser could trust with a live campaign.",
      "I made review checkpoints and human override part of the interaction model instead of hiding them behind a one-click promise. Advertisers needed to remain visibly in charge of what their brand said; the control surface was the product, not the model.",
    ],
    shipped: [
      "Public launch of Symphony Creative Studio.",
      "Custom Avatar creation and reuse, Creative Cue ideation, script-to-video assembly, inline editing, and export to ad delivery.",
      "A reusable pattern set for generative state — pending, partial, failed, regenerated, human-edited — adopted by adjacent GenAI surfaces.",
    ],
    recognition: [
      {
        text: "iF Design recognition for TikTok Symphony AI Creative Studio.",
        href: "https://ifdesign.com/en/winner-ranking/project/tiktok-symphony-ai-creative-studio/749032",
      },
    ],
    result: [
      { value: "#1", label: "most-used feature in the suite (Custom Avatars)" },
      {
        value: "60%",
        label: "reduction in cost per install for campaigns using generated creative",
      },
      { value: "92%", label: "drop in production cost per avatar spot" },
      { value: "$3.3M", label: "attributed revenue in the first year" },
    ],
    resultNote: "Figures reflect internal reporting for the advertiser-facing surfaces I led.",
  },
  {
    slug: "consent",
    company: "Meta",
    title: "Consent Platform & Design Library",
    years: "2022 — 2024",
    proof: "Reusable consent infrastructure across Facebook, Instagram, Messenger, WhatsApp.",
    headlineMetric: { value: "6 wks → 4 days", label: "typical time to launch a compliant flow" },
    role: "Staff Product Designer, Privacy",
    problem: [
      "Every team at Meta that needed a consent experience built one. Different flows, different language, different disclosure logic, four apps, dozens of regions, and a regulatory deadline attached to each.",
      "When I took ownership, implementation covered roughly half of the design specification. The platform was real, the promise was not.",
    ],
    scope: [
      "Ownership of the Consent Platform, Consent Simulator, and the design system behind both.",
      "Reconciliation of the design spec against what engineering had actually built.",
      "Partnership with Facebook, Instagram, Messenger, and WhatsApp product teams plus legal and policy.",
      "Documentation so the work continued without me in the room.",
    ],
    decision: [
      "The decision that mattered was auditing implementation before designing anything new.",
      "I catalogued the gap component by component, then derived 32 reusable components from validated patterns already shipping rather than inventing a fresh system. That gave product teams a familiar path onto shared infrastructure.",
      "I defined the configuration workspace with engineering, legal, and policy partners so teams could preview a consent flow by brand, surface, language, and regulation before implementation.",
    ],
    shipped: [
      "A 32-component consent library with specification and implementation in agreement.",
      "A configuration and preview workspace for teams building consent experiences.",
      "Downstream consent experiences live across the four apps.",
      "Handoff documentation and a decision record for continued execution.",
    ],
    result: [
      { value: "6 wks → 4 days", label: "typical time to stand up a compliant flow" },
      { value: "32", label: "components covering ~90% of new consent requests" },
      { value: "4", label: "apps on shared consent infrastructure" },
      { value: "100%", label: "spec-to-implementation parity at handoff, from ~50%" },
    ],
    resultNote: "Internal platform metrics; specifics generalized for public description.",
  },
  {
    slug: "deliveries",
    company: "Boeing",
    title: "Aircraft Deliveries & Enterprise Operations",
    years: "2010 — 2016",
    proof: "Expert workflows where a mistake costs a delivery slot, not a click.",
    headlineMetric: { value: "31%", label: "faster delivery readiness reviews" },
    role: "Front End Developer",
    problem: [
      "Handing over an airplane is a coordination problem with hundreds of open items, several organizations, a customer on site, and a date that does not move.",
      "The people doing it were experts working across spreadsheets, internal tools, and email, but fragmented visibility made it difficult to know whether the aircraft was actually ready.",
    ],
    scope: [
      "Delivery readiness workflows, enterprise search, and internal operations platforms.",
      "Direct observation on the delivery floor with the people running the process.",
      "Information architecture for expert users who need density, not onboarding.",
    ],
    decision: [
      "The work required clearer information architecture without reducing the information density experts relied on.",
      "The design brief became a single authoritative readiness view — every open item, its owner, its blocking relationship, and its effect on the date — dense on purpose and scannable in seconds.",
      "Exceptions were promoted to first-class objects instead of being buried in comments, which is where the real coordination cost lived.",
    ],
    shipped: [
      "A delivery readiness view used in live handover reviews.",
      "Cross-system enterprise search for operations records.",
      "Reusable patterns for exception handling in high-consequence internal tools.",
    ],
    result: [
      { value: "31%", label: "faster readiness reviews" },
      { value: "1 view", label: "replaced 5 tools and a spreadsheet in the review meeting" },
      { value: "40%", label: "fewer escalations reaching program leadership" },
    ],
    resultNote: "Internal operations reporting.",
  },
  {
    slug: "reserve",
    company: "Uber",
    title: "Reserve, Dispatch & Marketplace Systems",
    years: "2017 — 2022",
    proof: "Scheduling and dispatch mechanics in a live two-sided marketplace.",
    headlineMetric: { value: "97%", label: "on-time pickup rate for reserved trips" },
    role: "Senior Product Designer",
    problem: [
      "A ride booked days ahead is a promise made by a marketplace that does not exist yet. No driver is assigned, supply is a forecast, and the rider is making a flight.",
      "Fleet matching and multi-driver dispatch exposed the seam between what a rider was promised and what the marketplace could guarantee. That foundation later unlocked Reserve, Hourly, Intercity, and Rentals.",
    ],
    scope: [
      "Fleet Match, multi-driver dispatch, Reserve, Hourly, Intercity, Rentals, and later identity and rewards surfaces.",
      "Interaction hierarchy for time-critical moments: assignment, arrival, wait, and no-show.",
    ],
    decision: [
      "I framed the experience around two linked commitments: state the pickup promise plainly and make recovery equally clear when the marketplace could not keep it.",
      "Rather than hiding marketplace uncertainty, Reserve committed to a specific window and made the recovery path — reassignment, wait time, refund — visible before it was needed.",
      "On the driver side, I designed scheduled trips as commitments with visible timing and earnings weight, rather than treating them as another queued request.",
    ],
    shipped: [
      "Uber Reserve rider booking, driver assignment, and arrival experiences.",
      "Fleet Match and multi-driver dispatch foundations, followed by Hourly, Intercity, and Rentals experiences.",
      "A shared vocabulary for marketplace certainty used across scheduling surfaces.",
    ],
    result: [
      { value: "97%", label: "on-time pickup for reserved trips" },
      { value: "2.4×", label: "reserved trip volume year over year" },
      { value: "22%", label: "fewer support contacts per reserved trip" },
    ],
    resultNote: "Program metrics from launch reporting.",
  },
];

const caseOrder = ["symphony", "consent", "reserve", "deliveries"];

cases.sort((a, b) => caseOrder.indexOf(a.slug) - caseOrder.indexOf(b.slug));

export type CatalogGroup = {
  company: string;
  items: { title: string; note: string; years: string; slug?: string }[];
};

export const catalog: CatalogGroup[] = [
  {
    company: "TikTok / ByteDance",
    items: [
      {
        title: "AI agent surfaces",
        note: "A Symphony program contribution: agentic creation and review patterns for advertisers.",
        years: "2025—26",
      },
      {
        title: "Symphony Creative Studio",
        note: "Multimodal AI ad creation, end to end.",
        years: "2024—26",
        slug: "symphony",
      },
      {
        title: "Custom Avatars",
        note: "A Symphony capability for likeness capture, licensing, and reuse in generated video.",
        years: "2025",
      },
      {
        title: "Creative Cue",
        note: "A Symphony capability for script ideation grounded in product and audience signals.",
        years: "2025",
      },
    ],
  },
  {
    company: "Meta",
    items: [
      {
        title: "Consent Platform",
        note: "Configuration, preview, and launch of consent flows.",
        years: "2022—24",
        slug: "consent",
      },
      {
        title: "Consent Design Library",
        note: "The reusable component system within the Consent Platform program.",
        years: "2023",
      },
      {
        title: "Consent Simulator",
        note: "The Consent Platform workspace for preview by brand, surface, language, and regulation.",
        years: "2023",
      },
    ],
  },
  {
    company: "Uber",
    items: [
      {
        title: "Identity & rewards",
        note: "Final tenure chapter: verification and loyalty surfaces.",
        years: "2021—22",
      },
      {
        title: "Rentals",
        note: "Rental-car access built on the marketplace platform.",
        years: "2021—22",
      },
      {
        title: "Intercity",
        note: "Longer-distance booking and marketplace expectations.",
        years: "2021—22",
      },
      {
        title: "Hourly rides",
        note: "Time-based booking with an open destination.",
        years: "2020",
      },
      {
        title: "Uber Reserve",
        note: "Scheduled rides for riders and drivers.",
        years: "2020—21",
        slug: "reserve",
      },
      {
        title: "Multi-driver dispatch",
        note: "Assignment and reassignment mechanics that unlocked later booking products.",
        years: "2019",
      },
      {
        title: "Fleet Match",
        note: "First Uber program: fleet supply matched to demand shape.",
        years: "2017—18",
      },
    ],
  },
  {
    company: "Expedia",
    items: [
      {
        title: "Bots & Voice",
        note: "Managed a team of 5+ on conversational travel products.",
        years: "2016—17",
      },
      { title: "Trips", note: "Saved travel, itineraries, and re-engagement.", years: "2016—17" },
      {
        title: "Price change experiences",
        note: "Telling travelers what changed and what to do.",
        years: "2016—17",
      },
    ],
  },
  {
    company: "Boeing",
    items: [
      {
        title: "Aircraft deliveries",
        note: "Readiness review and handover workflows.",
        years: "2013—16",
        slug: "deliveries",
      },
      {
        title: "Internal platforms",
        note: "Expert tooling for manufacturing operations.",
        years: "2010—16",
      },
      {
        title: "Enterprise search",
        note: "Cross-system record retrieval for operations.",
        years: "2012",
      },
    ],
  },
];

export const howIWork: string[] = [
  "I work as a player-coach: shaping product strategy and reusable systems while personally designing the interactions with the most risk.",
  "I stay close to engineering through implementation, using prototypes and working software to resolve questions that a specification cannot.",
  "I ground decisions in direct customer evidence and keep a clear line between what shipped, what is working, and what remains a hypothesis.",
  "I use critique to raise the quality of the whole team, then stay accountable for the details that determine whether the product earns trust.",
];

export const homeHowIWork: string[] = [
  "I turn ambiguous capabilities into a product model the team can build: the promise, the decisions, the failure states, and the reusable patterns behind them.",
  "Then I stay close to the work through prototype, implementation, and launch so the experience people use matches the one we intended.",
];

export const lookingFor: string[] = [
  "AI, agents, and human-machine systems where trust depends on clear control and recovery.",
  "Operational platforms and marketplaces where software has to make a real-world promise.",
];
