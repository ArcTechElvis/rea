import { describe, expect, it } from "vitest";
import { foldViewDeclarations } from "./viewRegistry.js";
import * as reg from "./viewDeclaration.js";
import type { AdmittedView } from "./analysisViewShape.js";
import type { AnalysisViewParent } from "./analysisViewParent.js";
import { ok, type Result } from "../result.js";
import type { AnalysisError } from "../analysisErrorBase.js";
import type { UnsignedAnalysisView } from "./analysisViewResult.js";

/**
 * The registry prototype must be able to express every dispatch shape the
 * hand-maintained tables currently use. This file folds a declaration set that
 * mirrors `analysisView.ts`'s structure — the 45 registered operation strings,
 * the two operation-list spreads, the three shared projectors, the kind-keyed
 * views, and the four grouping views — and asserts nothing is lost.
 */

const stub = (
  _parent: AnalysisViewParent,
  _view: AdmittedView,
): Result<UnsignedAnalysisView, AnalysisError> =>
  ok({} as unknown as UnsignedAnalysisView);

/** The literal operation strings currently in `retainedViewProjectors`. */
const RETAINED_OPERATIONS = [
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

const KIND_VIEWS = [
  "cyclonedx",
  "recorded-array",
  "javascript-routes",
  "web-bundle",
] as const;

const GROUPING_OPERATIONS = [
  "inspect_web_network_capture",
  "inspect_environment_capture",
  "inspect_binary_layout",
  "analyze_javascript_application",
] as const;

const declarations = [
  // One declaration per operation, as a view module would own it.
  ...RETAINED_OPERATIONS.map((operation) =>
    reg.retainedView({ operations: [operation], project: stub }),
  ),
  ...KIND_VIEWS.map((kind) => reg.kindView({ kinds: [kind], project: stub })),
  ...GROUPING_OPERATIONS.map((operation) =>
    reg.groupingView({
      operations: [operation],
      slots: [{ kind: `${operation}-slot`, project: stub }],
    }),
  ),
];

describe("registry covers the current dispatch surface", () => {
  const routes = foldViewDeclarations(declarations);

  it("registers all 45 operation strings", () => {
    expect(routes.byOperation.size).toBe(45 + GROUPING_OPERATIONS.length);
    for (const operation of RETAINED_OPERATIONS)
      expect(routes.byOperation.has(operation), operation).toBe(true);
  });

  it("routes every literal operation to a projector", () => {
    for (const operation of RETAINED_OPERATIONS)
      expect(routes.byOperation.get(operation)?.project, operation).toBeTypeOf(
        "function",
      );
  });

  it("keeps grouping operations without an operation-keyed projector", () => {
    for (const operation of GROUPING_OPERATIONS)
      expect(
        routes.byOperation.get(operation)?.project,
        operation,
      ).toBeUndefined();
  });

  it("owns every kind-keyed view", () => {
    for (const kind of KIND_VIEWS) expect(routes.kinds, kind).toContain(kind);
  });

  it("has no duplicate keys anywhere", () => {
    expect(new Set(routes.kinds).size).toBe(routes.kinds.length);
    const operations = [...routes.byOperation.keys()];
    expect(new Set(operations).size).toBe(operations.length);
  });
});

describe("shared-projector declarations", () => {
  it("expresses one projector serving several operations", () => {
    const routes = foldViewDeclarations([
      reg.retainedView({
        operations: ["inspect_android_class", "inspect_android_method"],
        project: stub,
      }),
      reg.retainedView({
        operations: ["inspect_artifact", "inventory_artifact"],
        project: stub,
      }),
    ]);
    expect(routes.byOperation.size).toBe(4);
  });

  it("expresses an operation list spread onto one projector", () => {
    const observationOperations = [
      "inspect_swift_type",
      "get_call_graph",
      "xrefs",
    ] as const;
    const routes = foldViewDeclarations([
      reg.retainedView({
        operations: [...observationOperations],
        project: stub,
      }),
    ]);
    expect(routes.byOperation.size).toBe(observationOperations.length);
  });

  it("expresses a predicate requirement on a declaration", () => {
    const routes = foldViewDeclarations([
      reg.retainedView({
        operations: ["procedure_pseudo_code"],
        project: stub,
        predicate: "analysis_evidence",
      }),
    ]);
    expect(routes.byOperation.get("procedure_pseudo_code")?.predicate).toBe(
      "analysis_evidence",
    );
  });
});

describe("the four dispatch mechanisms coexist", () => {
  it("lets a kind declaration and an operation declaration share one registry", () => {
    const routes = foldViewDeclarations([
      reg.kindView({ kinds: ["cyclonedx"], project: stub }),
      reg.retainedView({
        operations: ["inspect_native_exports"],
        project: stub,
      }),
      reg.operationView({
        operations: ["inspect_pcap_capture"],
        project: stub,
      }),
      reg.groupingView({
        operations: ["inspect_web_network_capture"],
        slots: [{ kind: "api-surface", project: stub }],
      }),
    ]);
    expect(routes.kinds).toEqual(["cyclonedx", "api-surface"]);
    expect([...routes.byOperation.keys()].sort()).toEqual([
      "inspect_native_exports",
      "inspect_pcap_capture",
      "inspect_web_network_capture",
    ]);
    expect(routes.grouping).toHaveLength(1);
  });
});
