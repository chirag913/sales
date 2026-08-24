import { SalesProfile, TrainingProfile } from "@/lib/types";

export interface CompanyContext {
  offerLines: string[];
  factLines: string[];
}

/**
 * The truthful, non-inventable facts about the caller's company — shared
 * between the prospect prompt and the coach prompt so both stay in sync
 * with a single source of what's actually known.
 */
export function buildCompanyContext(salesProfile: SalesProfile, trainingProfile: TrainingProfile): CompanyContext {
  const offerLines = [
    `What they sell: ${salesProfile.offer.whatYouSell || trainingProfile.service}`,
    `Problem it solves: ${salesProfile.offer.problemSolved || "Not specified"}`,
    `Price: ${salesProfile.offer.price || "Not specified"}`,
    `Pricing model: ${salesProfile.offer.pricingModel || "Not specified"}`,
    `Main outcome: ${salesProfile.offer.mainOutcome || "Not specified"}`,
    `Unique selling proposition: ${salesProfile.offer.usp || "Not specified"}`,
  ];

  const proofLines = salesProfile.proof.noClientsYet
    ? ["The company is new and does not yet have clients, case studies, or results to point to."]
    : [
        salesProfile.proof.usClients && `US clients: ${salesProfile.proof.usClients}`,
        salesProfile.proof.numberOfClients && `Number of clients: ${salesProfile.proof.numberOfClients}`,
        salesProfile.proof.caseStudies && `Case studies: ${salesProfile.proof.caseStudies}`,
        salesProfile.proof.results && `Results: ${salesProfile.proof.results}`,
        salesProfile.proof.testimonials && `Testimonials: ${salesProfile.proof.testimonials}`,
        salesProfile.proof.guarantees && `Guarantees: ${salesProfile.proof.guarantees}`,
        salesProfile.proof.otherCredibility && `Other credibility: ${salesProfile.proof.otherCredibility}`,
      ].filter((line): line is string => Boolean(line));

  const factLines = [
    `Company based in: ${salesProfile.importantInfo.companyBasedIn || salesProfile.company.location || "Not specified"}`,
    `US office: ${salesProfile.importantInfo.hasUSOffice || "Not specified"}`,
    `Team location: ${salesProfile.importantInfo.teamLocation || "Not specified"}`,
    `How the service is delivered: ${salesProfile.importantInfo.deliveryMethod || "Not specified"}`,
    `Working hours / time zone: ${salesProfile.importantInfo.workingHours || "Not specified"}`,
    `Communication method: ${salesProfile.importantInfo.communicationMethod || "Not specified"}`,
    ...(proofLines.length > 0 ? proofLines : ["No proof or credibility details have been provided yet."]),
  ];

  return { offerLines, factLines };
}
