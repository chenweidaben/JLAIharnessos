/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医嘱 / 处方 / 检验结果相关 API。
 *  - 真实模式：走 BFF 医疗工具网关 POST /api/v1/medical/:toolName（与后端 medical-tools 对齐）。
 *  - 演示模式：短路到 web/src/mock/medical.ts。
 *
 * TODO(P2): 待 BFF 暴露细粒度 REST（如 /orders、/prescriptions 资源路由）后，
 *           将下列方法替换为面向资源的 GET/POST/PUT，并补充列表分页参数。
 */
import { get, post } from './client';
import { isDemoMode } from '@/config';
import { delay } from '@/mock/utils';
import { medicalToolResults, fallbackToolResult, type ToolResult } from '@/mock/medical';
import type { MedicalOrder, Prescription, LabReport } from '@/types/medical';

/** 调用医疗工具网关的底层方法 */
async function callTool<T>(toolName: string, params: Record<string, unknown> = {}): Promise<ToolResult<T>> {
  if (isDemoMode) {
    await delay(120, 300);
    return (medicalToolResults[toolName] ?? fallbackToolResult(toolName)) as ToolResult<T>;
  }
  return post<ToolResult<T>>(`/medical/${toolName}`, params);
}

/* -------------------------------- 医嘱 -------------------------------- */

export async function listOrders(params: { patientId?: string } = {}): Promise<MedicalOrder[]> {
  // TODO(P2): 接入真实医嘱列表接口后改为 get<MedicalOrder[]>('/orders', params)
  const r = await callTool<{ list: MedicalOrder[] }>('get_order_list', params);
  return (r.data as { list?: MedicalOrder[] })?.list ?? [];
}

export async function createOrder(payload: Record<string, unknown>): Promise<MedicalOrder> {
  const r = await callTool<MedicalOrder>('create_order', payload);
  return r.data as MedicalOrder;
}

export async function cancelOrder(orderId: string): Promise<void> {
  await callTool('cancel_order', { orderId });
}

/* -------------------------------- 处方 -------------------------------- */

export async function listPrescriptions(params: { patientId?: string } = {}): Promise<Prescription[]> {
  // TODO(P2): 接入真实处方列表接口后改为 get<Prescription[]>('/prescriptions', params)
  const r = await callTool<{ list: Prescription[] }>('get_prescription_list', params);
  return (r.data as { list?: Prescription[] })?.list ?? [];
}

export async function createPrescription(payload: Record<string, unknown>): Promise<Prescription> {
  const r = callTool<Prescription>('create_prescription', payload);
  return (await r) as unknown as Prescription;
}

export async function auditPrescription(prescriptionId: string, pass: boolean): Promise<void> {
  await callTool('prescription_audit', { prescriptionId, pass });
}

/* -------------------------------- 检验 -------------------------------- */

export async function getLabResults(params: { patientId?: string } = {}): Promise<LabReport[]> {
  if (isDemoMode) {
    await delay(120, 260);
    return [];
  }
  // 患者360 已聚合检验报告；独立检验列表走 /patients/:id/labs
  const patientId = params.patientId;
  if (patientId) return get<LabReport[]>(`/patients/${patientId}/labs`);
  return get<LabReport[]>('/patients/labs');
}
