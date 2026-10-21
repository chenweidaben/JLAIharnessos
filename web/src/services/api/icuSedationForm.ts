/**
 * 健澜科技 jlmedaios - ICU 镇静 RASS/Ramsay 评估 API（M521-F，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/icu-sedations?visitId=  权限码 icu:view
 *   POST /api/v1/icu-sedations            权限码 icu:sedation
 *
 * 后端契约：POST body 仅接受 visitId / actualRass / targetRass / ramsay / ventilated；
 * 目标区间偏离判定由前端纯函数兜底（目标 RASS 区间 −2~0）。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* RASS −5…+4 行为释义（英文数字 key，中文 label 由 LABEL map 映射）    */
/* ------------------------------------------------------------------ */

export type RassScore = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4;

export const RASS_LABEL: Record<number, string> = {
  [-5]: '−5 不能唤醒',
  [-4]: '−4 对强刺激仅有反应',
  [-3]: '−3 对强听觉刺激有反应',
  [-2]: '−2 对轻叩或轻推有反应',
  [-1]: '−1 不安但非激越',
  [0]: '0 平静合作',
  [1]: '+1 烦躁不安',
  [2]: '+2 轻度激越',
  [3]: '+3 中度激越',
  [4]: '+4 有攻击性',
};

export const RASS_OPTIONS: RassScore[] = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4];

/* ------------------------------------------------------------------ */
/* Ramsay 1–6                                                          */
/* ------------------------------------------------------------------ */

export type RamsayScore = 1 | 2 | 3 | 4 | 5 | 6;

export const RAMSAY_LABEL: Record<RamsayScore, string> = {
  1: '1 焦虑躁动',
  2: '2 合作定向好',
  3: '3 对指令有反应',
  4: '4 入睡对声刺激反应灵敏',
  5: '5 入睡对声刺激反应迟钝',
  6: '6 深睡不能唤醒',
};

export const RAMSAY_OPTIONS: RamsayScore[] = [1, 2, 3, 4, 5, 6];

export type Ventilated = 'yes' | 'no';

export const VENTILATED_LABEL: Record<Ventilated, string> = {
  yes: '机械通气',
  no: '自主呼吸',
};

/* ------------------------------------------------------------------ */
/* 镇静状态纯函数（目标 RASS 区间 −2~0）                                */
/* ------------------------------------------------------------------ */

/** 实测 RASS ≤−2 或 ≥+2 → 超出目标区间，需通知医师调整镇静方案 */
export function needsAdjustSedation(actualRass: number): boolean {
  return actualRass <= -2 || actualRass >= 2;
}

/** 达标 −2~0；偏离 ±1 外（即超出目标区间）橙色警示 */
export function sedationZone(actualRass: number): 'ontarget' | 'offtarget' {
  return actualRass >= -2 && actualRass <= 0 ? 'ontarget' : 'offtarget';
}

export const SEDATION_ZONE_COLOR: Record<'ontarget' | 'offtarget', string> = {
  ontarget: 'green',
  offtarget: 'orange',
};

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface IcuSedationRecord {
  id: string;
  visitId: string;
  actualRass: number;
  targetRass: number;
  ramsay: RamsayScore;
  ventilated: Ventilated;
  assessedAt: string;
  needsAdjust: boolean;
  demo?: boolean;
  patientId?: string;
  patientName?: string;
  signature?: string;
  assessorName?: string;
}

export interface IcuSedationSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  actualRass: RassScore;
  targetRass: RassScore;
  ramsay: RamsayScore;
  ventilated: Ventilated;
  assessedAt: string;
  signature: string;
  assessorName?: string;
}

export interface IcuSedationListResult {
  data: IcuSedationRecord[];
  demo: boolean;
}

export interface IcuSedationSubmitResult {
  record: IcuSedationRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* DEMO 兜底记录                                                        */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: IcuSedationRecord[] = [
  {
    id: 'SED-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    actualRass: -1,
    targetRass: -1,
    ramsay: 3,
    ventilated: 'yes',
    assessedAt: new Date().toISOString(),
    needsAdjust: false,
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
  {
    id: 'SED-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    actualRass: 2,
    targetRass: -1,
    ramsay: 2,
    ventilated: 'yes',
    assessedAt: new Date(Date.now() - 3600_000).toISOString(),
    needsAdjust: true,
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
];

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

export async function fetchIcuSedations(visitId?: string): Promise<IcuSedationListResult> {
  try {
    const res = await get<IcuSedationRecord[]>('/icu-sedations', visitId ? { visitId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) {
      const data = items.map((r) => ({ ...r, needsAdjust: r.needsAdjust ?? needsAdjustSedation(r.actualRass), demo: false }));
      return { data, demo: false };
    }
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

export async function submitIcuSedation(input: IcuSedationSubmitInput): Promise<IcuSedationSubmitResult> {
  const payload = {
    visitId: input.visitId,
    actualRass: input.actualRass,
    targetRass: input.targetRass,
    ramsay: input.ramsay,
    ventilated: input.ventilated,
  };
  try {
    const res = await post<IcuSedationRecord>('/icu-sedations', payload);
    const record: IcuSedationRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      signature: input.signature,
      assessorName: input.assessorName,
      needsAdjust: res.needsAdjust ?? needsAdjustSedation(input.actualRass),
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const record: IcuSedationRecord = {
      id: `SED-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      patientId: input.patientId,
      patientName: input.patientName,
      actualRass: input.actualRass,
      targetRass: input.targetRass,
      ramsay: input.ramsay,
      ventilated: input.ventilated,
      assessedAt: input.assessedAt,
      needsAdjust: needsAdjustSedation(input.actualRass),
      signature: input.signature,
      assessorName: input.assessorName,
      demo: true,
    };
    return { record, demo: true };
  }
}
