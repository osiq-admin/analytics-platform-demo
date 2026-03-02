import type { TraceableSection, ViewTrace } from "../architectureRegistryTypes";

import { dashboardSections } from "./dashboard";
import { entityDesignerSections } from "./entityDesigner";
import { metadataExplorerSections } from "./metadataExplorer";
import { settingsManagerSections } from "./settingsManager";
import { mappingStudioSections } from "./mappingStudio";
import { pipelineMonitorSections } from "./pipelineMonitor";
import { schemaExplorerSections } from "./schemaExplorer";
import { sqlConsoleSections } from "./sqlConsole";
import { modelComposerSections } from "./modelComposer";
import { dataManagerSections } from "./dataManager";
import { useCaseStudioSections } from "./useCaseStudio";
import { riskCaseManagerSections } from "./riskCaseManager";
import { aiAssistantSections } from "./aiAssistant";
import { metadataEditorSections } from "./metadataEditor";
import { regulatoryMapSections } from "./regulatoryMap";
import { submissionsSections } from "./submissions";
import { crossCuttingSections } from "./crossCutting";
import { medallionOverviewSections } from "./medallionOverview";
import { dataOnboardingSections } from "./dataOnboarding";
import { dataQualitySections } from "./dataQuality";
import { referenceDataSections } from "./referenceData";
import { dataGovernanceSections } from "./dataGovernance";
import { businessGlossarySections } from "./businessGlossary";
import { dataLineageSections } from "./dataLineage";
import { caseManagementSections } from "./caseManagement";

export const VIEW_TRACES: ViewTrace[] = [
  dashboardSections,
  entityDesignerSections,
  metadataExplorerSections,
  settingsManagerSections,
  mappingStudioSections,
  pipelineMonitorSections,
  schemaExplorerSections,
  sqlConsoleSections,
  modelComposerSections,
  dataManagerSections,
  useCaseStudioSections,
  riskCaseManagerSections,
  aiAssistantSections,
  metadataEditorSections,
  regulatoryMapSections,
  submissionsSections,
  crossCuttingSections,
  medallionOverviewSections,
  dataOnboardingSections,
  dataQualitySections,
  referenceDataSections,
  dataGovernanceSections,
  businessGlossarySections,
  dataLineageSections,
  caseManagementSections,
];

// ---------------------------------------------------------------------------
// Flat lookup helpers
// ---------------------------------------------------------------------------

const _sectionMap = new Map<string, TraceableSection>();

function _rebuildMap() {
  _sectionMap.clear();
  for (const vt of VIEW_TRACES) {
    for (const s of vt.sections) {
      _sectionMap.set(s.id, s);
    }
  }
}

/** Look up a single section by its data-trace ID */
export function getTraceSection(id: string): TraceableSection | undefined {
  if (_sectionMap.size === 0 && VIEW_TRACES.length > 0) _rebuildMap();
  return _sectionMap.get(id);
}

/** Get all sections for a given view ID */
export function getViewSections(viewId: string): TraceableSection[] {
  const vt = VIEW_TRACES.find((v) => v.viewId === viewId);
  return vt?.sections ?? [];
}
