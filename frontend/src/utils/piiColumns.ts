import type { PiiFieldInfo, PiiRegistry } from "../stores/governanceStore";

/**
 * Get a flat set of all PII field names from the registry.
 */
export function getPiiFieldNames(registry: PiiRegistry | null): Set<string> {
  if (!registry) return new Set();
  const names = new Set<string>();
  for (const entity of Object.values(registry.entities)) {
    for (const field of entity.pii_fields) {
      names.add(field.field);
    }
  }
  return names;
}

/**
 * Check if a column name is a PII field.
 */
export function isPiiField(
  fieldName: string,
  registry: PiiRegistry | null
): boolean {
  return getPiiFieldNames(registry).has(fieldName);
}

/**
 * Get PII metadata for a specific field (first match across entities).
 */
export function getPiiInfo(
  fieldName: string,
  registry: PiiRegistry | null
): PiiFieldInfo | null {
  if (!registry) return null;
  for (const entity of Object.values(registry.entities)) {
    for (const field of entity.pii_fields) {
      if (field.field === fieldName) return field;
    }
  }
  return null;
}
