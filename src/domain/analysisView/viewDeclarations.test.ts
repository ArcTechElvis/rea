import { describe, expect, it } from "vitest";
import { retainedView } from "./viewDeclaration.js";
import type { ViewDeclaration } from "./viewDeclaration.js";
import { foldViewDeclarations } from "./viewRegistry.js";
import { androidJniViewDeclarations } from "./androidJniView.js";
import { androidPackageViewDeclarations } from "./androidPackageView.js";
import { androidSymbolViewDeclarations } from "./androidSymbolView.js";
import { apiContractViewDeclarations } from "./apiContractView.js";
import { apkSignatureViewDeclarations } from "./apkSignatureView.js";
import {
  artifactInventoryViewDeclarations,
  il2cppMetadataViewDeclarations,
} from "./viewDeclarationsAtBudget.js";
import { batchDecompileViewDeclarations } from "./batchDecompileView.js";
import { browserScenarioViewDeclarations } from "./browserScenarioView.js";
import { commandObservationViewDeclarations } from "./commandObservationView.js";
import { dartAotViewDeclarations } from "./dartAotView.js";
import { desktopApplicationViewDeclarations } from "./desktopApplicationView.js";
import { devicetreeViewDeclarations } from "./devicetreeView.js";
import { elfDependenciesViewDeclarations } from "./elfDependenciesView.js";
import { endpointComparisonViewDeclarations } from "./endpointComparisonView.js";
import { erlangBeamViewDeclarations } from "./erlangBeamView.js";
import { evmInterfaceViewDeclarations } from "./evmInterfaceView.js";
import { featureTraceViewDeclarations } from "./featureTraceView.js";
import { fridaSessionStatusViewDeclarations } from "./fridaSessionStatusView.js";
import { goBinaryViewDeclarations } from "./goBinaryView.js";
import { gpuCodeObjectsViewDeclarations } from "./gpuCodeObjectsView.js";
import { interfaceBuilderViewDeclarations } from "./interfaceBuilderView.js";
import { machoViewDeclarations } from "./machoView.js";
import { managedArtifactViewDeclarations } from "./managedArtifactView.js";
import { managedMemberViewDeclarations } from "./managedMemberView.js";
import { modelArtifactViewDeclarations } from "./modelArtifactView.js";
import { nativeExportsViewDeclarations } from "./nativeExportsView.js";
import { nativeFeatureTraceViewDeclarations } from "./nativeFeatureTraceView.js";
import { nativeFunctionMatchingViewDeclarations } from "./nativeFunctionMatchingView.js";
import { nativeInstructionReferencesViewDeclarations } from "./nativeInstructionReferencesView.js";
import { nativeLoadImageViewDeclarations } from "./nativeLoadImageView.js";
import { nativeProcedureReferencesViewDeclarations } from "./nativeProcedureReferencesView.js";
import { nativeValueTraceViewDeclarations } from "./nativeValueTraceView.js";
import { nugetNupkgViewDeclarations } from "./nugetNupkgView.js";
import { playwrightTraceViewDeclarations } from "./playwrightTraceView.js";
import { procedurePseudocodeViewDeclarations } from "./procedurePseudocodeView.js";
import { pythonPycViewDeclarations } from "./pythonPycView.js";
import { rustBinaryViewDeclarations } from "./rustBinaryView.js";
import { sourceToBundleViewDeclarations } from "./sourceToBundleView.js";
import { wasmArtifactViewDeclarations } from "./wasmArtifactView.js";
import { webBundleViewDeclarations } from "./webBundleView.js";
import { webSourceLocationViewDeclarations } from "./webSourceLocationView.js";

/**
 * The declarations each view module now owns, collected in one place.
 *
 * This list is the fail-closed half of the migration: `analysisView.ts` still
 * builds its projector map by hand, and this test asserts the declarations
 * describe exactly the same operations. A view added to one and not the other
 * fails here instead of drifting silently until step 3.
 */
export const DECLARED_VIEWS: readonly ViewDeclaration[] = [
  androidJniViewDeclarations,
  androidPackageViewDeclarations,
  androidSymbolViewDeclarations,
  apiContractViewDeclarations,
  apkSignatureViewDeclarations,
  artifactInventoryViewDeclarations,
  batchDecompileViewDeclarations,
  browserScenarioViewDeclarations,
  commandObservationViewDeclarations,
  dartAotViewDeclarations,
  desktopApplicationViewDeclarations,
  devicetreeViewDeclarations,
  elfDependenciesViewDeclarations,
  endpointComparisonViewDeclarations,
  erlangBeamViewDeclarations,
  evmInterfaceViewDeclarations,
  featureTraceViewDeclarations,
  fridaSessionStatusViewDeclarations,
  goBinaryViewDeclarations,
  gpuCodeObjectsViewDeclarations,
  il2cppMetadataViewDeclarations,
  interfaceBuilderViewDeclarations,
  machoViewDeclarations,
  managedArtifactViewDeclarations,
  managedMemberViewDeclarations,
  modelArtifactViewDeclarations,
  nativeExportsViewDeclarations,
  nativeFeatureTraceViewDeclarations,
  nativeFunctionMatchingViewDeclarations,
  nativeInstructionReferencesViewDeclarations,
  nativeLoadImageViewDeclarations,
  nativeProcedureReferencesViewDeclarations,
  nativeValueTraceViewDeclarations,
  nugetNupkgViewDeclarations,
  playwrightTraceViewDeclarations,
  procedurePseudocodeViewDeclarations,
  pythonPycViewDeclarations,
  rustBinaryViewDeclarations,
  sourceToBundleViewDeclarations,
  wasmArtifactViewDeclarations,
  webBundleViewDeclarations,
  webSourceLocationViewDeclarations,
];

