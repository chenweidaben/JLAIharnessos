/**
 * 健澜科技 jlmedaios - VTE 抗凝疗程 API（M521-C，P0 首批）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/vte-anticoag?visitId=   权限码 vte:view
 *   POST /api/v1/vte-anticoag            权限码 vte:anticoagulate
 *   PATCH /api/v1/vte-anticoag/:id/bleeding  权限码 vte:anticoagulate
 *   POST /api/v1/vte-anticoag/:id/stop       权限码 vte:anticoagulate
 *
 * 后端契约严格对齐（src/bff/aggregators/vteAnticoagAggregator.ts）：
 *   POST body 仅接受 visitId / drug / startDate / plannedDays；
 *   PATCH body 仅接受 score；停用 body 仅接受 endDate；
 *   风险评分（Caprini/Padua）等扩展采集项聚合进 note 备注，
 *   不向后端发送未定义字段导致 400。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post, patch } from '../request';
import { ROUTE_LABEL, type MedicationRoute } from './clinicalDict';

/* ------------------------------------------------------------------ */
/* 药品字典（前端本地结构化枚举，提交英文 key，展示中文通用名）            */
/* ------------------------------------------------------------------ */

export type VteDrug = 'enoxaparin' | 'warfarin' | 'rivaroxaban';

export interface VteDrugMeta {
  genericName: string;
  spec: string;
  unit: string;
  dosage: string;
  route: MedicationRoute;
  contraindications: string[];
}

export const VTE_DRUGS: Record<VteDrug, VteDrugMeta> = {
  enoxaparin: {
    genericName: '依诺肝素钠注射液',
    spec: '4000IU/支',
    unit: '支',
    dosage: '4000IU/次，1 次/日',
    route: 'subcutaneous',
    contraindications: ['活动性出血', '血小板减少', '近期颅内出血'],
  },
  warfarin: {
    genericName: '华法林钠片',
    spec: '2.5mg/片',
    unit: '片',
    dosage: '2.5–5mg/次，1 次/日（按 INR 调量）',
    route: 'oral',
    contraindications: ['活动性出血', '妊娠', '严重肝病'],
  },
  rivaroxaban: {
    genericName: '利伐沙班片',
    spec: '10mg/片',
    unit: '片',
    dosage: '10mg/次，1 次/日',
    route: 'oral',
    contraindications: ['活动性出血', '严重肾衰', '肝硬化'],
  },
};

export const VTE_DRUG_LABEL: Record<VteDrug, string> = {
  enoxaparin: '依诺肝素钠注射液',
  warfarin: '华法林钠片',
  rivaroxaban: '利伐沙班片',
};

/** 给药途径中文（复用共享字典映射） */
export function vteDrugRouteLabel(drug: VteDrug): string {
  return ROUTE_LABEL[VTE_DRUGS[drug].route];
}

/* ------------------------------------------------------------------ */
/* 疗程状态机（前端派生，不向后端越级）                                  */
/* ------------------------------------------------------------------ */

export type VteCourseStatus = 'planned' | 'active' | 'completed' | 'stopped';

export const VTE_STATUS_LABEL: Record<VteCourseStatus, string> = {
  planned: '待启动',
  active: '处理中',
  completed: '已完成',
  stopped: '已停用',
};

export const VTE_STATUS_COLOR: Record<VteCourseStatus, string> = {
  planned: 'orange',
  active: 'blue',
  completed: 'green',
  stopped: 'default',
};

/* ------------------------------------------------------------------ */
/* 出血评分分级（阈值与后端 highBleedingRisk 一致：≥40 高危）           */
/* ------------------------------------------------------------------ */

export type VteBleedingLevel = 'low' | 'medium' | 'high';

export const BLEEDING_LABEL: Record<VteBleedingLevel, string> = {
  low: '低出血风险',
  medium: '中出血风险',
  high: '高出血风险',
};

export const BLEEDING_COLOR: Record<VteBleedingLevel, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

