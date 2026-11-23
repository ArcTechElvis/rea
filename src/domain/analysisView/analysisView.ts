import { isNativeObservationOperation } from "../native/nativeObservation.js";

import { projectRecordedArrayView } from "./recordedArrayView.js";

import { byteEntropySchema } from "../native/byteEntropy.js";

import { projectByteEntropyView } from "./byteEntropyView.js";
import {
  createAnalysisViewResultReader,
  parentArtifactPath,
} from "./analysisViewParent.js";
import { projectJavaScriptRoutesView } from "./javascriptRoutesView.js";
import { projectWebBundleView } from "./webBundleView.js";

import { projectCycloneDxView } from "./cyclonedxView.js";

import { isNativeInventoryOperation } from "../native/nativeInventory.js";
import { ANALYSIS_EVIDENCE_PREDICATE } from "../evidence.js";
import { NATIVE_FUNCTION_MATCHING_PREDICATE } from "../native/functionMatching.js";
import { z } from "zod";

import { AnalysisUnsupportedTargetError } from "../analysisErrorCore.js";
import {
  INSPECT_ANALYSIS_VIEW_OPERATION,
  analysisViewInputError,
} from "./analysisViewErrors.js";
import { digestCanonicalValue } from "../canonicalDigest.js";
import { prefixedDigestSchema } from "../digests.js";
import { err, ok, type Result } from "../result.js";
import type { AnalysisError } from "../analysisErrorBase.js";
import { safeParseOwnedBinaryLayout } from "../native/binaryLayout.js";
import { functionDossierSchema } from "../native/functionDossier.js";
import {
  parseOwnedJavaScriptApplicationAnalysisSteps,
  type JavaScriptApplicationAnalysisResult,
} from "../javascript/javascriptApplicationAnalysis.js";
import { projectBinaryLayoutView } from "./binaryLayoutView.js";
import { projectJavaScriptApplicationView } from "./javascriptApplicationView.js";
import {
  createApiSurfaceAccumulator,
  projectWebNetworkApiSurfaceView,
} from "./webNetworkApiSurfaceView.js";

import { projectNativeFunctionView } from "./nativeFunctionView.js";

import { projectWebNetworkCaptureView } from "./webNetworkCaptureView.js";
import type { WebNetworkApiSurfaceAccumulator } from "./WebNetworkApiSurfaceAccumulator.js";
import type { EnvironmentManifestAccumulator } from "./EnvironmentManifestAccumulator.js";
import type { EnvironmentStateAccumulator } from "./EnvironmentStateAccumulator.js";
import { admitAnalysisViewData } from "./analysisViewDataAdmission.js";
import {
  createEnvironmentManifestAccumulator,
  projectEnvironmentManifestView,
} from "./environmentManifestView.js";
import {
  createEnvironmentStateAccumulator,
  projectEnvironmentStateView,
} from "./environmentStateView.js";
import { projectEnvironmentCoverageView } from "./environmentCoverageView.js";
import { projectPcapCaptureView } from "./pcapCaptureView.js";

import type { AnalysisViewParent } from "./analysisViewParent.js";
import { DECLARED_VIEWS } from "./viewDeclarations.js";
import { foldViewDeclarations } from "./viewRegistry.js";
import type { GroupingViewKind } from "./analysisViewShape.js";
import type { AnalysisViewRequest } from "./analysisViewRequest.js";
import {
  analysisViewResultSchema,
  type AnalysisViewResult,
  type UnsignedAnalysisView,
} from "./analysisViewResult.js";

/** Attach the content digest that must change when projected bytes change. */
export const sealAnalysisView = (
  projection: UnsignedAnalysisView,
): AnalysisViewResult =>
  analysisViewResultSchema.parse({
    ...projection,
    view_digest: digestCanonicalValue(projection, "Analysis view"),
  });

const parentEvidenceIdSchema = prefixedDigestSchema("ev");

