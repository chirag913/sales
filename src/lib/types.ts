export type SalesObjective =
  | "book_meeting"
  | "book_demo"
  | "qualify_prospect"
  | "make_sale";

export const SALES_OBJECTIVE_OPTIONS: { value: SalesObjective; label: string }[] = [
  { value: "book_meeting", label: "Book a meeting" },
  { value: "book_demo", label: "Book a demo" },
  { value: "qualify_prospect", label: "Qualify prospect" },
  { value: "make_sale", label: "Make sale" },
];

export interface SalesProfile {
  company: {
    name: string;
    location: string;
    website: string;
    yearsOperating: string;
    teamSize: string;
  };
  offer: {
    whatYouSell: string;
    problemSolved: string;
    price: string;
    pricingModel: string;
    mainOutcome: string;
    usp: string;
  };
  targetCustomer: {
    industry: string;
    companySize: string;
    jobTitle: string;
    country: string;
    typicalProspect: string;
  };
  proof: {
    usClients: string;
    numberOfClients: string;
    caseStudies: string;
    results: string;
    testimonials: string;
    guarantees: string;
    otherCredibility: string;
  };
  salesObjective: SalesObjective;
  importantInfo: {
    companyBasedIn: string;
    hasUSOffice: string;
    teamLocation: string;
    deliveryMethod: string;
    workingHours: string;
    communicationMethod: string;
  };
}

export function emptySalesProfile(): SalesProfile {
  return {
    company: { name: "", location: "", website: "", yearsOperating: "", teamSize: "" },
    offer: { whatYouSell: "", problemSolved: "", price: "", pricingModel: "", mainOutcome: "", usp: "" },
    targetCustomer: { industry: "", companySize: "", jobTitle: "", country: "United States", typicalProspect: "" },
    proof: {
      usClients: "",
      numberOfClients: "",
      caseStudies: "",
      results: "",
      testimonials: "",
      guarantees: "",
      otherCredibility: "",
    },
    salesObjective: "book_meeting",
    importantInfo: {
      companyBasedIn: "",
      hasUSOffice: "",
      teamLocation: "",
      deliveryMethod: "",
      workingHours: "",
      communicationMethod: "",
    },
  };
}
