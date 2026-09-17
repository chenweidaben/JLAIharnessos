/**
 * 健澜科技数智医院智能体 - integration/protocols/fhir/index.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - FHIR R4 协议模块统一导出
 *
 * 版权所有 (c) 2026 健澜科技
 */

export { FHIRBuilder, FHIRBundleBuilder } from './FHIRBuilder';
export type {
  FHIRClientConfig,
  FHIROperationResult,
  FHIRSearchParams,
  FHIRSearchResult,
} from './FHIRClient';
export { FHIRClient, FHIRClientError } from './FHIRClient';
export type { FHIRBundle, FHIRBundleEntry, FHIRParseResult, FHIRReferenceInfo } from './FHIRParser';
export { FHIRParser } from './FHIRParser';
export type {
  FHIRAddress,
  FHIRBaseResource,
  FHIRCodeableConcept,
  FHIRCoding,
  FHIRContactPoint,
  FHIRExtension,
  FHIRHumanName,
  FHIRIdentifier,
  FHIRNarrative,
  FHIRPeriod,
  FHIRQuantity,
  FHIRRange,
  FHIRReference,
  FHIRResource,
  FHIRResourceType,
  FHIRValidationIssue,
  FHIRValidationResult,
} from './FHIRResource';
export { FHIRResourceModel, SUPPORTED_RESOURCE_TYPES } from './FHIRResource';
