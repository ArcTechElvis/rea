import { describe, expect, it } from "vitest";
import { NATIVE_INVENTORY_OPERATIONS } from "../native/nativeInventory.js";
import { NATIVE_OBSERVATION_OPERATIONS } from "../native/nativeObservation.js";
import { DECLARED_VIEWS } from "./viewDeclarations.js";
import { foldViewDeclarations } from "./viewRegistry.js";

/**
 * The hand-written registry this migration replaced, reproduced verbatim from
 * `analysisView.ts` at `main` before step 3. Kept as an independent record so the
 * fold is checked against what actually shipped, not against itself.
 */
const SHIPPED_OPERATIONS = [
  "procedure_pseudo_code",
  "inspect_native_instruction",
  "trace_feature",
  ...NATIVE_OBSERVATION_OPERATIONS,
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
  ...NATIVE_INVENTORY_OPERATIONS,
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

describe("the fold reproduces the registry that shipped", () => {
  const routes = foldViewDeclarations(DECLARED_VIEWS);

  it("serves exactly the same operation set", () => {
    expect([...routes.byOperation.keys()].sort()).toEqual(
      [...new Set(SHIPPED_OPERATIONS)].sort(),
    );
  });

  it("loses no operation the shipped registry routed", () => {
    for (const operation of SHIPPED_OPERATIONS)
      expect(routes.byOperation.has(operation), operation).toBe(true);
  });

  it("adds no operation the shipped registry did not route", () => {
    const shipped = new Set<string>(SHIPPED_OPERATIONS);
    for (const operation of routes.byOperation.keys())
      expect(shipped.has(operation), operation).toBe(true);
  });

  it("routes every operation to a projector", () => {
    for (const route of routes.byOperation.values())
      expect(route.project, route.operation).toBeTypeOf("function");
  });

  it("counts 56 operations across 44 modules", () => {
    expect(routes.byOperation.size).toBe(56);
    expect(DECLARED_VIEWS).toHaveLength(44);
  });
});
