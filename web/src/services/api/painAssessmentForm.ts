/**
 * 健澜科技 jlmedaios - 疼痛 NRS 0–10 评估 API（M521-B，P0 首批）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/pain-assessments?visitId=  权限码 pain:view
 *   POST /api/v1/pain-assessments           权限码 pain:assess
 *
 * 后端契约严格对齐（src/bff/aggregators/painAssessmentAggregator.ts）：
 *   POST body 仅接受 visitId / score / assessType / location? / note?；
 *   疼痛性质、触发因素、缓解因素等扩展采集项聚合进 note 备注，
 *   不向后端发送未定义字段导致 400。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 枚举与中文映射（枚举传英文 key，前端 map 映射中文）                    */
/* ------------------------------------------------------------------ */

export type AssessType = 'admission' | 'postop' | 'cancer' | 'followup';

export const ASSESS_TYPE_LABEL: Record<AssessType, string> = {
  admission: '入院评估',
  postop: '术后疼痛',
  cancer: '癌性疼痛',
  followup: '随访复评',
};

export type PainLocation = 'head_neck' | 'chest' | 'abdomen' | 'lower_back' | 'limbs' | 'other';

export const LOCATION_LABEL: Record<PainLocation, string> = {
  head_neck: '头颈',
  chest: '胸部',
  abdomen: '腹部',
  lower_back: '腰背',
  limbs: '四肢',
  other: '其他',
};

/** 疼痛性质（本地采集项，聚合进 note，不另发后端 key） */
export const PAIN_NATURE_OPTIONS = ['胀痛', '刺痛', '烧灼痛', '绞痛', '放射痛'] as const;

export type PainLevel = 'mild' | 'moderate' | 'severe';

export const LEVEL_LABEL: Record<PainLevel, string> = {
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
};

export const LEVEL_COLOR: Record<PainLevel, string> = {
  mild: 'green',
  moderate: 'orange',
  severe: 'red',
};

export const LEVEL_BAR_COLOR: Record<PainLevel, string> = {
  mild: '#52C41A',
  moderate: '#FA8C16',
  severe: '#D9534F',
};

/* ------------------------------------------------------------------ */
/* 阈值纯函数（与后端 src/medical-tools/nursing/painAssessment.ts 一致） */
/* ------------------------------------------------------------------ */

/** score 0–3 mild 绿 / 4–6 moderate 橙 / 7–10 severe 红 */
export function classifyPainLevel(score: number): PainLevel {
  if (score >= 7) return 'severe';
  if (score >= 4) return 'moderate';
  return 'mild';
}

/** score ≥ 4 需镇痛 */
export function isNeedAnalgesia(score: number): boolean {
  return score >= 4;
}

/** 复评间隔：≥7 → 1 小时；≥4 → 4 小时；术后/癌痛 → 8 小时；其余 24 小时 */
export function resolveReassessHours(score: number, assessType: AssessType): number {
  if (score >= 7) return 1;
  if (score >= 4) return 4;
  if (assessType === 'postop' || assessType === 'cancer') return 8;
  return 24;
}

/** 医嘱建议文案（与后端 advice 纯函数逐字一致） */
export function resolveAdvice(score: number, assessType: AssessType): string {
  if (score >= 7) return '重度疼痛，建议立即通知医师并给予强镇痛';
  if (score >= 4) return '中度疼痛，建议通知医师评估镇痛方案';
  if (assessType === 'postop' || assessType === 'cancer') return '轻度疼痛，8h 内再评估';
  return '轻度疼痛，继续观察';
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface PainAssessmentRecord {
  id: string;
  visitId: string;
  score: number;
  assessType: AssessType;
  location: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
  level: PainLevel;
  needAnalgesia: boolean;
  reassessHours: number;
  advice: string;
  interventionTaskId: string | null;
  /** 扩展采集项（后端契约暂未持久化，本地/演示记录用于页面展示） */
  patientId?: string;
  patientName?: string;
  signature?: string;
  assessorName?: string;
  painNature?: string;
  triggerFactor?: string;
  reliefFactor?: string;
  demo?: boolean;
}

/** BFF 原始响应：分级/镇痛/复评/建议/待办为响应附加字段，缺失时由前端纯函数兜底 */
type PainAssessmentApiRecord = Omit<
  PainAssessmentRecord,
  'level' | 'needAnalgesia' | 'reassessHours' | 'advice' | 'interventionTaskId' | 'demo'
> &
  Partial<Pick<PainAssessmentRecord, 'level' | 'needAnalgesia' | 'reassessHours' | 'advice' | 'interventionTaskId'>>;

export interface PainAssessmentSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  score: number;
  assessType: AssessType;
  location?: PainLocation;
  painNature?: string;
  triggerFactor?: string;
  reliefFactor?: string;
  note?: string;
  signature: string;
  assessorName?: string;
}

export interface PainAssessmentListResult {
  data: PainAssessmentRecord[];
  demo: boolean;
}

