/**
 * 健澜科技数智医院智能体 - integration/adapters/his/index.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - HIS适配器模块导出
 *
 * 版权所有 (c) 2026 健澜科技
 */

export type { VendorBHISConfig } from './VendorBHISAdapter';
export { VendorBHISAdapter } from './VendorBHISAdapter';
export type { VendorCHISConfig } from './VendorCHISAdapter';
export { VendorCHISAdapter } from './VendorCHISAdapter';
export type {
  AsyncTask,
  AsyncTaskStatus,
  BatchOrderResult,
  HISAdapter,
  OrderEvent,
  OrderEventType,
  PatientEvent,
  PatientEventType,
  PatientSyncResult,
} from './HISAdapter';
export type { CriticalValuePush, HISMockConfig } from './HISMockAdapter';
export { HISMockAdapter } from './HISMockAdapter';
export type { VendorDHISConfig } from './VendorDHISAdapter';
export { VendorDHISAdapter } from './VendorDHISAdapter';
export type { VendorAHISConfig } from './VendorAHISAdapter';
export { VendorAHISAdapter } from './VendorAHISAdapter';
export type { VendorEHISConfig } from './VendorEHISAdapter';
export { VendorEHISAdapter } from './VendorEHISAdapter';
