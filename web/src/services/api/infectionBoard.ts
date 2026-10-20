/**
 * 健澜科技 jlmedaios - 院感监控看板 API（M481）
 * 对接 BFF /api/v1/infection/* ：
 *   - /infection/hospital-acquired  院感千日发生率
 *   - /infection/hand-hygiene       手卫生依从
 *   - /infection/multidrug-resistant 多重耐药菌
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface HaiRow {
  id: string;
  type: string; // VAP / CLABSI / CAUTI / SSI
  dept: string;
  infections: number;
  deviceDays: number;
  rate: number; // 千日发生率
  benchmark: number;
  demo?: boolean;
}

export interface HandHygieneRow {
  id: string;
  dept: string;
  observations: number;
  performed: number;
  rate: number; // %
  complianceBenchmark: number;
  demo?: boolean;
}

export interface MdrRow {
  id: string;
  bug: string; // MRSA / CRE / CRAB / MRPA / VRE
  dept: string;
  detected: number;
  isolated: number;
  contactPrecautions: boolean;
  demo?: boolean;
}

export interface PatientEventRow {
  id: string;
  type: string; // 跌倒/压疮/给药错误/身份识别/导管滑脱
  dept: string;
  severity: 'sentinel' | 'severe' | 'moderate' | 'minor';
  occurredAt: string;
  status: 'open' | 'acknowledged' | 'rca-done' | 'closed';
  demo?: boolean;
}

export interface RcaRow {
  id: string;
  event: string;
  dept: string;
  rootCause: string;
  action: string;
  owner: string;
  dueAt: string;
  status: 'open' | 'in-progress' | 'done';
  demo?: boolean;
}

const DEMO_HAI: HaiRow[] = [
  { id: 'h-1', type: 'VAP', dept: '综合 ICU', infections: 2, deviceDays: 180, rate: 11.11, benchmark: 5.0, demo: true },
  { id: 'h-2', type: 'CLABSI', dept: '综合 ICU', infections: 1, deviceDays: 220, rate: 4.55, benchmark: 2.0, demo: true },
  { id: 'h-3', type: 'CAUTI', dept: '神经内科', infections: 3, deviceDays: 480, rate: 6.25, benchmark: 3.0, demo: true },
  { id: 'h-4', type: 'SSI', dept: '普外科', infections: 4, deviceDays: 860, rate: 4.65, benchmark: 5.0, demo: true },
  { id: 'h-5', type: 'VAP', dept: '心外 ICU', infections: 1, deviceDays: 150, rate: 6.67, benchmark: 5.0, demo: true },
];

const DEMO_HAND: HandHygieneRow[] = [
  { id: 'hh-1', dept: '综合 ICU', observations: 420, performed: 378, rate: 90.0, complianceBenchmark: 90, demo: true },
  { id: 'hh-2', dept: '心内科一病区', observations: 380, performed: 312, rate: 82.1, complianceBenchmark: 90, demo: true },
  { id: 'hh-3', dept: '普外科', observations: 350, performed: 298, rate: 85.1, complianceBenchmark: 90, demo: true },
  { id: 'hh-4', dept: '呼吸内科', observations: 310, performed: 295, rate: 95.2, complianceBenchmark: 90, demo: true },
  { id: 'hh-5', dept: '急诊科', observations: 280, performed: 224, rate: 80.0, complianceBenchmark: 90, demo: true },
];

const DEMO_MDR: MdrRow[] = [
  { id: 'm-1', bug: 'MRSA', dept: '呼吸内科', detected: 5, isolated: 5, contactPrecautions: true, demo: true },
  { id: 'm-2', bug: 'CRE', dept: '综合 ICU', detected: 3, isolated: 3, contactPrecautions: true, demo: true },
  { id: 'm-3', bug: 'CRAB', dept: '神经外科', detected: 4, isolated: 3, contactPrecautions: true, demo: true },
  { id: 'm-4', bug: 'MRPA', dept: '急诊科', detected: 2, isolated: 2, contactPrecautions: true, demo: true },
  { id: 'm-5', bug: 'VRE', dept: '消化内科', detected: 1, isolated: 1, contactPrecautions: true, demo: true },
];

const DEMO_EVENTS: PatientEventRow[] = [
  { id: 'e-1', type: '住院患者跌倒', dept: '老年医学科', severity: 'severe', occurredAt: '2026-10-19 22:10', status: 'rca-done', demo: true },
  { id: 'e-2', type: '压力性损伤(III期)', dept: '神经内科', severity: 'moderate', occurredAt: '2026-10-19 14:30', status: 'acknowledged', demo: true },
  { id: 'e-3', type: '给药错误(剂量偏差)', dept: '儿科', severity: 'sentinel', occurredAt: '2026-10-20 09:15', status: 'open', demo: true },
  { id: 'e-4', type: '导管滑脱(尿管)', dept: '普外科', severity: 'moderate', occurredAt: '2026-10-19 06:40', status: 'closed', demo: true },
  { id: 'e-5', type: '身份识别错误(未遂)', dept: '检验科', severity: 'minor', occurredAt: '2026-10-18 11:20', status: 'closed', demo: true },
];

const DEMO_RCA: RcaRow[] = [
  { id: 'rca-1', event: '儿科给药错误(剂量偏差)', dept: '儿科', rootCause: '双人核对流程未执行 + 药房标签打印错误', action: '重启双人核对 + 标签复核岗', owner: '护理部-王**', dueAt: '2026-11-15', status: 'open', demo: true },
  { id: 'rca-2', event: '老年科跌倒', dept: '老年医学科', rootCause: '夜间巡视间隔过长 + 床栏未拉起', action: '夜间高危患者 2h 巡视 + 床栏强制拉起', owner: '护理部-李**', dueAt: '2026-10-30', status: 'in-progress', demo: true },
  { id: 'rca-3', event: '神经内科 III 期压疮', dept: '神经内科', rootCause: '气垫床未按时翻身', action: '启用翻身提醒 + 减压贴', owner: '护理部-赵**', dueAt: '2026-10-25', status: 'done', demo: true },
];

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchHospitalAcquired = () =>
  safeGet<HaiRow>('/infection/hospital-acquired', DEMO_HAI);
export const fetchHandHygiene = () =>
  safeGet<HandHygieneRow>('/infection/hand-hygiene', DEMO_HAND);
export const fetchMDRO = () =>
  safeGet<MdrRow>('/infection/multidrug-resistant', DEMO_MDR);
export const fetchPatientEvents = () =>
  safeGet<PatientEventRow>('/patient-safety/events', DEMO_EVENTS);
export const fetchRCA = () =>
  safeGet<RcaRow>('/patient-safety/rca', DEMO_RCA);