export interface PainAssessmentSubmitResult {
  record: PainAssessmentRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* 确定性 DEMO 兜底记录（mild / moderate 各一）                          */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: PainAssessmentRecord[] = [
  {
    id: 'PAIN-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    score: 2,
    assessType: 'admission',
    location: 'abdomen',
    note: '疼痛性质：胀痛；入院查体轻度腹痛，可自行缓解。',
    createdBy: '陈医师',
    createdAt: new Date().toISOString(),
    level: 'mild',
    needAnalgesia: false,
    reassessHours: 24,
    advice: '轻度疼痛，继续观察',
    interventionTaskId: null,
    signature: '陈医师',
    assessorName: '陈医师',
    painNature: '胀痛',
    demo: true,
  },
  {
    id: 'PAIN-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    score: 5,
    assessType: 'postop',
    location: 'limbs',
    note: '疼痛性质：刺痛；触发因素：翻身活动后加重；缓解因素：休息后稍缓解。',
    createdBy: '陈医师',
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    level: 'moderate',
    needAnalgesia: true,
    reassessHours: 4,
    advice: '中度疼痛，建议通知医师评估镇痛方案',
    interventionTaskId: null,
    signature: '陈医师',
    assessorName: '陈医师',
    painNature: '刺痛',
    triggerFactor: '翻身活动后加重',
    reliefFactor: '休息后稍缓解',
    demo: true,
  },
];

/** 把扩展采集项聚合进后端允许的 note 备注字段，避免发送未定义 key */
function buildNote(input: PainAssessmentSubmitInput): string | undefined {
  const parts: string[] = [];
  if (input.painNature?.trim()) parts.push(`疼痛性质：${input.painNature.trim()}`);
  if (input.triggerFactor?.trim()) parts.push(`触发因素：${input.triggerFactor.trim()}`);
  if (input.reliefFactor?.trim()) parts.push(`缓解因素：${input.reliefFactor.trim()}`);
  if (input.note?.trim()) parts.push(input.note.trim());
  return parts.length > 0 ? parts.join('；') : undefined;
}

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

/** 查询疼痛评估记录（按就诊过滤；BFF 失败返回 DEMO 列表并打标） */
export async function fetchPainAssessments(visitId?: string): Promise<PainAssessmentListResult> {
  try {
    const res = await get<PainAssessmentApiRecord[]>('/pain-assessments', visitId ? { visitId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) {
      const data: PainAssessmentRecord[] = items.map((r) => ({
        ...r,
        assessType: r.assessType as AssessType,
        level: r.level ?? classifyPainLevel(r.score),
        needAnalgesia: r.needAnalgesia ?? isNeedAnalgesia(r.score),
        reassessHours: r.reassessHours ?? resolveReassessHours(r.score, r.assessType as AssessType),
        advice: r.advice ?? resolveAdvice(r.score, r.assessType as AssessType),
        interventionTaskId: r.interventionTaskId ?? null,
        demo: false,
      }));
      return { data, demo: false };
    }
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

/** 提交疼痛评估；真实落库失败时降级为本地演示记录，绝不伪造成功提示 */
export async function submitPainAssessment(input: PainAssessmentSubmitInput): Promise<PainAssessmentSubmitResult> {
  const payload = {
    visitId: input.visitId,
    score: input.score,
    assessType: input.assessType,
    location: input.location,
    note: buildNote(input),
  };
  try {
    const res = await post<PainAssessmentApiRecord>('/pain-assessments', payload);
    const record: PainAssessmentRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      signature: input.signature,
      assessorName: input.assessorName,
      painNature: input.painNature,
      triggerFactor: input.triggerFactor,
      reliefFactor: input.reliefFactor,
      level: res.level ?? classifyPainLevel(input.score),
      needAnalgesia: res.needAnalgesia ?? isNeedAnalgesia(input.score),
      reassessHours: res.reassessHours ?? resolveReassessHours(input.score, input.assessType),
      advice: res.advice ?? resolveAdvice(input.score, input.assessType),
      interventionTaskId: res.interventionTaskId ?? null,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    const demoRecord: PainAssessmentRecord = {
      id: `PAIN-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      patientId: input.patientId,
      patientName: input.patientName,
      score: input.score,
      assessType: input.assessType,
      location: input.location ?? null,
      note: buildNote(input) ?? null,
      createdBy: input.assessorName ?? input.signature,
      createdAt: new Date().toISOString(),
      level: classifyPainLevel(input.score),
      needAnalgesia: isNeedAnalgesia(input.score),
      reassessHours: resolveReassessHours(input.score, input.assessType),
      advice: resolveAdvice(input.score, input.assessType),
      interventionTaskId: null,
      signature: input.signature,
      assessorName: input.assessorName,
      painNature: input.painNature,
      triggerFactor: input.triggerFactor,
      reliefFactor: input.reliefFactor,
      demo: true,
    };
    void err;
    return { record: demoRecord, demo: true };
  }
}
