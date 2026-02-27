import { useEffect, useState } from "react";
import { api } from "../api/client.ts";

interface FormatRule {
  type: string;
  precision?: number | null;
  prefix?: string;
  suffix?: string;
  transform?: string | null;
}

interface FormatRulesConfig {
  rules: Record<string, FormatRule>;
  field_mappings: Record<string, string>;
}

let cachedConfig: FormatRulesConfig | null = null;

export function useFormatRules() {
  const [config, setConfig] = useState<FormatRulesConfig | null>(cachedConfig);

  useEffect(() => {
    if (cachedConfig) return;
    api
      .get<FormatRulesConfig>("/metadata/format-rules")
      .then((data) => {
        cachedConfig = data;
        setConfig(data);
      })
      .catch(() => {
        // Fallback: empty config
      });
  }, []);

  function formatValue(fieldName: string, value: unknown): string {
    if (value === null || value === undefined) return "";
    if (!config) return String(value);

    const ruleName = config.field_mappings[fieldName];
    if (!ruleName) return String(value);

    const rule = config.rules[ruleName];
    if (!rule) return String(value);

    if (rule.type === "number" && typeof value === "number") {
      const formatted =
        rule.precision != null ? value.toFixed(rule.precision) : String(value);
      return `${rule.prefix ?? ""}${formatted}${rule.suffix ?? ""}`;
    }

    if (rule.type === "label" && typeof value === "string") {
      if (rule.transform === "snake_to_title") {
        return value
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    return String(value);
  }

  return { formatValue, config, loading: !config };
}
