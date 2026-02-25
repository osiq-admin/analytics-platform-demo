import { useState, useEffect, useCallback, useRef } from "react";

export interface DomainValuesResult {
  metadataValues: string[];
  dataValues: string[];
  combined: string[];
  cardinality: "small" | "medium" | "large";
  totalCount: number;
  isLoading: boolean;
  search: string;
  setSearch: (s: string) => void;
}

interface CachedData {
  metadataValues: string[];
  dataValues: string[];
  combined: string[];
  cardinality: "small" | "medium" | "large";
  totalCount: number;
}

// Simple in-memory cache
const cache = new Map<string, { data: CachedData; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

export function useDomainValues(
  entityId: string | undefined,
  fieldName: string | undefined,
  options?: { eager?: boolean },
): DomainValuesResult {
  const [data, setData] = useState<CachedData>({
    metadataValues: [],
    dataValues: [],
    combined: [],
    cardinality: "small",
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchValues = useCallback(
    async (searchTerm?: string) => {
      if (!entityId || !fieldName) return;

      const cacheKey = `${entityId}/${fieldName}/${searchTerm || ""}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setData(cached.data);
        return;
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.set("search", searchTerm);
        params.set("limit", "50");
        const qs = params.toString();
        const url = `/api/metadata/domain-values/${entityId}/${fieldName}${qs ? `?${qs}` : ""}`;
        const resp = await fetch(url);
        if (!resp.ok) return;
        const json = await resp.json();

        const result: CachedData = {
          metadataValues: json.metadata_values || [],
          dataValues: json.data_values || [],
          combined: json.combined || [],
          cardinality: json.cardinality || "small",
          totalCount: json.total_count || 0,
        };

        setData(result);
        cache.set(cacheKey, { data: result, ts: Date.now() });
      } catch {
        // silent fail -- suggestions are non-critical
      } finally {
        setIsLoading(false);
      }
    },
    [entityId, fieldName],
  );

  // Eager load for small/medium cardinality
  useEffect(() => {
    if (options?.eager !== false && entityId && fieldName) {
      fetchValues();
    }
  }, [entityId, fieldName, fetchValues, options?.eager]);

  // Debounced search for large cardinality
  useEffect(() => {
    if (data.cardinality === "large" && search) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchValues(search), 300);
      return () => clearTimeout(debounceRef.current);
    }
  }, [search, data.cardinality, fetchValues]);

  return { ...data, isLoading, search, setSearch };
}
