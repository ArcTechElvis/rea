import type { ViewDeclaration } from "./viewDeclaration.js";
import { androidJniViewDeclarations } from "./androidJniView.js";
import { androidPackageViewDeclarations } from "./androidPackageView.js";
import { androidSymbolViewDeclarations } from "./androidSymbolView.js";
import { apiContractViewDeclarations } from "./apiContractView.js";
import { apkSignatureViewDeclarations } from "./apkSignatureView.js";
import { artifactInventoryViewDeclarations } from "./artifactInventoryView.js";
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
import { il2cppMetadataViewDeclarations } from "./il2cppMetadataView.js";
import { interfaceBuilderViewDeclarations } from "./interfaceBuilderView.js";
import { machoViewDeclarations } from "./machoView.js";
import { managedArtifactViewDeclarations } from "./managedArtifactView.js";
import { managedMemberViewDeclarations } from "./managedMemberView.js";
import { modelArtifactViewDeclarations } from "./modelArtifactView.js";
import { nativeExportsViewDeclarations } from "./nativeExportsView.js";
import { nativeFeatureTraceViewDeclarations } from "./nativeFeatureTraceView.js";
import { nativeFunctionMatchingViewDeclarations } from "./nativeFunctionMatchingView.js";
import { nativeInstructionReferencesViewDeclarations } from "./nativeInstructionReferencesView.js";
import { nativeInventoryViewDeclarations } from "./nativeInventoryView.js";
import { nativeLoadImageViewDeclarations } from "./nativeLoadImageView.js";
import { nativeObservationViewDeclarations } from "./nativeObservationView.js";
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
 * Every view declaration the analysis-view domain owns.
 *
 * Each view module declares the operations and projector it is responsible for;
 * this list is the one place those declarations are collected. `analysisView.ts`
 * folds it into its dispatch tables, and `viewDeclarations.test.ts` asserts the
 * fold matches the operations the projection path serves.
 *
 * Adding a view means adding its module and one entry here. Nothing else in the
 * dispatch path needs to change, which is the point of the migration.
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
  nativeInventoryViewDeclarations,
  nativeLoadImageViewDeclarations,
  nativeObservationViewDeclarations,
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
