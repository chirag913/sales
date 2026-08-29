import { ProspectMarket, SalesProfile, TrainingProfile } from "@/lib/types";

function marketToCountry(market: ProspectMarket): string {
  switch (market) {
    case "US":
      return "United States";
    case "UK":
      return "United Kingdom";
    case "Canada":
      return "Canada";
    case "Australia":
      return "Australia";
    case "India":
      return "India";
    default:
      return "Other";
  }
}

/**
 * Maps whatever the AI-first TrainingProfile inferred onto the underlying
 * SalesProfile, so the "Improve My Training" advanced editor (the old form)
 * reflects the AI's assumptions without a separate, duplicate data model.
 */
export function applyTrainingProfileToSalesProfile(
  training: TrainingProfile,
  existing: SalesProfile
): SalesProfile {
  return {
    ...existing,
    offer: {
      ...existing.offer,
      whatYouSell: training.service || existing.offer.whatYouSell,
    },
    targetCustomer: {
      ...existing.targetCustomer,
      jobTitle: training.icpTitles.join(", ") || existing.targetCustomer.jobTitle,
      companySize: training.companySizeRange || existing.targetCustomer.companySize,
      country: marketToCountry(training.market),
      typicalProspect: training.typicalProspect || existing.targetCustomer.typicalProspect,
    },
    salesObjective: training.salesObjective,
  };
}
