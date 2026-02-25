import { useState, useMemo, useRef, useCallback, type KeyboardEvent } from "react";
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  useListNavigation,
  offset,
  flip,
  shift,
  size,
  FloatingPortal,
  FloatingFocusManager,
} from "@floating-ui/react";
import { clsx } from "clsx";
import { useDomainValues } from "../hooks/useDomainValues.ts";
import LoadingSpinner from "./LoadingSpinner.tsx";

interface SuggestionInputProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  entityId?: string;
  fieldName?: string;
  suggestions?: string[];
  placeholder?: string;
  label?: string;
  tooltip?: string;
  allowFreeform?: boolean;
  freeformWarning?: string;
  multiSelect?: boolean;
  groupLabels?: { metadata?: string; data?: string };
  className?: string;
  disabled?: boolean;
}

interface SuggestionGroup {
  label: string;
  items: string[];
}

export default function SuggestionInput({
  value,
  onChange,
  entityId,
  fieldName,
  suggestions: manualSuggestions,
  placeholder = "Type to search...",
  label,
  tooltip,
  allowFreeform = true,
  freeformWarning = "Value not in known set",
  multiSelect = false,
  groupLabels,
  className,
  disabled = false,
}: SuggestionInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [freeformValues, setFreeformValues] = useState<Set<string>>(new Set());
  const listRef = useRef<(HTMLElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch domain values from API (skipped if manual suggestions provided)
  const domain = useDomainValues(
    manualSuggestions ? undefined : entityId,
    manualSuggestions ? undefined : fieldName,
  );

  // Build flat item list and groups for display
  const { groups, flatItems } = useMemo(() => {
    const metaLabel = groupLabels?.metadata ?? "Defined Values";
    const dataLabel = groupLabels?.data ?? "Found in Data";

    if (manualSuggestions) {
      const filtered = inputValue
        ? manualSuggestions.filter((s) =>
            s.toLowerCase().includes(inputValue.toLowerCase()),
          )
        : manualSuggestions;
      return {
        groups: [{ label: "", items: filtered }] as SuggestionGroup[],
        flatItems: filtered,
      };
    }

    // For large cardinality, server handles the search
    const filterFn =
      domain.cardinality === "large"
        ? (_s: string) => true
        : inputValue
          ? (s: string) => s.toLowerCase().includes(inputValue.toLowerCase())
          : (_s: string) => true;

    const metaItems = domain.metadataValues.filter(filterFn);
    const dataItems = domain.dataValues.filter(filterFn);

    const resultGroups: SuggestionGroup[] = [];
    const flat: string[] = [];

    if (metaItems.length > 0) {
      resultGroups.push({ label: metaLabel, items: metaItems });
      flat.push(...metaItems);
    }
    if (dataItems.length > 0) {
      resultGroups.push({ label: dataLabel, items: dataItems });
      flat.push(...dataItems);
    }

    // If no grouped items, fallback to combined
    if (flat.length === 0 && domain.combined.length > 0) {
      const filteredCombined = domain.combined.filter(filterFn);
      if (filteredCombined.length > 0) {
        resultGroups.push({ label: "", items: filteredCombined });
        flat.push(...filteredCombined);
      }
    }

    return { groups: resultGroups, flatItems: flat };
  }, [manualSuggestions, domain, inputValue, groupLabels]);

  // Floating UI setup
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
          });
        },
        padding: 8,
      }),
    ],
  });

  const click = useClick(context, { event: "mousedown" });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "listbox" });
  const listNav = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    virtual: true,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    role,
    listNav,
  ]);

  // Selected values as array (normalized)
  const selectedArray = useMemo<string[]>(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );

  const isSelected = useCallback(
    (item: string) => selectedArray.includes(item),
    [selectedArray],
  );

  const isFreeform = useCallback(
    (item: string) => freeformValues.has(item),
    [freeformValues],
  );

  const allKnownValues = useMemo(() => {
    if (manualSuggestions) return new Set(manualSuggestions);
    return new Set([
      ...domain.metadataValues,
      ...domain.dataValues,
      ...domain.combined,
    ]);
  }, [manualSuggestions, domain]);

  // Handlers
  const selectItem = useCallback(
    (item: string) => {
      if (multiSelect) {
        const arr = Array.isArray(value) ? value : value ? [value] : [];
        if (arr.includes(item)) {
          onChange(arr.filter((v) => v !== item));
        } else {
          onChange([...arr, item]);
        }
      } else {
        onChange(item);
        setOpen(false);
        setInputValue("");
      }
    },
    [multiSelect, value, onChange],
  );

  const removeChip = useCallback(
    (item: string) => {
      if (multiSelect && Array.isArray(value)) {
        onChange(value.filter((v) => v !== item));
        setFreeformValues((prev) => {
          const next = new Set(prev);
          next.delete(item);
          return next;
        });
      }
    },
    [multiSelect, value, onChange],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (!open) setOpen(true);

    // For large cardinality, trigger server-side search
    if (domain.cardinality === "large") {
      domain.setSearch(val);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex !== null && flatItems[activeIndex]) {
        selectItem(flatItems[activeIndex]);
        setInputValue("");
        setActiveIndex(null);
      } else if (inputValue.trim()) {
        const trimmed = inputValue.trim();
        if (allKnownValues.has(trimmed)) {
          selectItem(trimmed);
          setInputValue("");
        } else if (allowFreeform) {
          setFreeformValues((prev) => new Set(prev).add(trimmed));
          selectItem(trimmed);
          setInputValue("");
        }
        // If !allowFreeform and not in known values, do nothing
      }
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      multiSelect &&
      selectedArray.length > 0
    ) {
      // Remove last chip on backspace when input empty
      removeChip(selectedArray[selectedArray.length - 1]);
    }
  };

  const clearAll = () => {
    onChange(multiSelect ? [] : "");
    setInputValue("");
    setFreeformValues(new Set());
  };

  const showLargeHint =
    domain.cardinality === "large" && !inputValue && flatItems.length === 0;

  // Build list item index for ref mapping
  let itemIdx = 0;

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-[11px] font-medium text-muted flex items-center gap-1">
          {label}
          {tooltip && (
            <span className="text-muted/60" title={tooltip}>
              ?
            </span>
          )}
        </label>
      )}

      <div ref={refs.setReference} {...getReferenceProps()} className="relative">
        <div
          className={clsx(
            "flex flex-wrap items-center gap-1 bg-surface border border-border rounded px-2 py-1 text-sm text-foreground",
            "focus-within:border-accent transition-colors",
            disabled && "opacity-50 pointer-events-none",
          )}
        >
          {/* Multi-select chips */}
          {multiSelect &&
            selectedArray.map((v) => (
              <span
                key={v}
                className={clsx(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded max-w-[160px]",
                  isFreeform(v)
                    ? "bg-warning/15 text-warning"
                    : "bg-accent/15 text-accent",
                )}
              >
                <span className="truncate">{v}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChip(v);
                  }}
                  className="hover:text-foreground shrink-0"
                  aria-label={`Remove ${v}`}
                >
                  x
                </button>
              </span>
            ))}

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (!open) setOpen(true);
            }}
            placeholder={
              multiSelect && selectedArray.length > 0 ? "" : placeholder
            }
            disabled={disabled}
            className="flex-1 min-w-[60px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted/60"
            aria-autocomplete="list"
            aria-expanded={open}
          />

          {/* Loading indicator */}
          {domain.isLoading && <LoadingSpinner size="sm" className="shrink-0" />}

          {/* Clear button */}
          {(selectedArray.length > 0 || inputValue) && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="text-muted hover:text-foreground shrink-0 text-xs px-0.5"
              aria-label="Clear"
            >
              x
            </button>
          )}
        </div>

        {/* Freeform warning for single-select */}
        {!multiSelect &&
          typeof value === "string" &&
          value &&
          isFreeform(value) && (
            <span className="text-[10px] text-warning mt-0.5 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />
              {freeformWarning}
            </span>
          )}
      </div>

      {/* Dropdown */}
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 bg-surface-elevated border border-border rounded shadow-lg max-h-60 overflow-auto"
            >
              {showLargeHint && (
                <div className="px-3 py-2 text-xs text-muted text-center">
                  Type to search ({domain.totalCount.toLocaleString()} values)
                </div>
              )}

              {!showLargeHint && flatItems.length === 0 && !domain.isLoading && (
                <div className="px-3 py-2 text-xs text-muted text-center">
                  {inputValue ? "No matches" : "No suggestions available"}
                </div>
              )}

              {!showLargeHint && domain.isLoading && flatItems.length === 0 && (
                <div className="px-3 py-2 flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              )}

              {groups.map((group) => {
                const groupItems = group.items;
                return (
                  <div key={group.label || "__default"}>
                    {group.label && (
                      <div className="px-2 py-1 text-[10px] font-medium text-muted uppercase tracking-wider sticky top-0 bg-surface-elevated border-b border-border/50">
                        {group.label}
                      </div>
                    )}
                    {groupItems.map((item) => {
                      const idx = itemIdx++;
                      const selected = isSelected(item);
                      return (
                        <div
                          key={item}
                          ref={(el) => {
                            listRef.current[idx] = el;
                          }}
                          role="option"
                          aria-selected={selected}
                          {...getItemProps({
                            onClick: () => {
                              selectItem(item);
                              if (!multiSelect) setInputValue("");
                            },
                          })}
                          className={clsx(
                            "px-2 py-1 text-sm cursor-pointer",
                            activeIndex === idx && "bg-accent/10",
                            selected
                              ? "bg-accent/15 text-accent"
                              : "text-foreground hover:bg-accent/10",
                          )}
                        >
                          {multiSelect && (
                            <span className="mr-1.5 text-xs">
                              {selected ? "[x]" : "[ ]"}
                            </span>
                          )}
                          {item}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Freeform hint */}
              {inputValue &&
                !allKnownValues.has(inputValue.trim()) &&
                allowFreeform &&
                flatItems.length > 0 && (
                  <div className="px-2 py-1 text-[10px] text-muted border-t border-border/50">
                    Press Enter to use "{inputValue.trim()}" as custom value
                  </div>
                )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
