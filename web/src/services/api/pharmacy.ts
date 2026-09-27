/**
 * 健澜科技 jlmedaios - 药房调剂发药 API 服务（M2-A）
 *
 * 真实 BFF（src/bff/routes/pharmacy.ts）。全部读写 PostgreSQL，无 mock。
 *  - 待审方/待发药队列；药师审方；发药前 CDS 预览；调剂发药；
 *  - 发药记录、库存与库存流水；CDS block 医师 override。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { get, post } from '../request';
import type {
  CdsPreview,
  DispensePayload,
  DispenseResult,
  DispensingDto,
  InventoryDto,
  InventoryMovementDto,
  PharmacyHealth,
  PharmacyQueueItem,
  PrescriptionDto,
} from '@/types/pharmacy';

/* ------------------------------ 健康探活 ------------------------------- */

/** 系统健康探针（BFF + DB），门禁依据。 */
export function getSystemHealth(): Promise<PharmacyHealth> {
  return get<PharmacyHealth>('/system/health');
}

/* -------------------------------- 队列 --------------------------------- */

/** 待发药队列（approved 处方）。 */
export function fetchDispenseQueue(): Promise<PharmacyQueueItem[]> {
  return get<PharmacyQueueItem[]>('/pharmacy/queue/dispense');
}

/** 待审方队列（pending_review 处方）。 */
export function fetchReviewQueue(): Promise<PharmacyQueueItem[]> {
  return get<PharmacyQueueItem[]>('/pharmacy/queue/review');
}

/* ----------------------------- 审方 / CDS ------------------------------ */

/** 药师审方：approved / rejected。 */
export function reviewPrescription(
  id: string,
  decision: 'approved' | 'rejected',
  comment?: string | null,
): Promise<PrescriptionDto> {
  return post<PrescriptionDto>(`/pharmacy/prescriptions/${id}/review`, {
    decision,
    comment: comment ?? null,
  });
}

/** 发药前 CDS 预览（过敏/相互作用/禁忌）。 */
export function previewCds(id: string): Promise<CdsPreview> {
  return get<CdsPreview>(`/pharmacy/prescriptions/${id}/cds`);
}

/* -------------------------------- 发药 --------------------------------- */

/** 调剂发药（FEFO 扣库存 + 流水 + 发药记录 + 处方置 dispensed）。 */
export function dispense(
  id: string,
  payload: DispensePayload,
): Promise<DispenseResult> {
  return post<DispenseResult>(
    `/pharmacy/prescriptions/${id}/dispense`,
    payload,
  );
}

/* ------------------------------ 发药记录 ------------------------------- */

/** 发药记录（可按处方过滤）。 */
export function fetchDispensings(prescriptionId?: string): Promise<DispensingDto[]> {
  return get<DispensingDto[]>('/pharmacy/dispensings', {
    ...(prescriptionId ? { prescriptionId } : {}),
  });
}

/* ----------------------------- 库存 / 流水 ----------------------------- */

/** 库存查询（可按药房/关键字）。 */
export function fetchInventory(params?: {
  warehouse?: string;
  keyword?: string;
}): Promise<InventoryDto[]> {
  return get<InventoryDto[]>('/pharmacy/inventory', params);
}

/** 库存流水（可按药品/药房/原因）。 */
export function fetchMovements(params?: {
  drugId?: string;
  warehouse?: string;
  reason?: string;
}): Promise<InventoryMovementDto[]> {
  return get<InventoryMovementDto[]>('/pharmacy/inventory/movements', params);
}

/** 按就诊查处方（定位）。 */
export function fetchPrescriptionsByVisit(
  visitId: string,
): Promise<PrescriptionDto[]> {
  return get<PrescriptionDto[]>('/pharmacy/prescriptions', { visitId });
}
