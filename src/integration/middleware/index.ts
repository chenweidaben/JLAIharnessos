/**
 * 健澜科技数智医院智能体 - integration/middleware/index.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 集成中间件模块统一导出
 *
 * 版权所有 (c) 2026 健澜科技
 */

export type {
  AdapterStatusChangedPayload,
  EmrRecordCreatedPayload,
  EmrRecordSignedPayload,
  EventPayloadMap,
  ImagingReportReadyPayload,
  IntegrationEventTypeValue,
  LabCriticalValuePayload,
  LabResultReadyPayload,
  OrderCancelledPayload,
  OrderCompletedPayload,
  OrderCreatedPayload,
  PatientAdmittedPayload,
  PatientDischargedPayload,
  PatientRegisteredPayload,
  PatientTransferredPayload,
  QcAlertPayload,
  SystemErrorPayload,
} from './EventTypes';
export { EVENT_DEFAULT_PRIORITY, IntegrationEventType } from './EventTypes';
export type { FieldMapperConfig, MappingDirection, MappingResult } from './FieldMapper';
export { COMMON_CODE_MAPPINGS, COMMON_UNIT_CONVERSIONS } from './FieldMapper';
export { FieldMapper } from './FieldMapper';
export type { BusStats, EventHandler, SubscriptionOptions } from './IntegrationBus';
export { IntegrationBus, publishEvent } from './IntegrationBus';
