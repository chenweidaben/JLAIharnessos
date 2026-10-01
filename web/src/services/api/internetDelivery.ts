/**
 * 健澜科技 jlmedaios - 互联网配送/报告 API 服务（M3-N）
 *
 * 全部走真实 BFF 请求（相对路径），绝不内置假数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get, post } from '@/api/client';
import type {
  PrescriptionDeliveryView,
  PatientReportsView,
} from '../../types/internetDelivery';
import type { EPrescriptionView } from '../../types/internetPrescription';

export interface CreateDeliveryPayload {
  rxId: string;
  channel: 'self_pick' | 'express';
  address?: string;
}

export interface FulfillPayload {
  deliveryId: string;
  to: 'packed' | 'shipped' | 'delivered' | 'picked_up' | 'cancelled';
  courierCompany?: string;
  trackingNo?: string;
}

export interface DeliveryCreateResult {
  result: 'created' | 'exists';
  delivery: PrescriptionDeliveryView;
  rx: EPrescriptionView;
}

export const internetDeliveryApi = {
  /** 药房/财务：创建配送单（自取 / 快递） */
  create: (payload: CreateDeliveryPayload) =>
    post<DeliveryCreateResult>('/internet/delivery/create', payload),

  /** 药房：履约状态推进 */
  fulfill: (payload: FulfillPayload) =>
    post<{ delivery: PrescriptionDeliveryView }>('/internet/delivery/fulfill', payload),

  /** 药房：全部配送单 */
  all: (status?: string) =>
    get<{ deliveries: PrescriptionDeliveryView[] }>(
      `/internet/delivery/all${status ? `?status=${status}` : ''}`,
    ),

  /** 药房：可配送处方（已支付） */
  paidRx: () =>
    get<{ rxList: EPrescriptionView[] }>('/internet/delivery/paid-rx'),

  /** 患者：我的配送单 */
  my: (patientId: string) =>
    get<{ deliveries: PrescriptionDeliveryView[] }>(
      `/internet/delivery/my?patientId=${encodeURIComponent(patientId)}`,
    ),

  /** 患者：本人报告 */
  myReports: (patientId: string, visitId?: string) =>
    get<PatientReportsView>(
      `/internet/reports/my?patientId=${encodeURIComponent(patientId)}${visitId ? `&visitId=${encodeURIComponent(visitId)}` : ''}`,
    ),

  /** 医护：指定患者报告 */
  staffReports: (patientId: string, visitId?: string) =>
    get<PatientReportsView>(
      `/internet/reports?patientId=${encodeURIComponent(patientId)}${visitId ? `&visitId=${encodeURIComponent(visitId)}` : ''}`,
    ),
};
