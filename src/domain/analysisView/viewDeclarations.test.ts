import { describe, expect, it } from "vitest";
import { retainedView } from "./viewDeclaration.js";
import type { ViewDeclaration } from "./viewDeclaration.js";
import { foldViewDeclarations } from "./viewRegistry.js";
import { DECLARED_VIEWS } from "./viewDeclarations.js";

/**
 * The operation strings `retainedViewProjectors` in `analysisView.ts` registers
 * today: 45 literal `retain(...)` calls plus the eleven operations spread from
 * `NATIVE_OBSERVATION_OPERATIONS` (6) and `NATIVE_INVENTORY_OPERATIONS` (5).
 * Kept here as the reference the declarations must match; step 3 deletes this
 * list along with the hand-written map.
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
  // NATIVE_OBSERVATION_OPERATIONS
  "procedure_address",
  "procedure_callees",
  "procedure_callers",
  "resolve_containing_procedure",
  "get_call_graph",
  "xrefs",
  // NATIVE_INVENTORY_OPERATIONS
  "list_procedures",
  "search_procedures",
  "list_strings",
  "search_strings",
  "list_names",
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

  it("collects 44 modules serving 56 operations", () => {
    expect(DECLARED_VIEWS).toHaveLength(44);
    expect(operationsOf(DECLARED_VIEWS)).toHaveLength(56);
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
