import type { ScenarioDefinition } from "../../stores/tourStore.ts";

// Scenario Definitions — Use Cases & Submissions (S15-S18)


// ==========================================================================
// Scenario Definitions — Use Cases & Submissions (S15-S18)
// ==========================================================================

// --------------------------------------------------------------------------
// S15: Create a Use Case (Beginner, 6 min)
// --------------------------------------------------------------------------
const S15_CREATE_USE_CASE: ScenarioDefinition = {
  id: "s15_create_use_case",
  name: "Create a Use Case",
  description:
    "Walk through creating a new detection use case with the 5-step wizard — define the name, select components, enter sample data, set expected results, and save as draft.",
  category: "use_cases",
  difficulty: "beginner",
  estimatedMinutes: 6,
  steps: [
    {
      target: ".w-72",
      title: "Use Cases",
      content:
        "Welcome to Use Cases. This is where you define, test, and manage detection use cases. The left panel lists all existing use cases with their status badges (draft, ready, submitted, approved, rejected). The center area shows details or the creation wizard.",
      placement: "right",
      route: "/use-cases",
      action: "navigate",
      actionTarget: ".w-72",
      hint: "Navigate to Use Cases using the sidebar.",
      delay: 3000,
    },
    {
      target: ".w-72 .space-y-1 button:first-child",
      title: "Start Creating a New Use Case",
      content:
        "Click '+ New Use Case' to open the 5-step creation wizard. This structured flow ensures every use case has a complete definition with components, sample data, and expected results before it can be submitted for review.",
      placement: "right",
      action: "click",
      actionTarget: ".w-72 .space-y-1 button:first-child",
      hint: "Click the '+ New Use Case' button at the top of the use case list.",
      delay: 2500,
    },
    {
      target: ".space-y-3 label:first-child input",
      title: "Step 1: Describe — Name & Details",
      content:
        "Enter a name like 'Wash Trading — Same Account, Same Day' and add a description explaining what this use case tests. You can also set the author name and add tags (e.g., 'wash-trading', 'equity') to categorize the use case.",
      placement: "left",
      action: "type",
      actionTarget: ".space-y-3 label:first-child input",
      actionValue: "Wash Trading — Same Account, Same Day",
      autoFillData: {
        name: "Wash Trading — Same Account, Same Day",
        description:
          "Tests detection of wash trades where the same account buys and sells the same instrument within a single trading day.",
        author: "Demo User",
      },
      hint: "Fill in the Name field with a descriptive use case name. Add a description, author, and optional tags.",
      delay: 3500,
    },
    {
      target: "[data-action='next']",
      title: "Advance to Components",
      content:
        "Click 'Next' to proceed to Step 2: Components. The wizard validates that the name is filled before allowing you to continue.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
      hint: "Click the 'Next' button to proceed to the Components step.",
      delay: 2500,
    },
    {
      target: ".space-y-4 h4:first-of-type",
      title: "Step 2: Select Components",
      content:
        "Components are grouped by type: Detection Models, Calculations, and Settings. Click to select the components this use case should include. For a wash trading use case, select the 'Wash Trading — Full Day' detection model and related calculations like 'Self-Trade Ratio' and 'Same-Day Turnaround'.",
      placement: "left",
      action: "wait",
      hint: "Click on a detection model and 2-3 related calculations to include them in the use case.",
      delay: 4000,
    },
    {
      target: "[data-action='next']",
      title: "Advance to Sample Data",
      content:
        "Click 'Next' to proceed to Step 3: Sample Data. Here you'll define the test data that the use case will run against.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
      hint: "Click 'Next' to proceed to the Sample Data step.",
      delay: 2500,
    },
    {
      target: ".monaco-themed",
      title: "Step 3: Enter Sample Data",
      content:
        "The Monaco JSON editor lets you define sample data for each entity type. Use the entity tabs above the editor to switch between data sets (e.g., executions, orders, products). The JSON must be valid — a red parse error banner appears if the syntax is incorrect.",
      placement: "left",
      action: "wait",
      hint: "Review the sample data JSON in the editor. Switch between entity tabs to see different data sets. Edit the JSON to add or modify test records.",
      delay: 4000,
    },
    {
      target: "[data-action='next']",
      title: "Advance to Expected Results",
      content:
        "Click 'Next' to proceed to Step 4: Expected Results. This is where you define what the use case should produce when run.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
      hint: "Click 'Next' to proceed to the Expected Results step.",
      delay: 2500,
    },
    {
      target: ".space-y-4 label:first-of-type",
      title: "Step 4: Set Expected Results",
      content:
        "Toggle 'Should alerts fire?' to Yes, then set the expected alert count (e.g., 2). Add notes explaining why: 'Account A001 has 3 self-trades on 2024-01-15 with matching buy/sell patterns.' These expectations are checked when you run the use case.",
      placement: "left",
      action: "wait",
      autoFillData: {
        should_fire: "true",
        expected_alert_count: "2",
        notes: "Account A001 has 3 self-trades on 2024-01-15 with matching buy/sell patterns exceeding the wash_self_trade_ratio threshold.",
      },
      hint: "Click 'Yes' for should alerts fire, enter the expected alert count, and add notes explaining the expected outcome.",
      delay: 3500,
    },
    {
      target: "[data-action='save-use-case']",
      title: "Step 5: Review & Save",
      content:
        "The Review step shows a summary of everything you've configured — name, components, sample data, and expected results. Click 'Save Use Case' to save it as a draft. The use case will appear in the left panel with a 'draft' status badge.",
      placement: "top",
      action: "click",
      actionTarget: "[data-action='next']",
      hint: "Review the summary, then click 'Save Use Case' to save. The use case is created with 'draft' status.",
      delay: 3000,
    },
  ],
};