const safeParseJavaScriptParent = (
  input: unknown,
): z.ZodSafeParseResult<JavaScriptApplicationAnalysisResult> => {
  try {
    // The format owner authenticates imported results completely before reuse;
    // mutable or merely frozen inputs still receive canonical validation.
    const steps = parseOwnedJavaScriptApplicationAnalysisSteps(input);
    let step = steps.next();
    while (!step.done) step = steps.next();
    return { success: true, data: step.value };
  } catch (cause: unknown) {
    if (!(cause instanceof z.ZodError)) throw cause;
    return {
      success: false,
      error: cause as z.ZodError<JavaScriptApplicationAnalysisResult>,
    };
  }
};
const readJavaScriptParent = createAnalysisViewResultReader({
  safeParse: safeParseJavaScriptParent,
});
const readByteEntropyParent = createAnalysisViewResultReader(byteEntropySchema);
const readBinaryLayoutParent = createAnalysisViewResultReader({
  safeParse: safeParseOwnedBinaryLayout,
});
const readFunctionDossierParent = createAnalysisViewResultReader(
  functionDossierSchema,
);

const unsupportedParent = (
  parent: AnalysisViewParent,
): AnalysisUnsupportedTargetError =>
  new AnalysisUnsupportedTargetError(
    INSPECT_ANALYSIS_VIEW_OPERATION,
    parentArtifactPath(parent),
    `Parent Evidence operation ${JSON.stringify(parent.operation)} does not support analysis views.`,
    {
      remediationAction:
        "For an analysis view, select completed Evidence from a supported parent operation and a compatible view. For a summary receipt, use normalized_result.parent_evidence_id. To read this record, use the original complete Evidence directly; for session-retained records, request get_evidence_bundle with detail complete or use export_evidence_bundle. Complete bundle delivery may exceed the MCP response budget.",
    },
  );

/** Check a projector result against the result union before sealing it. */
const sealProjected = (
  projected: Result<UnsignedAnalysisView, AnalysisError>,
): Result<AnalysisViewResult, AnalysisError> =>
  projected.ok ? ok(sealAnalysisView(projected.value)) : projected;

/**
 * Every operation-keyed projector, folded from the declarations each view module
 * owns. A duplicate operation throws here at module load instead of the silent
 * last-write-wins a literal `new Map([...])` would give.
 */
const viewRoutes = foldViewDeclarations(DECLARED_VIEWS);

/** Named source owners for views that need no extra decoder or accumulator. */
type RetainedViewProjector = (
  parent: AnalysisViewParent,
  view: AnalysisViewRequest,
) => Result<UnsignedAnalysisView, AnalysisError>;

const retainedViewProjectors = new Map<string, RetainedViewProjector>(
  [...viewRoutes.byOperation].flatMap(([operation, route]) =>
    route.project === undefined
      ? []
      : [[operation, route.project as RetainedViewProjector] as const],
  ),
);

/** Budgets retained across source admission and the selected grouping projection. */
export interface AnalysisViewAccumulators {
  readonly apiSurface?: WebNetworkApiSurfaceAccumulator | undefined;
  readonly manifest?: EnvironmentManifestAccumulator | undefined;
  readonly state?: EnvironmentStateAccumulator | undefined;
}

/** Prepare one view's source admission and projection under the same owned budget. */
export const prepareAnalysisViewProjection = (
  view: AnalysisViewRequest,
): {
  admitInlineEvidence(value: unknown): Result<void, AnalysisError>;
  project(
    parent: AnalysisViewParent,
  ): Result<AnalysisViewResult, AnalysisError>;
} => {
  const accumulators: AnalysisViewAccumulators = {
    apiSurface:
      view.kind === "api-surface"
        ? createApiSurfaceAccumulator(view)
        : undefined,
    manifest:
      view.kind === "environment-manifest"
        ? createEnvironmentManifestAccumulator(view)
        : undefined,
    state:
      view.kind === "environment-state" || view.kind === "environment-coverage"
        ? createEnvironmentStateAccumulator(view)
        : undefined,
  };
  const accumulator =
    accumulators.apiSurface ?? accumulators.manifest ?? accumulators.state;
  return {
    admitInlineEvidence: (value) =>
      accumulator === undefined
        ? admitAnalysisViewData(value, true)
        : accumulator.admitInlineEvidence(value),
    project: (parent) => projectAnalysisView(parent, view, accumulators),
  };
};

type GroupingViewRequest = Extract<
  AnalysisViewRequest,
  { kind: GroupingViewKind }
>;

const isGroupingView = (
  view: AnalysisViewRequest,
): view is GroupingViewRequest =>
  view.kind === "api-surface" ||
  view.kind === "environment-manifest" ||
  view.kind === "environment-state" ||
  view.kind === "environment-coverage";

