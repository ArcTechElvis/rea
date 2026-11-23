import type { AnalysisError } from "../analysisErrorBase.js";
import type { Result } from "../result.js";
import type { AnalysisViewParent } from "./analysisViewParent.js";
import type { AdmittedView } from "./analysisViewShape.js";

/**
 * The unsigned view a projector returns.
 *
 * Deliberately structural rather than imported from `analysisViewResult.ts`:
 * that module already imports every view module's request schema, so naming it
 * here would close an import cycle through every projector
 * (`analysisViewCycles.test.ts` holds that graph exact). A projector satisfies
 * this by returning the object it already builds, so nothing is loosened.
 */
export interface ProjectedView {
  readonly kind: string;
}

/**
 * A view module names its own subject.
 *
 * Each `*View.ts` module exports one declaration. The registry folds every
 * declaration into the request union, the projector table, and the result
 * union, so a new view kind is one new module plus one entry in
 * `registry.ts` — never three coordinated edits.
 *
 * The declaration is a discriminated union rather than a bag of optional
 * fields: a declaration carries exactly the facts its dispatch needs, and an
 * impossible combination is a type error instead of a runtime check.
 */

/** Project a view from a parent whose decoded report the module reads itself. */
export type RetainedProjector = (
  parent: AnalysisViewParent,
  view: AdmittedView,
) => Result<ProjectedView, AnalysisError>;

/** Decode a parent's normalized result into the report this projector reads. */
export type ParentReader<Report> = (
  parent: AnalysisViewParent,
) => Result<Report, AnalysisError>;

/** Project a view from a report this module decoded from its parent. */
export type TypedProjector<Report> = (
  parent: AnalysisViewParent,
  report: Report,
  view: AdmittedView,
) => Result<ProjectedView, AnalysisError>;

/** At least one operation, so a declaration can never route nothing. */
export type Operations = readonly [string, ...string[]];

/** At least one view kind, so a declaration can never own nothing. */
export type ViewKinds = readonly [string, ...string[]];

/**
 * A view reached by the parent operation that produced the Evidence.
 *
 * `predicate` names the Evidence predicate the parent must carry. Omitting it
 * means the registry derives the predicate from the parent operation's
 * registered expectations; setting it states the requirement at this module.
 */
export interface RetainedViewDeclaration {
  readonly mode: "retained";
  readonly operations: Operations;
  readonly project: RetainedProjector;
  readonly predicate?: string;
}

/** A view reached by the parent operation, whose report this module decodes. */
export interface TypedViewDeclaration<Report = unknown> {
  readonly mode: "typed";
  readonly operations: Operations;
  readonly read: ParentReader<Report>;
  readonly project: TypedProjector<Report>;
}

/**
 * A view reached by the parent operation even though another projector owns
 * the view kind. These report the operation-specific context a kind projector
 * cannot know, so they are dispatched before any kind declaration.
 */
export interface OperationViewDeclaration {
  readonly mode: "operation";
  readonly operations: Operations;
  readonly project: RetainedProjector;
}

/**
 * A view that groups one capture's records under a budget the caller created.
 * All slots of one declaration share the parent operation.
 */
export interface GroupingViewDeclaration {
  readonly mode: "grouping";
  readonly operations: Operations;
  readonly slots: readonly GroupingSlot[];
}

/** One view kind inside a grouping declaration. */
export interface GroupingSlot {
  readonly kind: string;
  readonly project: RetainedProjector;
}

/**
 * A view reached by its own kind regardless of parent operation. Kinds are
 * dispatched in declaration order, so a kind declaration can claim a kind that
 * no operation declaration handles.
 */
export interface KindViewDeclaration {
  readonly mode: "kind";
  readonly kinds: ViewKinds;
  readonly project: RetainedProjector;
}

/** Every way a view module names its subject. */
export type ViewDeclaration =
  | RetainedViewDeclaration
  | TypedViewDeclaration<never>
  | OperationViewDeclaration
  | GroupingViewDeclaration
  | KindViewDeclaration;

/**
 * A typed declaration carries a report type no other declaration needs to
 * name, so the collection erases it. `TypedViewDeclaration` stays generic at
 * the declaration site, where the reader and projector are written together and
 * the report type is checked; the erased form only has to keep the pair
 * consistent, which it does by construction.
 */
export type ErasedTypedViewDeclaration = TypedViewDeclaration<never>;

/**
 * Declare a view reached by the operation that produced its Evidence.
 *
 * This is the common case: one projector, the operations it serves, nothing
 * else. The projector signature is the one every existing `*View.ts` module
 * already exports, so most modules declare without changing their body.
 */
export const retainedView = (declaration: {
  readonly operations: Operations;
  readonly project: RetainedProjector;
  readonly predicate?: string;
}): RetainedViewDeclaration => ({ mode: "retained", ...declaration });

/** Declare a view that decodes its parent report before projecting. */
export const typedView = <Report>(declaration: {
  readonly operations: Operations;
  readonly read: ParentReader<Report>;
  readonly project: TypedProjector<Report>;
}): ViewDeclaration =>
  ({ mode: "typed", ...declaration }) as unknown as ErasedTypedViewDeclaration;

/** Declare a view reached by parent operation ahead of kind dispatch. */
export const operationView = (declaration: {
  readonly operations: Operations;
  readonly project: RetainedProjector;
}): OperationViewDeclaration => ({ mode: "operation", ...declaration });

/** Declare the view kinds one capture groups, sharing its parent operation. */
export const groupingView = (declaration: {
  readonly operations: Operations;
  readonly slots: readonly GroupingSlot[];
}): GroupingViewDeclaration => ({ mode: "grouping", ...declaration });

/** Declare a view reached by its kind, in declaration order. */
export const kindView = (declaration: {
  readonly kinds: ViewKinds;
  readonly project: RetainedProjector;
}): KindViewDeclaration => ({ mode: "kind", ...declaration });