// --------------------------------------------------------------------------
// S16: Submit Use Case for Review (Intermediate, 5 min)
// --------------------------------------------------------------------------
const S16_SUBMIT_USE_CASE: ScenarioDefinition = {
  id: "s16_submit_use_case",
  name: "Submit Use Case for Review",
  description:
    "Take a draft use case through the review readiness flow — review its contents, verify completeness, and submit it for governance review. Verify it appears in the Submissions Queue.",
  category: "use_cases",
  difficulty: "intermediate",
  estimatedMinutes: 5,
  prerequisites: ["s15_create_use_case"],
  steps: [
    {
      target: ".w-72",
      title: "Select a Draft Use Case",
      content:
        "The use case list shows all use cases with their status badges. Look for one with a 'draft' status (gray badge). We'll take this draft through the review submission flow.",
      placement: "right",
      route: "/use-cases",
      action: "navigate",
      actionTarget: ".w-72",
      hint: "Navigate to Use Cases and identify a use case with 'draft' status.",
      delay: 3000,
    },
    {
      target: ".w-72 .space-y-1 button:nth-child(2)",
      title: "Open the Draft Use Case",
      content:
        "Click on the draft use case to view its detail panel. The center area will show the use case header with its name, status badge, description, and action buttons (Edit, Delete, Run).",
      placement: "right",
      action: "click",
      actionTarget: ".w-72 .space-y-1 button:nth-child(2)",
      hint: "Click on a draft use case in the list to view its details.",
      delay: 2500,
    },
    {
      target: ".flex-1.flex.flex-col.gap-3",
      title: "Review Use Case Contents",
      content:
        "The detail view shows everything about this use case: components (detection models, calculations, settings), sample data entities with row counts, and expected results (should fire, alert count, notes). Verify that all sections are properly configured before proceeding.",
      placement: "left",
      action: "wait",
      hint: "Read through the Components, Sample Data, and Expected Results panels. Verify the use case is complete.",
      delay: 3500,
    },
    {
      target: "[data-action='run']",
      title: "Test Before Submitting",
      content:
        "Before submitting, click 'Run' to execute the use case pipeline on its sample data. The result badge will show the number of alerts generated (e.g., '2 alerts') or an error. Compare this against the expected results to confirm the use case works correctly.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-action='run']",
      hint: "Click 'Run' to test the use case. Check that the generated alert count matches the expected results.",
      delay: 3500,
    },
    {
      target: "[data-action='edit']",
      title: "Edit to Mark as Ready",
      content:
        "To change the status from 'draft' to ready for submission, click 'Edit' to open the wizard. In a full workflow, you would update the status field to 'ready' and then save. The status badge will update to show 'ready' (blue).",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-action='edit']",
      hint: "Click 'Edit' to open the use case in the wizard. Review and confirm all fields are complete.",
      delay: 2500,
    },
    {
      target: "[data-action='save-use-case']",
      title: "Save and Submit",
      content:
        "After verifying all steps are complete, save the use case. In the full governance flow, saving a 'ready' use case triggers the submission creation. The submission will appear in the Submissions Queue (/submissions) for reviewer action.",
      placement: "top",
      action: "wait",
      hint: "Navigate through the wizard steps and click 'Save Use Case' to save. Then navigate to /submissions to verify the submission was created.",
      delay: 3000,
    },
    {
      target: ".flex-1.flex.flex-col.gap-3",
      title: "Verify in Submissions Queue",
      content:
        "Navigate to the Submissions Queue to confirm the submission was created. You should see a new row in the AG Grid with the use case name, 'pending' status, and today's date. The submission is now ready for reviewer action.",
      placement: "left",
      route: "/submissions",
      action: "navigate",
      actionTarget: ".flex-1.flex.flex-col.gap-3",
      hint: "Navigate to /submissions and look for the new submission row in the grid. Confirm it shows 'pending' status.",
      delay: 3500,
    },
  ],
};


