import type { TourDefinition } from "../../stores/tourStore.ts";


export const onboardingTour: TourDefinition = {
  id: "onboarding",
  name: "Data Onboarding",
  description: "Walk through the guided data onboarding wizard — upload files, auto-detect schema, profile data quality, and map to canonical entities.",
  steps: [
    {
      target: "[data-tour='onboarding-wizard']",
      title: "Onboarding Wizard",
      content: "The 5-step wizard guides you through uploading data files, detecting their schema, profiling quality, mapping to entities, and confirming ingestion to the Landing tier.",
      route: "/onboarding",
    },
    {
      target: "[data-tour='onboarding-schema']",
      title: "Schema Detection",
      content: "After uploading a file, the system auto-detects column names, types, and patterns (ISIN, MIC, ISO8601, etc.) using PyArrow inference.",
      route: "/onboarding",
    },
    {
      target: "[data-tour='onboarding-profile']",
      title: "Data Profile",
      content: "The profiler analyzes completeness, null rates, distinct counts, min/max values, and overall quality score for every column.",
      route: "/onboarding",
    },
  ],
};