/** Views that group a capture's records, each under the budget its caller created. */
const projectGroupingView = (
  parent: AnalysisViewParent,
  view: GroupingViewRequest,
  accumulators: AnalysisViewAccumulators,
) => {
  if (view.kind === "api-surface")
    return projectWebNetworkApiSurfaceView(
      parent,
      view,
      accumulators.apiSurface,
    );
  if (view.kind === "environment-manifest")
    return projectEnvironmentManifestView(parent, view, accumulators.manifest);
  if (view.kind === "environment-coverage")
    return projectEnvironmentCoverageView(parent, view, accumulators.state);
  return projectEnvironmentStateView(parent, view, accumulators.state);
};

/** Project one selected view from authenticated parent analysis Evidence. */
export const projectAnalysisView = (
  parent: AnalysisViewParent,
  view: AnalysisViewRequest,
  accumulators: AnalysisViewAccumulators = {},
): Result<AnalysisViewResult, AnalysisError> => {
  if (!parentEvidenceIdSchema.safeParse(parent.evidenceId).success)
    return err(
      analysisViewInputError([
        {
          path: ["source"],
          reason: "invalid_format",
          message: "Parent Evidence ID is not a digest-backed identifier.",
        },
      ]),
    );
  const expectedPredicate =
    parent.operation === "match_native_functions"
      ? NATIVE_FUNCTION_MATCHING_PREDICATE
      : parent.operation === "analyze_function" ||
          parent.operation === "procedure_references" ||
          parent.operation === "procedure_pseudo_code" ||
          parent.operation === "inspect_native_instruction" ||
          parent.operation === "trace_feature" ||
          parent.operation === "batch_decompile" ||
          isNativeObservationOperation(parent.operation) ||
          isNativeInventoryOperation(parent.operation)
        ? ANALYSIS_EVIDENCE_PREDICATE
        : undefined;
  if (
    expectedPredicate !== undefined &&
    parent.predicateType !== expectedPredicate
  )
    return err(
      analysisViewInputError([
        {
          path: ["source", "predicate_type"],
          reason: "invalid_value",
          expected: expectedPredicate,
          message: `${parent.operation} requires ${expectedPredicate} Evidence; received ${parent.predicateType}.`,
        },
      ]),
    );
  if (view.kind === "cyclonedx")
    return sealProjected(projectCycloneDxView(parent, view));
  if (view.kind === "recorded-array") {
    return sealProjected(projectRecordedArrayView(parent, view));
  }
  if (view.kind === "javascript-routes")
    return sealProjected(projectJavaScriptRoutesView(parent, view));
  if (view.kind === "web-bundle")
    return sealProjected(projectWebBundleView(parent, view));
  if (isGroupingView(view))
    return sealProjected(projectGroupingView(parent, view, accumulators));
  if (parent.operation === "inspect_web_network_capture")
    return sealProjected(projectWebNetworkCaptureView(parent, view));
  if (parent.operation === "inspect_pcap_capture")
    return sealProjected(projectPcapCaptureView(parent, view));
  if (parent.operation === "inspect_byte_entropy") {
    const report = readByteEntropyParent(parent);
    if (!report.ok) return report;
    const projected = projectByteEntropyView(parent, report.value, view);
    return sealProjected(projected);
  }
  if (parent.operation === "inspect_binary_layout") {
    const layout = readBinaryLayoutParent(parent);
    if (!layout.ok) return layout;
    const projected = projectBinaryLayoutView(parent, layout.value, view);
    return sealProjected(projected);
  }
  if (parent.operation === "analyze_javascript_application") {
    const analysis = readJavaScriptParent(parent);
    if (!analysis.ok) return analysis;
    return sealProjected(
      projectJavaScriptApplicationView(parent, analysis.value, view),
    );
  }
  if (parent.operation === "analyze_function") {
    const native = readFunctionDossierParent(parent);
    if (!native.ok) return native;
    return sealProjected(projectNativeFunctionView(parent, native.value, view));
  }
  const project = retainedViewProjectors.get(parent.operation);
  if (project !== undefined) {
    const projected = project(parent, view);
    return sealProjected(projected);
  }
  return err(unsupportedParent(parent));
};
