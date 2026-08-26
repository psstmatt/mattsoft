export const site = {
  name: "Matt Reynolds",

  throughline:
    "I turn complex, high-stakes systems into simple products — and stay hands-on until they ship.",
  status:
    "Seattle. Staff Product Designer at TikTok. 15 years across Boeing, Expedia, Uber, Meta, and TikTok.",
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
    role: "Staff Product Designer, GenAI — lead advertiser-facing designer",
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
      "The pivotal call was to stop shipping a menu of models and design a single creation loop instead.",
      "Every generative step had to answer the same four questions in the same place: what am I about to spend, what did I get, what can I change, and how do I get back. That turned a set of impressive demos into a workflow an advertiser could trust with a live campaign.",
      "I also argued down an auto-magic 'one-click ad' flow. Advertisers needed to be visibly in charge of what their brand said — the control surface was the product, not the model.",
    ],
    shipped: [
      "Public launch of Symphony Creative Studio.",
      "Custom Avatar creation and reuse, Creative Cue ideation, script-to-video assembly, inline editing, and export to ad delivery.",
      "A reusable pattern set for generative state — pending, partial, failed, regenerated, human-edited — adopted by adjacent GenAI surfaces.",
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
    headlineMetric: { value: "32", label: "reusable components replacing per-team consent builds" },
    role: "Product Designer — owner of the Consent Platform and its design library",
    problem: [
      "Every team at Meta that needed a consent experience built one. Different flows, different language, different disclosure logic, four apps, dozens of regions, and a regulatory deadline attached to each.",
      "When I took ownership, implementation covered roughly half of the design specification. The platform was real, the promise was not.",
    ],
    scope: [
      "Ownership of the consent platform surface and the component library behind it.",
      "Reconciliation of the design spec against what engineering had actually built.",
      "Partnership with Facebook, Instagram, Messenger, and WhatsApp product teams plus legal and policy.",
      "Documentation so the work continued without me in the room.",
    ],
    decision: [
      "The decision that mattered was auditing implementation before designing anything new.",
      "I catalogued the gap component by component, then derived 32 reusable components from patterns already shipping rather than inventing a fresh system. Teams adopt what looks like what they already have.",
      "I also pushed the configuration workspace — a simulator where a team could preview a consent flow per brand, surface, language, and regulation before a single line of code.",
    ],
    shipped: [
      "A 32-component consent library with specification and implementation in agreement.",
      "A configuration and preview workspace for teams building consent experiences.",
      "Downstream consent experiences live across the four apps.",
      "Handoff documentation and a decision record for continued execution.",
    ],
    result: [
      { value: "32", label: "components covering ~90% of new consent requests" },
      { value: "6 wks → 4 days", label: "typical time to stand up a compliant flow" },
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
    role: "Designer on enterprise and aircraft operations platforms",
    problem: [
      "Handing over an airplane is a coordination problem with hundreds of open items, several organizations, a customer on site, and a date that does not move.",
      "The people doing it were experts working across spreadsheets, internal tools, and email — with no single view of whether the aircraft was actually ready.",
    ],
    scope: [
      "Delivery readiness workflows, enterprise search, and internal operations platforms.",
      "Direct observation on the delivery floor with the people running the process.",
      "Information architecture for expert users who need density, not onboarding.",
    ],
    decision: [
      "I resisted simplifying the interface. Experts were not confused; they were uninformed.",
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
    years: "2019 — 2022",
    proof: "Scheduling and dispatch mechanics in a live two-sided marketplace.",
    headlineMetric: { value: "97%", label: "on-time pickup rate for reserved trips" },
    role: "Product Designer across rider and driver marketplace surfaces",
    problem: [
      "A ride booked days ahead is a promise made by a marketplace that does not exist yet. No driver is assigned, supply is a forecast, and the rider is making a flight.",
      "Shared rides, hourly rides, fleets, and multi-driver dispatch each stressed the same seam between what the rider was told and what the system could guarantee.",
    ],
    scope: [
      "Reserve rider and driver experience, shared rides, hourly rides, fleet match, dispatch, identity, and rewards surfaces.",
      "Interaction hierarchy for time-critical moments: assignment, arrival, wait, and no-show.",
    ],
    decision: [
      "I pushed the product to state its guarantee plainly and design for the failure of it.",
      "Rather than hiding marketplace uncertainty, Reserve committed to a specific window and made the recovery path — reassignment, wait time, refund — visible before it was needed.",
      "On the driver side, I argued for scheduled trips to be shown as commitments with real earnings weight, not as another queued request.",
    ],
    shipped: [
      "Uber Reserve rider booking, driver assignment, and arrival experiences.",
      "Shared and hourly ride flows, fleet match, and multi-driver dispatch interfaces.",
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
        note: "Agentic creation and review patterns for advertisers.",
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
        note: "Likeness capture, licensing, and reuse in generated video.",
        years: "2025",
      },
      {
        title: "Creative Cue",
        note: "Script ideation grounded in product and audience signals.",
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
        note: "32 reusable components across four apps.",
        years: "2023",
      },
      {
        title: "Consent Simulator",
        note: "Preview by brand, surface, language, and regulation.",
        years: "2023",
      },
    ],
  },
  {
    company: "Uber",
    items: [
      { title: "Fleet Match", note: "Fleet supply matched to demand shape.", years: "2022" },
      {
        title: "Uber Reserve",
        note: "Scheduled rides for riders and drivers.",
        years: "2020—22",
        slug: "reserve",
      },
      {
        title: "Multi-driver dispatch",
        note: "Assignment and reassignment mechanics.",
        years: "2021",
      },
      {
        title: "Hourly rides",
        note: "Time-based booking with an open destination.",
        years: "2021",
      },
      {
        title: "Identity & rewards",
        note: "Verification and loyalty surfaces.",
        years: "2019—21",
      },
      {
        title: "Shared rides",
        note: "Multi-rider routing and expectation setting.",
        years: "2019—20",
      },
    ],
  },
  {
    company: "Expedia",
    items: [
      {
        title: "Bots & Voice",
        note: "Managed a team of 5+ on conversational travel products.",
        years: "2017—19",
      },
      { title: "Trips", note: "Saved travel, itineraries, and re-engagement.", years: "2016—19" },
      {
        title: "Price change experiences",
        note: "Telling travelers what changed and what to do.",
        years: "2018",
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
  "I work as a player-coach. I shape the strategy, build the reusable system, critique the team's work, and personally design the interactions most likely to fail.",
  "I stay in it through implementation. A spec that ships at half fidelity is a spec that did not ship.",
  "I want direct customer evidence, a clearly framed decision, and an honest line between what is shipped, what is working, and what is planned.",
  "I am hands-on in Figma and in code-assisted prototyping. If the argument is about how something feels, I would rather build it than describe it.",
];

export const lookingFor: string[] = [
  "Robots and human-machine interfaces",
  "AI and agentic systems",
  "Platforms and trust",
  "Physical or operational software",
  "Marketplaces, scheduling, and commerce",
  "Code-adjacent designer-builder roles",
];
