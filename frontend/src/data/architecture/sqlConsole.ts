import type { ViewTrace } from "../architectureRegistryTypes";

export const sqlConsoleSections: ViewTrace = {
  viewId: "sql",
  viewName: "SQL Console",
  route: "/sql",
  sections: [
    {
      id: "sql.query-editor",
      displayName: "Query Editor",
      viewId: "sql",
      description:
        "Monaco SQL editor with syntax highlighting and Ctrl+Enter execution. Provides direct DuckDB SQL access for ad-hoc queries.",
      files: [
        { path: "frontend/src/views/SQLConsole/index.tsx", role: "Main view layout and execution logic" },
        { path: "frontend/src/views/SQLConsole/QueryEditor.tsx", role: "Monaco editor component for SQL" },
        { path: "backend/api/query.py", role: "Executes SQL queries against DuckDB" },
      ],
      stores: [],
      apis: [
        {
          method: "POST",
          path: "/api/query/execute",
          role: "Executes arbitrary SQL and returns results",
          routerFile: "backend/api/query.py",
        },
      ],
      dataSources: [],
      technologies: [{ name: "Monaco Editor", role: "SQL code editor with syntax highlighting" }],
      metadataMaturity: "infrastructure",
      maturityExplanation:
        "Developer/analyst tool for direct SQL access. No metadata involvement in the editor itself.",
    },
    {
      id: "sql.results-grid",
      displayName: "Results Grid",
      viewId: "sql",
      description:
        "AG Grid with dynamic columns generated from SQL query results. Column definitions are created at runtime based on the result set schema.",
      files: [
        {
          path: "frontend/src/views/SQLConsole/ResultsGrid.tsx",
          role: "Dynamic AG Grid for query results",
        },
      ],
      stores: [],
      apis: [],
      dataSources: [],
      technologies: [{ name: "AG Grid", role: "Dynamic column grid from SQL results" }],
      metadataMaturity: "infrastructure",
      maturityExplanation:
        "Grid columns are dynamically created from SQL result schema. Pure infrastructure.",
    },
    {
      id: "sql.presets",
      displayName: "Query Presets",
      viewId: "sql",
      description:
        "Preset SQL query buttons providing common queries (e.g., alert summary, trade analysis). Loaded from backend preset definitions.",
      files: [
        { path: "frontend/src/views/SQLConsole/index.tsx", role: "Renders preset buttons" },
        { path: "backend/api/query.py", role: "Returns preset query definitions from metadata" },
        { path: "backend/models/query_presets.py", role: "QueryPreset Pydantic model" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/query/presets",
          role: "Returns preset queries loaded from workspace/metadata/query_presets/",
          routerFile: "backend/api/query.py",
        },
      ],
      dataSources: [
        { path: "workspace/metadata/query_presets/default.json", category: "metadata", role: "Preset query definitions" },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Preset queries are loaded from workspace/metadata/query_presets/*.json via MetadataService. New presets can be added by editing JSON — no code changes needed.",
      metadataOpportunities: [],
    },
    {
      id: "sql.chat-panel",
      displayName: "AI Chat",
      viewId: "sql",
      description:
        "AI assistant panel for SQL help. Uses the shared ChatPanel component with mock or live AI mode. Can suggest queries based on schema context.",
      files: [
        { path: "frontend/src/views/SQLConsole/index.tsx", role: "Integrates chat panel into SQL view" },
        { path: "frontend/src/views/AIAssistant/ChatPanel.tsx", role: "Shared chat UI component" },
        { path: "backend/api/ai.py", role: "AI chat endpoint (mock or live)" },
      ],
      stores: [],
      apis: [
        {
          method: "POST",
          path: "/api/ai/chat",
          role: "Processes AI chat messages",
          routerFile: "backend/api/ai.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/ai_mock_sequences.json",
          category: "config",
          role: "Mock AI response sequences for demo mode",
        },
      ],
      technologies: [],
      metadataMaturity: "mixed",
      maturityExplanation:
        "Mock sequences are metadata-like configuration, but the chat UI and AI logic are code-driven.",
      metadataOpportunities: [
        "Allow chat context prompts to reference metadata schema definitions dynamically",
      ],
    },
  ],
};
