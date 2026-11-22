import type { AnalysisViewParent } from "./analysisViewParent.js";
import type { AdmittedView } from "./analysisViewShape.js";
import type {
  GroupingViewDeclaration,
  ParentReader,
  RetainedViewDeclaration,
  TypedProjector,
  TypedViewDeclaration,
  ViewDeclaration,
} from "./viewDeclaration.js";

/**
 * Fold view declarations into the three dispatch tables the projection path
 * reads: operation-keyed projectors, kind-keyed projectors, and grouping
 * accumulators.
 *
 * Ownership is exclusive. One parent operation names one projector, and one
 * view kind names one projector. Two declarations claiming the same key is a
 * programming error, not a precedence question, so it throws at module load
 * instead of leaving whichever declaration ran last in charge.
 */

/** One operation-keyed projector entry. */
export interface OperationRoute {
  readonly operation: string;
  /** Absent for grouping declarations: their slots project the view. */
  readonly project?: (
    parent: AnalysisViewParent,
    view: AdmittedView,
  ) => ReturnType<RetainedViewDeclaration["project"]>;
  /** Set when the declaration dispatches ahead of kind-keyed entries. */
  readonly beforeKinds: boolean;
  /** The declaration that owns this operation, for conflict messages. */
  readonly owner: string;
  readonly predicate?: string;
}

/** One view-kind projector entry, dispatched in declaration order. */
export interface KindRoute {
  readonly kind: string;
  readonly project: RetainedViewDeclaration["project"];
}

/** One grouping slot, projected under the budget its caller created. */
export interface GroupingRoute {
  readonly operation: string;
  readonly slots: GroupingViewDeclaration["slots"];
}

/** Every declaration folded once, for both dispatch and coverage checks. */
export interface ViewRoutes {
  readonly byOperation: ReadonlyMap<string, OperationRoute>;
  readonly byKind: readonly KindRoute[];
  readonly grouping: readonly GroupingRoute[];
  /** Every declared view kind, in declaration order. */
  readonly kinds: readonly string[];
}

const conflict = (kind: string, key: string, first: string, second: string) =>
  new Error(
    `Analysis view ${kind} ${JSON.stringify(key)} is declared by both ${first} and ${second}; one view owns one key.`,
  );

/** Every operation a declaration claims, refused when two declarations claim it. */
const claimOperations = (
  seen: Map<string, OperationRoute>,
  declaration: ViewDeclaration,
  beforeKinds: boolean,
): readonly OperationRoute[] => {
  // Kind-keyed declarations own no operation.
  if (declaration.mode === "kind") return [];
  const declared = declaration.mode;
  const routes: OperationRoute[] = [];
  for (const operation of declaration.operations) {
    const existing = seen.get(operation);
    if (existing !== undefined)
      throw conflict("operation", operation, existing.owner, declared);
    const project =
      declaration.mode === "typed"
        ? wrapTyped(declaration)
        : declaration.mode === "grouping"
          ? undefined
          : declaration.project;
    const route: OperationRoute = {
      operation,
      owner: declared,
      beforeKinds,
      ...(project === undefined ? {} : { project }),
      ...(declaration.mode === "retained" && declaration.predicate !== undefined
        ? { predicate: declaration.predicate }
        : {}),
    };
    seen.set(operation, route);
    routes.push(route);
  }
  return routes;
};
/** Read the parent report first, then project; the reader owns the failure. */
const wrapTyped =
  (declaration: TypedViewDeclaration<never>): OperationRoute["project"] =>
  (parent, view) => {
    const read = declaration.read as ParentReader<unknown>;
    const project = declaration.project as TypedProjector<unknown>;
    const report = read(parent);
    return report.ok ? project(parent, report.value, view) : report;
  };

/** Kinds a declaration owns, refused when two declarations own one kind. */
const claimKinds = (
  seen: Map<string, string>,
  declaration: ViewDeclaration,
): readonly string[] => {
  const declared = declaration.mode === "kind" ? "kind" : declaration.mode;
  const kinds =
    declaration.mode === "kind"
      ? declaration.kinds
      : declaration.mode === "grouping"
        ? declaration.slots.map((slot) => slot.kind)
        : [];
  for (const kind of kinds) {
    const existing = seen.get(kind);
    if (existing !== undefined)
      throw conflict("kind", kind, existing, declared);
    seen.set(kind, declared);
  }
  return kinds;
};

/**
 * Fold declarations in the order the caller wrote them.
 *
 * Order is the contract: kind-keyed entries dispatch in declaration order and
 * the request union advertises members in the same order, so the registry never
 * sorts.
 */
export const foldViewDeclarations = (
  declarations: readonly ViewDeclaration[],
): ViewRoutes => {
  const operationOwners = new Map<string, OperationRoute>();
  const kindOwners = new Map<string, string>();
  const ordered: OperationRoute[] = [];
  const grouping: GroupingRoute[] = [];
  const kindRoutes: KindRoute[] = [];
  const kinds: string[] = [];
  for (const declaration of declarations) {
    for (const route of claimOperations(
      operationOwners,
      declaration,
      // Operation-keyed dispatch runs before kind dispatch, so it is claimed
      // first even when the declaration appears later in the file.
      true,
    ))
      ordered.push(route);
    for (const kind of claimKinds(kindOwners, declaration)) kinds.push(kind);
    if (declaration.mode === "grouping")
      for (const operation of declaration.operations)
        grouping.push({ operation, slots: declaration.slots });
    if (declaration.mode === "kind")
      for (const kind of declaration.kinds)
        kindRoutes.push({ kind, project: declaration.project });
  }
  return {
    byOperation: new Map(ordered.map((route) => [route.operation, route])),
    byKind: kindRoutes,
    grouping,
    kinds,
  };
};

/** Projectors that own a view kind, ignoring operation-keyed entries. */
export const kindProjectorFor = (
  routes: ViewRoutes,
  view: AdmittedView,
): RetainedViewDeclaration["project"] | undefined =>
  routes.byKind.find((route) => route.kind === view.kind)?.project;

/** The grouping entry that owns this parent operation, if any. */
export const groupingFor = (
  routes: ViewRoutes,
  operation: string,
): GroupingRoute | undefined =>
  routes.grouping.find((route) => route.operation === operation);
