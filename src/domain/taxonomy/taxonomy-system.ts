export const TAXONOMY_SYSTEMS = ["nanda", "noc", "nic"] as const;
export type TaxonomySystem = (typeof TAXONOMY_SYSTEMS)[number];
