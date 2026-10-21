/**
 * 健澜科技 jlmedaios - 创伤 NISS 评分 API（M534，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/trauma/niss?visitId=  权限码 trauma:view
 *   POST /api/v1/trauma/niss            权限码 trauma:niss
 *
 * 后端契约：POST body 仅接受 visitId + injuries[region/aisScore/description]；
 * NISS=top3 AIS 平方和、severity 分级、severe→needsSurgery 全部由后端二次计算。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 损伤部位与严重度（英文 key，中文 label 由 LABEL map 映射）             */
/* ------------------------------------------------------------------ */

export type InjuryRegion = 'head' | 'chest' | 'abdomen' | 'extremity' | 'neck' | 'external';

export const REGION_LABEL: Record<InjuryRegion, string> = {
  head: '头颈部',
  chest: '胸部',
  abdomen: '腹部',
  extremity: '四肢骨盆',
  neck: '颈部',
  external: '体表',
};

export const REGION_OPTIONS: InjuryRegion[] = ['head', 'chest', 'abdomen', 'extremity', 'neck', 'external'];

export type NissSeverity = 'mild' | 'moderate' | 'severe';

export const SEVERITY_LABEL: Record<NissSeverity, string> = {
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
};

export const SEVERITY_COLOR: Record<NissSeverity, string> = {
  mild: 'green',
  moderate: 'yellow',
  severe: 'red',
};

/* ------------------------------------------------------------------ */
/* 纯函数（与后端阈值冻结对齐，用于页面实时预览）                        */
/* ------------------------------------------------------------------ */

/** 取 AIS 降序前 3 个平方和 */
export function calcNiss(aisScores: number[]): number {
  return aisScores
    .slice()
    .sort((a, b) => b - a)
    .slice(0, 3)
    .reduce((acc, v) => acc + v * v, 0);
}

export function severityOf(niss: number): NissSeverity {
  if (niss < 16) return 'mild';
  if (niss <= 24) return 'moderate';
  return 'severe';
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface TraumaInjury {
  region: InjuryRegion;
  aisScore: number;
  description: string;
}

export interface TraumaNissRecord {
  id: string;
  visitId: string;
  injuries: TraumaInjury[];
  nissScore: number;
  severity: NissSeverity;
  needsSurgery: boolean;
  assessedAt: string;
  demo?: boolean;
  patientId?: string;
  patientName?: string;
  signature?: string;
  assessorName?: string;
}

export interface TraumaNissSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  injuries: TraumaInjury[];
  assessedAt: string;
  signature: string;
  assessorName?: string;
}

export interface TraumaNissListResult {
  data: TraumaNissRecord[];
  demo: boolean;
}

export interface TraumaNissSubmitResult {
  record: TraumaNissRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* DEMO 兜底记录                                                        */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: TraumaNissRecord[] = [
  {
    id: 'NISS-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    injuries: [
      { region: 'head', aisScore: 4, description: '颅内血肿' },
      { region: 'chest', aisScore: 4, description: '血气胸' },
      { region: 'abdomen', aisScore: 3, description: '肝挫裂伤' },
    ],
    nissScore: 41,
    severity: 'severe',
    needsSurgery: true,
    assessedAt: new Date().toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
  {
    id: 'NISS-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    injuries: [
      { region: 'extremity', aisScore: 2, description: '左下肢挫伤' },
      { region: 'external', aisScore: 2, description: '面部擦伤' },
    ],
    nissScore: 8,
    severity: 'mild',
    needsSurgery: false,
    assessedAt: new Date(Date.now() - 3600_000).toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
];

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

export async function fetchTraumaNiss(visitId?: string): Promise<TraumaNissListResult> {
  try {
    const res = await get<TraumaNissRecord[]>('/trauma/niss', visitId ? { visitId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

export async function submitTraumaNiss(input: TraumaNissSubmitInput): Promise<TraumaNissSubmitResult> {
  try {
    const res = await post<TraumaNissRecord>('/trauma/niss', {
      visitId: input.visitId,
      injuries: input.injuries,
    });
    const record: TraumaNissRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      assessedAt: input.assessedAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const niss = calcNiss(input.injuries.map((it) => it.aisScore));
    const severity = severityOf(niss);
    const record: TraumaNissRecord = {
      id: `NISS-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      patientId: input.patientId,
      patientName: input.patientName,
      injuries: input.injuries,
      nissScore: niss,
      severity,
      needsSurgery: severity === 'severe',
      assessedAt: input.assessedAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: true,
    };
    return { record, demo: true };
  }
}