// --------------------------------------------------------------------------
// S17: Review a Submission (Intermediate, 7 min)
// --------------------------------------------------------------------------
const S17_REVIEW_SUBMISSION: ScenarioDefinition = {
  id: "s17_review_submission",
  name: "Review a Submission",
  description:
    "Act as a governance reviewer — examine a pending submission's summary, components, auto-generated recommendations, impact analysis, write a comment, and approve or request changes.",
  category: "use_cases",
  difficulty: "intermediate",
  estimatedMinutes: 7,
  prerequisites: ["s16_submit_use_case"],
  steps: [
    {
      target: ".flex-1.flex.flex-col.gap-3 h2",
      title: "Submissions Review Queue",
      content:
        "Welcome to the Submissions Review Queue — the governance hub where submitted use cases are reviewed before deployment. The AG Grid shows all submissions with columns for ID, Name, Author, Status, Components count, and Created date.",
      placement: "bottom",
      route: "/submissions",
      action: "navigate",
      actionTarget: ".flex-1.flex.flex-col.gap-3 h2",
      hint: "Navigate to the Submissions Queue using the sidebar.",
      delay: 3000,
    },
    {
      target: ".ag-body-viewport .ag-row:first-child",
      title: "Select a Pending Submission",
      content:
        "Click on a submission row to open its detail panel below the grid. Look for one with 'pending' or 'in_review' status — these are awaiting reviewer action. The grid supports sorting and filtering by any column.",
      placement: "bottom",
      action: "click",
      actionTarget: ".ag-body-viewport .ag-row:first-child",
      hint: "Click on a submission row with 'pending' status to open its detail view.",
      validation: ".flex.border-b.border-border",
      delay: 2500,
    },
    {
      target: ".flex.border-b.border-border button:first-child",
      title: "Summary Tab",
      content:
        "The Summary tab shows the submission's name, ID, status, description, author, reviewer assignment, use case reference, component count, and timestamps. This gives you a quick overview before diving into specifics.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:first-child",
      hint: "Read the Summary tab to understand what this submission contains and who authored it.",
      delay: 3000,
    },
    {
      target: ".flex.border-b.border-border button:nth-child(2)",
      title: "Components Tab",
      content:
        "Switch to the Components tab to see every component included in this submission — detection models, calculations, settings, and entities. Each component shows its type badge, ID, action (include/create/reference), and optional configuration details.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:nth-child(2)",
      hint: "Click the 'Components' tab to review the components bundled in this submission.",
      delay: 3000,
    },
    {
      target: ".flex.border-b.border-border button:nth-child(3)",
      title: "Recommendations Tab",
      content:
        "The Recommendations tab shows auto-generated analysis produced when the submission was created. These include change classification (new vs. modified), similarity checks against existing use cases, consistency validation, and best-practice adherence. Click 'Re-run' to regenerate recommendations.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:nth-child(3)",
      hint: "Click the 'Recommendations' tab to see auto-generated analysis. Note severity badges (critical, high, medium, low).",
      delay: 3500,
    },
    {
      target: ".flex.border-b.border-border button:nth-child(5)",
      title: "Impact Tab",
      content:
        "The Impact tab shows a breakdown of component types (how many models, calculations, settings), lists referenced vs. newly created components, and displays expected results. This helps assess the scope and risk of deploying this use case.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:nth-child(5)",
      hint: "Click the 'Impact' tab to review the deployment impact analysis — component types, references, and expected results.",
      delay: 3500,
    },
    {
      target: ".border-t.border-border textarea",
      title: "Write a Review Comment",
      content:
        "In the Review Actions section at the bottom, write a comment explaining your review decision. For example: 'Components and sample data look complete. Recommendation severities are acceptable. Approved for deployment.' Comments are timestamped and attached to the submission history.",
      placement: "top",
      action: "type",
      actionTarget: ".border-t.border-border textarea",
      actionValue: "Components and sample data verified. Wash trading logic is sound. Approved for deployment.",
      hint: "Type a review comment in the text area at the bottom of the detail panel.",
      delay: 3000,
    },
    {
      target: ".border-t.border-border .flex.gap-2 button:first-child",
      title: "Approve the Submission",
      content:
        "Click 'Approve' to approve the submission for deployment. You can also 'Request Changes' (sends it back to the author) or 'Reject' (permanently declines). The status badge will update to 'approved' (green) and the comment will be logged.",
      placement: "top",
      action: "click",
      actionTarget: ".border-t.border-border .flex.gap-2 button:first-child",
      hint: "Click the 'Approve' button to approve the submission. Watch the status badge change to 'approved'.",
      delay: 3000,
    },
  ],
};


