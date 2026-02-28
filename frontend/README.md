# Frontend

React 19 + TypeScript SPA for the Analytics Platform Demo.

## Structure

```
frontend/src/
├── App.tsx                  # Root component
├── main.tsx                 # Vite entry point
├── routes.tsx               # React Router configuration (11 routes)
├── index.css                # Tailwind CSS 4 theme (dark/light CSS variables)
├── layouts/
│   ├── AppLayout.tsx        # Main shell with sidebar + toolbar + content area
│   └── Sidebar.tsx          # Navigation grouped by: Define, Ingest, Detect, Investigate, Advanced
├── components/
│   ├── Panel.tsx            # Widget panel with title bar and action buttons
│   ├── DataGrid.tsx         # AG Grid wrapper with theme integration
│   ├── DemoToolbar.tsx      # Demo controls (Reset, Step, Skip, Jump to Act)
│   ├── StatusBadge.tsx      # Color-coded status indicator
│   └── LoadingSpinner.tsx   # Loading animation
├── views/
│   ├── EntityDesigner/      # Browse entities, fields, relationships (React Flow graph)
│   ├── MetadataExplorer/    # Calculation list by layer, detail panel, DAG visualization
│   ├── SettingsManager/     # Settings list, score steps, override viewer
│   ├── MappingStudio/       # Source-to-canonical field mapping
│   ├── PipelineMonitor/     # Animated calculation DAG, progress, run button
│   ├── SchemaExplorer/      # DuckDB table/column browser
│   ├── SQLConsole/          # Monaco SQL editor, AG Grid results, preset queries
│   ├── ModelComposer/       # Detection model viewer with calc/strictness breakdown
│   ├── DataManager/         # Data table browser with live SQL preview
│   ├── RiskCaseManager/     # Alert summary grid + alert detail (score breakdown, trace)
│   └── AIAssistant/         # Chat interface, mock scenario player, query preview
├── stores/
│   ├── alertStore.ts        # Alert data and selection state
│   ├── metadataStore.ts     # Entities, calculations, detection models cache
│   ├── demoStore.ts         # Demo state and checkpoint management
│   └── pipelineStore.ts     # Pipeline execution status
├── api/
│   ├── client.ts            # Fetch wrapper for /api/* endpoints
│   └── websocket.ts         # WebSocket connection manager
└── hooks/
    └── useTheme.ts          # Dark/light theme toggle (localStorage)
```

## Views

| Route | View | Category |
|-------|------|----------|
| `/entities` | Entity Designer | Define |
| `/metadata` | Metadata Explorer | Define |
| `/settings` | Settings Manager | Configure |
| `/mappings` | Mapping Studio | Configure |
| `/pipeline` | Pipeline Monitor | Operate |
| `/schema` | Schema Explorer | Operate |
| `/sql` | SQL Console | Operate |
| `/models` | Model Composer | Compose |
| `/data` | Data Manager | Compose |
| `/alerts` | Risk Case Manager | Investigate |
| `/assistant` | AI Assistant | AI |

## Tech Stack

| Library | Purpose |
|---------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool and dev server |
| Tailwind CSS 4 | Utility-first styling with CSS variables |
| AG Grid Community | Bloomberg-grade data grids |
| TradingView Lightweight Charts | Financial price/volume charts |
| React Flow + dagre | Interactive DAG visualization |
| Monaco Editor | SQL editor with syntax highlighting |
| Recharts | Score breakdown charts |
| Zustand | Lightweight state management |
| react-router-dom | Client-side routing |
| dnd-kit | Drag-and-drop (Mapping Studio) |

## Development

```bash
# Install dependencies
npm install

# Dev server (hot reload, port 5173)
npm run dev

# Production build (output to dist/)
npm run build

# Type check
npx tsc --noEmit
```

## Theme

Bloomberg-style dark theme by default, with light mode toggle. Theme uses CSS variables defined in `index.css`:

- `--color-background` / `--color-foreground` — base colors
- `--color-surface` / `--color-border` — panel/card colors
- `--color-accent` — interactive elements (sky blue)
- `--color-destructive` / `--color-success` / `--color-warning` — status colors
