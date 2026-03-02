import { settingsScenarios } from "./settings";
import { calculationsScenarios } from "./calculations";
import { detectionModelsScenarios } from "./detectionModels";
import { useCasesScenarios } from "./useCases";
import { entitiesScenarios } from "./entities";
import { investigationScenarios } from "./investigation";
import { adminScenarios } from "./admin";
import { pipelineScenarios } from "./pipeline";
import { governanceScenarios } from "./governance";
import { lakehouseScenarios } from "./lakehouse";
import { lineageScenarios } from "./lineage";

import type { ScenarioDefinition } from "../../stores/tourStore.ts";

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  ...settingsScenarios,
  ...calculationsScenarios,
  ...detectionModelsScenarios,
  ...useCasesScenarios,
  ...entitiesScenarios,
  ...investigationScenarios,
  ...adminScenarios,
  ...pipelineScenarios,
  ...governanceScenarios,
  ...lakehouseScenarios,
  ...lineageScenarios,
};
