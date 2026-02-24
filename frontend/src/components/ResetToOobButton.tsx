import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog.tsx";
import HelpButton from "./HelpButton.tsx";

interface ResetToOobButtonProps {
  itemType: string;
  itemId: string;
  onReset: () => void;
  visible: boolean;
}

export default function ResetToOobButton({ itemType: _itemType, itemId, onReset, visible }: ResetToOobButtonProps) {
  void _itemType;
  const [confirm, setConfirm] = useState(false);

  if (!visible) return null;

  return (
    <>
      <span className="inline-flex items-center gap-1" data-tour="reset-to-oob">
        <button
          onClick={() => setConfirm(true)}
          className="px-3 py-1.5 rounded text-xs font-medium border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
        >
          Reset to OOB
        </button>
        <HelpButton
          text="Discard your customizations and restore the original out-of-box definition."
          placement="top"
        />
      </span>

      <ConfirmDialog
        open={confirm}
        title="Reset to OOB"
        message={`Reset "${itemId}" to its original out-of-box definition? Your customizations will be discarded.`}
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() => {
          setConfirm(false);
          onReset();
        }}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
