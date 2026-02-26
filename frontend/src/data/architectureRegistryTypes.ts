// ==========================================================================
// Architecture Traceability — Type Definitions
// ==========================================================================

/** Categorizes how metadata-driven a section is */
export type MetadataMaturity =
  | "fully-metadata-driven"
  | "mostly-metadata-driven"
  | "mixed"
  | "code-driven"
  | "infrastructure";

/** A single file reference with its role in the section */
export interface FileReference {
  path: string;
  role: string;
  editHint?: string;
}

/** An API endpoint used by the section */
export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "WS";
  path: string;
  role: string;
  routerFile: string;
}

/** A metadata or data file feeding the section */
export interface DataSource {
  path: string;
  category: "metadata" | "data" | "settings" | "config" | "results";
  role: string;
  editHint?: string;
}

/** Technology used for rendering/interaction */
export interface TechDependency {
  name: string;
  role: string;
}

/** A Zustand store dependency */
export interface StoreDependency {
  name: string;
  path: string;
  role: string;
}

/** Full traceability entry for one identifiable section */
export interface TraceableSection {
  id: string;
  displayName: string;
  viewId: string;
  description: string;
  files: FileReference[];
  stores: StoreDependency[];
  apis: ApiEndpoint[];
  dataSources: DataSource[];
  technologies: TechDependency[];
  metadataMaturity: MetadataMaturity;
  maturityExplanation: string;
  metadataOpportunities?: string[];
}

/** View-level grouping of traceable sections */
export interface ViewTrace {
  viewId: string;
  viewName: string;
  route: string;
  sections: TraceableSection[];
}
