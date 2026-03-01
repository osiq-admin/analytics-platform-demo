# Architecture Traceability Mode

## Purpose
Toggle mode that overlays architecture info icons on every view section. Clicking shows which files, APIs, stores, metadata files, data files, settings, and technologies control that section. Helps analyze adherence to "metadata first" / "configuration as metadata" concepts.

## How to Use
1. Click the **Trace** button in the top toolbar (between Scenarios and the divider)
2. Small blue **i** icons appear on every traceable section in the current view
3. Click any icon to open the Architecture Trace popup — a slide-in panel showing:
   - Source files with roles and edit hints
   - Zustand stores and their state usage
   - API endpoints with method, path, and router file
   - Metadata and data files grouped by category
   - Technologies and libraries used
   - Metadata-first maturity analysis with improvement opportunities
4. Toggle off to hide all icons

## Metadata Maturity Ratings
| Rating | Meaning | Example |
|---|---|---|
| fully-metadata-driven | 100% JSON metadata, no code changes needed | Entity fields list |
| mostly-metadata-driven | >75% metadata, minor presentation code | Settings resolution |
| mixed | Significant metadata + significant code | Alert filter toggles |
| code-driven | Primarily hardcoded, metadata could help | Trade volume chart |
| infrastructure | Framework/utility code | API client |

## Technical Details
- **Registry:** `frontend/src/data/architectureRegistry.ts` — 100 sections across 21 views + app layout
- **Maturity Distribution (M227):** 47 fully-metadata-driven (50%), 30 mostly-metadata-driven (32%), 4 mixed (4%), 5 code-driven (5%), 8 infrastructure (9%) — **81.9% metadata-driven** overall
- **Previous (M215):** 42 fully (49%), 30 mostly (35%), 2 mixed (2%), 4 code-driven (5%), 8 infrastructure (9%) — 83.7%
- **Previous (M183):** 35 fully (44%), 31 mostly (39%), 2 mixed (3%), 4 code-driven (5%), 8 infrastructure (10%) — 82.5%
- **Previous (M175):** 33 fully (43%), 31 mostly (40%), 2 mixed (3%), 3 code-driven (4%), 8 infrastructure (10%) — 83.1%
- **Previous (M172):** 31 fully (42%), 31 mostly (42%), 2 mixed (3%), 2 code-driven (3%), 8 infrastructure (11%) — 83.8%
- **Previous (M149):** 28 fully (39%), 21 mostly (30%), 5 mixed (7%), 8 code-driven (11%), 9 infrastructure (13%) — 69%
- **Store:** `frontend/src/stores/traceabilityStore.ts` — Zustand store for toggle + popup state
- **Overlay:** `frontend/src/components/TraceabilityMode/TraceOverlay.tsx` — MutationObserver scans for `data-trace` DOM attributes
- **Popup:** `frontend/src/components/TraceabilityMode/TracePopup.tsx` — 400px slide-in panel
- **Persistence:** Toggle state persists in localStorage across sessions

## Adding Trace to New Sections
1. Add `data-trace="viewId.sectionName"` attribute to the section's wrapper DOM element
2. Add the section entry to `frontend/src/data/architectureRegistry.ts`
3. Verify `metadataMaturity` rating is accurate
4. If new files/APIs/metadata involved, add them to the registry entry
