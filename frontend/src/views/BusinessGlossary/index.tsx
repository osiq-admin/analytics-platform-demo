import { useState } from "react";
import { TermsTab } from "./TermsTab.tsx";
import { MetricsTab } from "./MetricsTab.tsx";
import { DMBOKTab } from "./DMBOKTab.tsx";
import { OwnershipTab } from "./OwnershipTab.tsx";
import { StandardsTab } from "./StandardsTab.tsx";

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type ViewTab = "terms" | "metrics" | "dmbok" | "ownership" | "standards";

const TABS: { key: ViewTab; label: string }[] = [
  { key: "terms", label: "Business Terms" },
  { key: "metrics", label: "Semantic Metrics" },
  { key: "dmbok", label: "DAMA-DMBOK" },
  { key: "ownership", label: "Ownership" },
  { key: "standards", label: "Standards & Gaps" },
];

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export default function BusinessGlossary() {
  const [activeTab, setActiveTab] = useState<ViewTab>("terms");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Business Glossary</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "terms" && <TermsTab />}
        {activeTab === "metrics" && <MetricsTab />}
        {activeTab === "dmbok" && <DMBOKTab />}
        {activeTab === "ownership" && <OwnershipTab />}
        {activeTab === "standards" && <StandardsTab />}
      </div>
    </div>
  );
}