/**
 * The operation strings `retainedViewProjectors` in `analysisView.ts` registers
 * by hand today. Kept here as the reference the declarations must match; step 3
 * deletes this list along with the hand-written map.
 */
const HAND_REGISTERED_OPERATIONS = [
  "procedure_pseudo_code",
  "inspect_native_instruction",
  "trace_feature",
  "procedure_references",
  "trace_native_values",
  "inspect_erlang_beam",
  "inspect_devicetree",
  "inspect_native_exports",
  "inspect_elf_dependencies",
  "inspect_native_load_image",
  "inspect_python_pyc",
  "inspect_nuget_nupkg",
  "frida_session_status",
  "gdb_console",
  "inspect_with_objdump",
  "inspect_go_binary",
  "inspect_rust_binary",
  "inspect_desktop_application",
  "inspect_wasm_artifact",
  "inspect_macho",
  "decode_interface_builder",
  "inspect_evm_interface",
  "inspect_managed_artifact",
  "inspect_managed_members",
  "inspect_android_package",
  "inspect_android_class",
  "inspect_android_method",
  "inspect_android_jni_bindings",
  "capture_browser_scenario",
  "inspect_dart_aot",
  "inspect_il2cpp_metadata",
  "inspect_apk_signature",
  "inspect_model_artifact",
  "inspect_gpu_code_objects",
  "match_native_functions",
  "compare_source_to_bundle",
  "inspect_api_contract",
  "inspect_playwright_trace",
  "compare_static_and_observed_endpoints",
  "trace_application_feature",
  "batch_decompile",
  "inspect_artifact",
  "inventory_artifact",
  "analyze_web_bundle",
  "trace_web_source_location",
] as const;

const operationsOf = (
  declarations: readonly ViewDeclaration[],
): readonly string[] =>
  declarations.flatMap((declaration) =>
    declaration.mode === "kind" || declaration.mode === "grouping"
      ? []
      : [...declaration.operations],
  );

describe("view declarations cover the hand-written registry", () => {
  const routes = foldViewDeclarations(DECLARED_VIEWS);

  it("registers every operation the hand-written map registers", () => {
    for (const operation of HAND_REGISTERED_OPERATIONS)
      expect(routes.byOperation.has(operation), operation).toBe(true);
  });

  it("registers no operation the hand-written map does not", () => {
    const declared = new Set(operationsOf(DECLARED_VIEWS));
    for (const operation of routes.byOperation.keys())
      expect(declared.has(operation), operation).toBe(true);
  });

  it("has exactly the hand-written operation set, in both directions", () => {
    const declared = [...new Set(operationsOf(DECLARED_VIEWS))].sort();
    const hand = [...HAND_REGISTERED_OPERATIONS].sort();
    expect(declared).toEqual(hand);
  });

  it("claims each operation exactly once", () => {
    const claimed = operationsOf(DECLARED_VIEWS);
    expect(new Set(claimed).size).toBe(claimed.length);
  });

  it("gives every declaration a projector", () => {
    for (const route of routes.byOperation.values())
      expect(route.project, route.operation).toBeTypeOf("function");
  });

  it("keeps the three shared projectors serving their two operations each", () => {
    const shared = [
      ["inspect_android_class", "inspect_android_method"],
      ["inspect_artifact", "inventory_artifact"],
      ["gdb_console", "inspect_with_objdump"],
    ] as const;
    for (const [first, second] of shared) {
      const a = routes.byOperation.get(first)?.project;
      const b = routes.byOperation.get(second)?.project;
      expect(a, first).toBeTypeOf("function");
      expect(b, second).toBeTypeOf("function");
      expect(a, `${first} and ${second} share one projector`).toBe(b);
    }
  });

  it("declares no view kind, leaving kind dispatch to its owner", () => {
    expect(routes.byKind).toEqual([]);
  });
});

describe("declaration shape", () => {
  it("gives every collected declaration at least one operation", () => {
    for (const declaration of DECLARED_VIEWS) {
      expect(declaration.mode).toBe("retained");
      if (declaration.mode !== "retained") continue;
      expect(declaration.operations.length).toBeGreaterThan(0);
    }
  });

  it("collects 42 modules serving 45 operations", () => {
    expect(DECLARED_VIEWS).toHaveLength(42);
    expect(operationsOf(DECLARED_VIEWS)).toHaveLength(45);
  });

  it("rejects a duplicate declaration at fold time", () => {
    const first = DECLARED_VIEWS[0];
    if (first === undefined || first.mode !== "retained")
      throw new Error(
        "the collected declarations must start with a retained view",
      );
    expect(() =>
      foldViewDeclarations([
        ...DECLARED_VIEWS,
        retainedView({
          operations: ["inspect_devicetree"],
          project: first.project,
        }),
      ]),
    ).toThrow(/declared by both/u);
  });
});
