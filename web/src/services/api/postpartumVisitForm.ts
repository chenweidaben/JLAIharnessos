/**
 * 健澜科技 jlmedaios - 产后访视 API（M538，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/postpartum/visits?visitId=  权限码 postpartum:view
 *   POST /api/v1/postpartum/visits            权限码 postpartum:visit
 *
 * 后端契约：POST body 仅接受 visitId / visitType / temperature / fundusInvolution /
 * lochia / breastCondition / woundHealing / mentalScale / babyRef / notes；
 * needsPhysicianReview 与 riskTags 由后端多条件组合二次计算（前端纯函数仅实时预览）。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 枚举（英文 key，中文 label 由 LABEL map 映射）                       */
/* ------------------------------------------------------------------ */

export type VisitType = 'discharge' | 'day3' | 'day7' | 'day42';

export const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  discharge: '出院访视',
  day3: '产后 3 天访视',
  day7: '产后 7 天访视',
  day42: '产后 42 天访视',
};

export const VISIT_TYPES: VisitType[] = ['discharge', 'day3', 'day7', 'day42'];

export type Fundus = 'normal' | 'subinvolution';

export const FUNDUS_LABEL: Record<Fundus, string> = {
  normal: '宫底下降正常',
  subinvolution: '子宫复旧不全',
};

export type Lochia = 'normal' | 'scanty' | 'profuse' | 'odor';

export const LOCHIA_LABEL: Record<Lochia, string> = {
  normal: '恶露正常',
  scanty: '恶露量少',
  profuse: '恶露量多',
  odor: '恶露异味',
};

export type Breast = 'normal' | 'engorgement' | 'mastitis';

export const BREAST_LABEL: Record<Breast, string> = {
  normal: '乳房正常',
  engorgement: '乳房胀痛',
  mastitis: '乳腺炎',
};

export type Wound = 'healing' | 'infection' | 'dehiscent';

export const WOUND_LABEL: Record<Wound, string> = {
  healing: '伤口愈合良好',
  infection: '伤口感染',
  dehiscent: '伤口裂开',
};

/** riskTags 英文 key → 中文展示短语 */
export const RISK_TAG_LABEL: Record<string, string> = {
  fever: '发热 ≥38.5℃',
  lochia_profuse: '恶露量多',
  lochia_odor: '恶露异味',
  wound_infection: '伤口感染',
  wound_dehiscent: '伤口裂开',
  postpartum_depression: '产后抑郁筛查阳性（Edinburgh ≥13）',
};

/* ------------------------------------------------------------------ */
/* 纯函数阈值（与后端冻结对齐，用于页面实时预览）                        */
/* ------------------------------------------------------------------ */

export function computeRiskTags(
  temperature: number,
  lochia: Lochia,
  woundHealing: Wound,
  mentalScale: number,
): string[] {
  const tags: string[] = [];
  if (temperature >= 38.5) tags.push('fever');
  if (lochia === 'profuse' || lochia === 'odor') tags.push(`lochia_${lochia}`);
  if (woundHealing === 'infection' || woundHealing === 'dehiscent') tags.push(`wound_${woundHealing}`);
  if (mentalScale >= 13) tags.push('postpartum_depression');
  return tags;
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface PostpartumVisitRecord {
  id: string;
  visitId: string;
  visitType: VisitType;
  temperature: number;
  fundusInvolution: Fundus;
  lochia: Lochia;
  breastCondition: Breast;
  woundHealing: Wound;
  mentalScale: number;
  babyRef: string | null;
  notes: string | null;
  needsPhysicianReview: boolean;
  riskTags: string[];
  visitedAt: string;
  demo?: boolean;
  patientId?: string;
  patientName?: string;
  signature?: string;
  assessorName?: string;
}

export interface PostpartumVisitSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  visitType: VisitType;
  temperature: number;
  fundusInvolution: Fundus;
  lochia: Lochia;
  breastCondition: Breast;
  woundHealing: Wound;
  mentalScale: number;
  babyRef?: string | null;
  notes?: string | null;
  visitedAt: string;
  signature: string;
  assessorName?: string;
}

export interface PostpartumVisitListResult {
  data: PostpartumVisitRecord[];
  demo: boolean;
}

export interface PostpartumVisitSubmitResult {
  record: PostpartumVisitRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* DEMO 兜底记录                                                        */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: PostpartumVisitRecord[] = [
  {
    id: 'PPV-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王美华',
    visitType: 'day7',
    temperature: 38.8,
    fundusInvolution: 'subinvolution',
    lochia: 'profuse',
    breastCondition: 'engorgement',
    woundHealing: 'healing',
    mentalScale: 6,
    babyRef: 'B-2026-001',
    notes: '发热伴恶露增多',
    needsPhysicianReview: true,
    riskTags: ['fever', 'lochia_profuse'],
    visitedAt: new Date().toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
  {
    id: 'PPV-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张秀兰',
    visitType: 'discharge',
    temperature: 36.5,
    fundusInvolution: 'normal',
    lochia: 'normal',
    breastCondition: 'normal',
    woundHealing: 'healing',
    mentalScale: 2,
    babyRef: 'B-2026-003',
    notes: null,
    needsPhysicianReview: false,
    riskTags: [],
    visitedAt: new Date(Date.now() - 3600_000).toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
];

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

export async function fetchPostpartumVisits(visitId?: string): Promise<PostpartumVisitListResult> {
  try {
    const res = await get<PostpartumVisitRecord[]>('/postpartum/visits', visitId ? { visitId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

export async function submitPostpartumVisit(input: PostpartumVisitSubmitInput): Promise<PostpartumVisitSubmitResult> {
  const payload = {
    visitId: input.visitId,
    visitType: input.visitType,
    temperature: input.temperature,
    fundusInvolution: input.fundusInvolution,
    lochia: input.lochia,
    breastCondition: input.breastCondition,
    woundHealing: input.woundHealing,
    mentalScale: input.mentalScale,
    babyRef: input.babyRef ?? null,
    notes: input.notes ?? null,
  };
  try {
    const res = await post<PostpartumVisitRecord>('/postpartum/visits', payload);
    const record: PostpartumVisitRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      visitedAt: input.visitedAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const tags = computeRiskTags(input.temperature, input.lochia, input.woundHealing, input.mentalScale);
    const record: PostpartumVisitRecord = {
      id: `PPV-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      patientId: input.patientId,
      patientName: input.patientName,
      visitType: input.visitType,
      temperature: input.temperature,
      fundusInvolution: input.fundusInvolution,
      lochia: input.lochia,
      breastCondition: input.breastCondition,
      woundHealing: input.woundHealing,
      mentalScale: input.mentalScale,
      babyRef: input.babyRef ?? null,
      notes: input.notes ?? null,
      needsPhysicianReview: tags.length > 0,
      riskTags: tags,
      visitedAt: input.visitedAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: true,
    };
    return { record, demo: true };
  }
}