// --------------------------------------------------------------------------
// S18: Implement Feedback (Advanced, 8 min)
// --------------------------------------------------------------------------
const S18_IMPLEMENT_FEEDBACK: ScenarioDefinition = {
  id: "s18_implement_feedback",
  name: "Implement Feedback",
  description:
    "Handle a 'changes requested' submission — read reviewer comments, navigate back to Use Cases, make the requested changes, and resubmit for another review cycle.",
  category: "use_cases",
  difficulty: "advanced",
  estimatedMinutes: 8,
  prerequisites: ["s17_review_submission"],
  steps: [
    {
      target: ".ag-body-viewport",
      title: "Find a Submission with Requested Changes",
      content:
        "In the Submissions Queue, look for a submission with 'in_review' status (amber badge). This indicates a reviewer has requested changes before approval. Click on it to see the feedback.",
      placement: "bottom",
      route: "/submissions",
      action: "navigate",
      actionTarget: ".ag-body-viewport",
      hint: "Navigate to /submissions and find a submission with 'in_review' status (amber badge).",
      delay: 3000,
    },
    {
      target: ".ag-body-viewport .ag-row:first-child",
      title: "Open the Submission",
      content:
        "Click on the submission row to open its detail panel. We need to read the reviewer's comments to understand what changes are required.",
      placement: "bottom",
      action: "click",
      actionTarget: ".ag-body-viewport .ag-row:first-child",
      hint: "Click on the submission with requested changes to view its details.",
      validation: ".flex.border-b.border-border",
      delay: 2500,
    },
    {
      target: ".flex.border-b.border-border button:nth-child(4)",
      title: "Read Reviewer Comments",
      content:
        "Switch to the Comments tab to read the reviewer's feedback. Each comment shows the author, type (approval/rejection/comment), timestamp, and content. The most recent comment will explain what changes are needed — for example, 'Add more sample data for edge cases' or 'Update expected alert count'.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:nth-child(4)",
      hint: "Click the 'Comments' tab to read the reviewer's feedback. Note the specific changes requested.",
      delay: 3500,
    },
    {
      target: ".flex.border-b.border-border button:first-child",
      title: "Note the Use Case Reference",
      content:
        "Switch back to the Summary tab and note the 'Use Case' ID field. This links the submission to its source use case in Use Cases. You'll navigate there next to make the requested changes.",
      placement: "bottom",
      action: "click",
      actionTarget: ".flex.border-b.border-border button:first-child",
      hint: "Note the Use Case ID from the Summary tab. You'll need this to find the right use case to edit.",
      delay: 3000,
    },
    {
      target: ".w-72",
      title: "Navigate to Use Cases",
      content:
        "Switch to Use Cases to find and edit the original use case. The left panel lists all use cases — find the one matching the submission's use case ID.",
      placement: "right",
      route: "/use-cases",
      action: "navigate",
      actionTarget: ".w-72",
      hint: "Navigate to /use-cases and find the use case that matches the submission.",
      delay: 2500,
    },
    {
      target: ".w-72 .space-y-1 button:nth-child(2)",
      title: "Select the Use Case to Edit",
      content:
        "Click on the use case that corresponds to the submission. Its status may show 'submitted' or 'draft'. Review the current contents to understand what needs to change based on the reviewer's feedback.",
      placement: "right",
      action: "click",
      actionTarget: ".w-72 .space-y-1 button:nth-child(2)",
      hint: "Click on the use case to view its current contents before editing.",
      delay: 2500,
    },
    {
      target: "[data-action='edit']",
      title: "Enter Edit Mode",
      content:
        "Click 'Edit' to open the use case in the 5-step wizard with all fields pre-filled. Navigate to the step that needs changes — for example, Step 3 (Sample Data) to add more test records, or Step 4 (Expected Results) to update the alert count.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-action='edit']",
      hint: "Click 'Edit' to open the wizard. Navigate to the step that needs changes.",
      delay: 2500,
    },
    {
      target: ".flex-1.flex.flex-col.min-w-0",
      title: "Make the Requested Changes",
      content:
        "Apply the reviewer's requested changes. Common modifications include: adding edge-case sample data (Step 3), adjusting expected alert counts (Step 4), adding missing components (Step 2), or improving the description (Step 1). Use the 'Back' and 'Next' buttons to navigate between steps.",
      placement: "left",
      action: "wait",
      hint: "Make the changes requested by the reviewer. Navigate between wizard steps using Back/Next.",
      delay: 4000,
    },
    {
      target: "[data-action='save-use-case']",
      title: "Save the Updated Use Case",
      content:
        "After making all requested changes, navigate to Step 5 (Review & Save) and click 'Save Use Case'. The updated use case will be saved and can be resubmitted. In the governance flow, saving triggers a new submission that replaces the previous one.",
      placement: "top",
      action: "wait",
      hint: "Navigate to the final step and click 'Save Use Case' to save your changes.",
      delay: 3000,
    },
    {
      target: ".flex-1.flex.flex-col.gap-3 h2",
      title: "Verify Resubmission",
      content:
        "Navigate back to the Submissions Queue to verify the updated submission. You should see a new or updated entry with 'pending' status, reflecting the changes you made. The reviewer can now re-evaluate the submission with the improvements applied.",
      placement: "bottom",
      route: "/submissions",
      action: "navigate",
      actionTarget: ".flex-1.flex.flex-col.gap-3 h2",
      hint: "Navigate to /submissions and verify the updated submission appears with 'pending' status.",
      delay: 3500,
    },
  ],
};

export const useCasesScenarios: Record<string, ScenarioDefinition> = {
  s15_create_use_case: S15_CREATE_USE_CASE,
  s16_submit_use_case: S16_SUBMIT_USE_CASE,
  s17_review_submission: S17_REVIEW_SUBMISSION,
  s18_implement_feedback: S18_IMPLEMENT_FEEDBACK,
};
