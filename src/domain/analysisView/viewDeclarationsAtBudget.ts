import { retainedView } from "./viewDeclaration.js";
import { projectArtifactInventoryView } from "./artifactInventoryView.js";
import { projectIl2cppMetadataView } from "./il2cppMetadataView.js";

/**
 * Declarations for the two view modules that sit at their `max-lines` allowance.
 *
 * A declaration belongs beside the projector it names, and every other view
 * module carries its own. These two are the exception:
 * `artifactInventoryView.ts` and `il2cppMetadataView.ts` are already recorded in
 * `scripts/verify/max-lines-baseline.json`, and the ratchet may only shrink, so
 * adding their declaration in place would need the budget relaxed — which is the
 * one thing the ratchet exists to prevent.
 *
 * The honest trade: the declaration lives with its projector as soon as either
 * module is split below its allowance. Until then it lives here, where its
 * absence from the owning module is visible and explained rather than silent.
 */
export const artifactInventoryViewDeclarations = retainedView({
  operations: ["inspect_artifact", "inventory_artifact"],
  project: projectArtifactInventoryView,
});

export const il2cppMetadataViewDeclarations = retainedView({
  operations: ["inspect_il2cpp_metadata"],
  project: projectIl2cppMetadataView,
});
