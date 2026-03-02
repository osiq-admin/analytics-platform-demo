import type { TourDefinition } from "../../stores/tourStore.ts";

import { overviewTour } from "./overview";
import { dashboardTour } from "./dashboard";
import { entitiesTour } from "./entities";
import { settingsTour } from "./settings";
import { modelsTour } from "./models";
import { alertsTour } from "./alerts";
import { sqlTour } from "./sql";
import { pipelineTour } from "./pipeline";
import { schemaTour } from "./schema";
import { mappingsTour } from "./mappings";
import { dataTour } from "./data";
import { assistantTour } from "./assistant";
import { editorTour } from "./editor";
import { regulatoryTour } from "./regulatory";
import { act1_guideTour } from "./act1_guide";
import { act2_guideTour } from "./act2_guide";
import { oobTour } from "./oob";
import { ux_featuresTour } from "./ux_features";
import { act3_guideTour } from "./act3_guide";
import { medallionTour } from "./medallion";
import { onboardingTour } from "./onboarding";
import { data_qualityTour } from "./data_quality";
import { analytics_tiersTour } from "./analytics_tiers";
import { reference_dataTour } from "./reference_data";
import { lakehouse_explorerTour } from "./lakehouse_explorer";
import { governanceTour } from "./governance";
import { glossaryTour } from "./glossary";

export const TOURS: Record<string, TourDefinition> = {
  overview: overviewTour,
  dashboard: dashboardTour,
  entities: entitiesTour,
  settings: settingsTour,
  models: modelsTour,
  alerts: alertsTour,
  sql: sqlTour,
  pipeline: pipelineTour,
  schema: schemaTour,
  mappings: mappingsTour,
  data: dataTour,
  assistant: assistantTour,
  editor: editorTour,
  regulatory: regulatoryTour,
  act1_guide: act1_guideTour,
  act2_guide: act2_guideTour,
  oob: oobTour,
  ux_features: ux_featuresTour,
  act3_guide: act3_guideTour,
  medallion: medallionTour,
  onboarding: onboardingTour,
  "data-quality": data_qualityTour,
  "analytics-tiers": analytics_tiersTour,
  "reference-data": reference_dataTour,
  "lakehouse-explorer": lakehouse_explorerTour,
  governance: governanceTour,
  glossary: glossaryTour,
};