/** 出血评分分级：<20 绿 / 20–39 橙 / ≥40 红 */
export function bleedingLevelOf(score: number): VteBleedingLevel {
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

/** ≥40 为高出血风险，须医师复核签名 */
export function isHighBleedingRisk(score: number): boolean {
  return score >= 40;
}

/* ------------------------------------------------------------------ */
/* 疗程进度纯函数（与后端 courseProgress 同口径，封顶 100）              */
/* ------------------------------------------------------------------ */

export function courseProgress(startIso: string, plannedDays: number, today: Date = new Date()): number {
  const start = new Date(startIso);
  const elapsed = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  if (elapsed < 0) return 0;
  if (elapsed >= plannedDays) return 100;
  return Math.round((elapsed / plannedDays) * 100);
}

/**
 * 状态派生：
 *  - active=false 且 endDate 存在 → stopped 已停用（灰）
 *  - 未到启动日 → planned 待启动（橙）
 *  - active 且进度 ≥100 → completed 已完成（绿）
 *  - 其余 active=true 且未结束 → active 处理中（蓝）
 */
export function deriveStatus(
  rec: Pick<VteAnticoagRecord, 'active' | 'endDate' | 'startDate' | 'plannedDays'>,
  today: Date = new Date(),
): VteCourseStatus {
  if (!rec.active && rec.endDate) return 'stopped';
  if (new Date(rec.startDate) > today) return 'planned';
  if (rec.active && courseProgress(rec.startDate, rec.plannedDays, today) >= 100) return 'completed';
  return 'active';
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface VteAnticoagRecord {
  id: string;
  visitId: string;
  drug: VteDrug;
  startDate: string;
  endDate: string | null;
  plannedDays: number;
  bleedingScore: number;
  active: boolean;
  note: string | null;
  createdBy: string;
  createdAt: string;
  /** 扩展采集项（后端契约暂未持久化，本地/演示记录用于页面展示） */
  patientId?: string;
  patientName?: string;
  signature?: string;
  reviewSignature?: string;
  capriniScore?: number;
  paduaScore?: number;
  reviewTaskId?: string | null;
  demo?: boolean;
}

export interface VteAnticoagSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  drug: VteDrug;
  startDate: string;
  plannedDays: number;
  signature: string;
  capriniScore?: number;
  paduaScore?: number;
  note?: string;
}

export interface BleedingInput {
  score: number;
  reviewSignature?: string;
}

export interface StopInput {
  endDate: string;
}

export interface VteListResult {
  data: VteAnticoagRecord[];
  demo: boolean;
}

export interface VteSubmitResult {
  record: VteAnticoagRecord;
  demo: boolean;
}

export interface VteBleedingResult {
  record: VteAnticoagRecord;
  demo: boolean;
}

export interface VteStopResult {
  record: VteAnticoagRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* 确定性 DEMO 兜底记录                                                 */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: VteAnticoagRecord[] = [
  {
    id: 'VTE-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    drug: 'enoxaparin',
    startDate: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
    endDate: null,
    plannedDays: 14,
    bleedingScore: 12,
    active: true,
    note: 'Caprini 6 分；Padua 4 分；高危，建议药物预防联合机械预防（IPC）。',
    createdBy: '陈医师',
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    signature: '陈医师',
    capriniScore: 6,
    paduaScore: 4,
    demo: true,
  },
  {
    id: 'VTE-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    drug: 'warfarin',
    startDate: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() - 1 * 86_400_000).toISOString().slice(0, 10),
    plannedDays: 30,
    bleedingScore: 25,
    active: false,
    note: 'Caprini 3 分；Padua 2 分；疗程届满停用，复查 INR 达标。',
    createdBy: '陈医师',
    createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    signature: '陈医师',
    capriniScore: 3,
    paduaScore: 2,
    demo: true,
  },
];

/** 把风险评分等扩展采集项聚合进后端允许的备注字段，避免发送未定义 key */
function buildNote(input: VteAnticoagSubmitInput): string | undefined {
  const parts: string[] = [];
  if (input.capriniScore != null) parts.push(`Caprini ${input.capriniScore} 分`);
  if (input.paduaScore != null) parts.push(`Padua ${input.paduaScore} 分`);
  if (input.note?.trim()) parts.push(input.note.trim());
  return parts.length > 0 ? parts.join('；') : undefined;
}

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

/** 查询抗凝疗程记录（按就诊过滤；BFF 失败返回 DEMO 列表并打标） */
export async function fetchVteAnticoagRecords(visitId?: string): Promise<VteListResult> {
  try {
    const res = await get<VteAnticoagRecord[]>('/vte-anticoag', visitId ? { visitId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

/** 启动抗凝疗程；真实落库失败时降级为本地演示记录，绝不伪造成功提示 */
export async function submitVteAnticoag(input: VteAnticoagSubmitInput): Promise<VteSubmitResult> {
  const payload = {
    visitId: input.visitId,
    drug: input.drug,
    startDate: input.startDate,
    plannedDays: input.plannedDays,
  };
  try {
    const res = await post<VteAnticoagRecord>('/vte-anticoag', payload);
    const record: VteAnticoagRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      signature: input.signature,
      capriniScore: input.capriniScore,
      paduaScore: input.paduaScore,
      note: res.note ?? buildNote(input) ?? null,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    const demoRecord: VteAnticoagRecord = {
      id: `VTE-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      patientId: input.patientId,
      patientName: input.patientName,
      drug: input.drug,
      startDate: input.startDate,
      endDate: null,
      plannedDays: input.plannedDays,
      bleedingScore: 0,
      active: true,
      note: buildNote(input) ?? null,
      createdBy: input.signature,
      createdAt: new Date().toISOString(),
      signature: input.signature,
      capriniScore: input.capriniScore,
      paduaScore: input.paduaScore,
      demo: true,
    };
    void err;
    return { record: demoRecord, demo: true };
  }
}

/** 记录出血评分；BFF 失败时在原记录上合并本地演示结果并打标 */
export async function recordBleedingScore(original: VteAnticoagRecord, input: BleedingInput): Promise<VteBleedingResult> {
  try {
    const res = await patch<VteAnticoagRecord & { taskId?: string | null }>(
      `/vte-anticoag/${original.id}/bleeding`,
      { score: input.score },
    );
    const record: VteAnticoagRecord = {
      ...res,
      reviewSignature: input.reviewSignature,
      reviewTaskId: res.taskId ?? null,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const record: VteAnticoagRecord = {
      ...original,
      bleedingScore: input.score,
      reviewSignature: input.reviewSignature,
      demo: true,
    };
    return { record, demo: true };
  }
}

/** 停用抗凝疗程；BFF 失败时在原记录上合并本地演示结果并打标 */
export async function stopAnticoag(original: VteAnticoagRecord, input: StopInput): Promise<VteStopResult> {
  try {
    const res = await post<VteAnticoagRecord>(`/vte-anticoag/${original.id}/stop`, { endDate: input.endDate });
    return { record: { ...res, demo: false }, demo: false };
  } catch (err) {
    void err;
    const record: VteAnticoagRecord = {
      ...original,
      active: false,
      endDate: input.endDate,
      demo: true,
    };
    return { record, demo: true };
  }
}
