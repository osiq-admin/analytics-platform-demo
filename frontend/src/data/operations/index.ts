import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";

import { dashboardOperations } from "./dashboard";
import { entitiesOperations } from "./entities";
import { metadataOperations } from "./metadata";
import { settingsOperations } from "./settings";
import { mappingsOperations } from "./mappings";
import { editorOperations } from "./editor";
import { pipelineOperations } from "./pipeline";
import { schemaOperations } from "./schema";
import { sqlOperations } from "./sql";
import { modelsOperations } from "./models";
import { use_casesOperations } from "./use_cases";
import { dataOperations } from "./data";
import { alertsOperations } from "./alerts";
import { regulatoryOperations } from "./regulatory";
import { submissionsOperations } from "./submissions";
import { assistantOperations } from "./assistant";
import { onboardingOperations } from "./onboarding";
import { qualityOperations } from "./quality";
import { referenceOperations } from "./reference";
import { analytics_tiersOperations } from "./analytics_tiers";
import { medallionOperations } from "./medallion";
import { governanceOperations } from "./governance";
import { glossaryOperations } from "./glossary";
import { lineageOperations } from "./lineage";
import { casesOperations } from "./cases";

export const VIEW_OPERATIONS: Record<string, ViewOperations> = {
  dashboard: dashboardOperations,
  entities: entitiesOperations,
  metadata: metadataOperations,
  settings: settingsOperations,
  mappings: mappingsOperations,
  editor: editorOperations,
  pipeline: pipelineOperations,
  schema: schemaOperations,
  sql: sqlOperations,
  models: modelsOperations,
  "use-cases": use_casesOperations,
  data: dataOperations,
  alerts: alertsOperations,
  regulatory: regulatoryOperations,
  submissions: submissionsOperations,
  assistant: assistantOperations,
  onboarding: onboardingOperations,
  quality: qualityOperations,
  reference: referenceOperations,
  "analytics-tiers": analytics_tiersOperations,
  medallion: medallionOperations,
  governance: governanceOperations,
  glossary: glossaryOperations,
  lineage: lineageOperations,
  cases: casesOperations,
};
