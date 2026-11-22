import { describe, expect, it } from "vitest";
import { ok, type Result } from "../result.js";
import type { AnalysisError } from "../analysisErrorBase.js";
import type { AnalysisViewParent } from "./analysisViewParent.js";
import type { AdmittedView } from "./analysisViewShape.js";
import type { UnsignedAnalysisView } from "./analysisViewResult.js";
import {
  foldViewDeclarations,
  groupingFor,
  kindProjectorFor,
} from "./viewRegistry.js";
import {
  groupingView,
  kindView,
  operationView,
  retainedView,
  typedView,
} from "./viewDeclaration.js";

const parent = {
  evidenceId: "ev_test",
  operation: "inspect_x",
} as AnalysisViewParent;

/** A projector that records which declaration served it. */
const projector =
  (name: string) =>
  (
    _parent: AnalysisViewParent,
    _view: AdmittedView,
  ): Result<UnsignedAnalysisView, AnalysisError> =>
    ok({ name } as unknown as UnsignedAnalysisView);

const view = (kind: string): AdmittedView => ({ kind });

describe("foldViewDeclarations", () => {
  it("routes an operation to its retained projector", () => {
    const routes = foldViewDeclarations([
      retainedView({ operations: ["inspect_x"], project: projector("x") }),
    ]);
    expect(routes.byOperation.get("inspect_x")?.owner).toBe("retained");
    expect(
      routes.byOperation.get("inspect_x")?.project?.(parent, view("summary")),
    ).toEqual(ok({ name: "x" }));
  });

  it("serves every operation one declaration lists", () => {
    const routes = foldViewDeclarations([
      retainedView({
        operations: ["inspect_x", "inspect_y", "inspect_z"],
        project: projector("shared"),
      }),
    ]);
    expect([...routes.byOperation.keys()].sort()).toEqual([
      "inspect_x",
      "inspect_y",
      "inspect_z",
    ]);
  });

  it("refuses two declarations claiming one operation", () => {
    expect(() =>
      foldViewDeclarations([
        retainedView({
          operations: ["inspect_x"],
          project: projector("first"),
        }),
        kindView({ kinds: ["summary"], project: projector("second") }),
        operationView({
          operations: ["inspect_x"],
          project: projector("third"),
        }),
      ]),
    ).toThrow(
      /operation "inspect_x" is declared by both retained and operation/u,
    );
  });

  it("refuses two declarations claiming one view kind", () => {
    expect(() =>
      foldViewDeclarations([
        retainedView({
          operations: ["inspect_x"],
          project: projector("a"),
          predicate: "analysis_evidence",
        }),
        groupingView({
          operations: ["inspect_capture"],
          slots: [{ kind: "api-surface", project: projector("b") }],
        }),
        kindView({ kinds: ["api-surface"], project: projector("c") }),
      ]),
    ).toThrow(/kind "api-surface" is declared by both grouping and kind/u);
  });

  it("reads the parent report before projecting a typed view", () => {
    const reads: string[] = [];
    const routes = foldViewDeclarations([
      typedView({
        operations: ["inspect_typed"],
        read: (p) => {
          reads.push(p.operation);
          return ok({ decoded: 42 });
        },
        project: (_p, report) =>
          ok({ got: report.decoded } as unknown as UnsignedAnalysisView),
      }),
    ]);
    const projected = routes.byOperation
      .get("inspect_typed")
      ?.project?.(parent, view("summary"));
    expect(reads).toEqual(["inspect_x"]);
    expect(projected).toEqual(ok({ got: 42 }));
  });

  it("propagates a typed view's reader failure without projecting", () => {
    let projected = false;
    const failure = { ok: false, error: new Error("no") } as unknown as Result<
      { decoded: number },
      AnalysisError
    >;
    const routes = foldViewDeclarations([
      typedView({
        operations: ["inspect_typed"],
        read: () => failure,
        project: () => {
          projected = true;
          return ok({} as unknown as UnsignedAnalysisView);
        },
      }),
    ]);
    expect(
      routes.byOperation
        .get("inspect_typed")
        ?.project?.(parent, view("summary")),
    ).toBe(failure);
    expect(projected).toBe(false);
  });

  it("dispatches kind entries in declaration order and never sorts", () => {
    const routes = foldViewDeclarations([
      kindView({ kinds: ["zeta"], project: projector("z") }),
      kindView({ kinds: ["alpha"], project: projector("a") }),
    ]);
    expect(routes.byKind.map((route) => route.kind)).toEqual(["zeta", "alpha"]);
    expect(routes.kinds).toEqual(["zeta", "alpha"]);
  });

  it("exposes a grouping declaration's slots under its operation", () => {
    const slots = [{ kind: "api-surface", project: projector("surface") }];
    const routes = foldViewDeclarations([
      groupingView({ operations: ["inspect_capture"], slots }),
    ]);
    expect(groupingFor(routes, "inspect_capture")?.slots).toBe(slots);
    expect(routes.byOperation.get("inspect_capture")?.project).toBeUndefined();
  });

  it("finds a kind projector and reports an unowned kind as undefined", () => {
    const routes = foldViewDeclarations([
      kindView({ kinds: ["cyclonedx"], project: projector("cdx") }),
    ]);
    expect(kindProjectorFor(routes, view("cyclonedx"))).toBeDefined();
    expect(kindProjectorFor(routes, view("nobody-owns-this"))).toBeUndefined();
  });

  it("folds an empty registry to empty tables", () => {
    const routes = foldViewDeclarations([]);
    expect(routes.byOperation.size).toBe(0);
    expect(routes.byKind).toEqual([]);
    expect(routes.grouping).toEqual([]);
    expect(routes.kinds).toEqual([]);
  });
});
