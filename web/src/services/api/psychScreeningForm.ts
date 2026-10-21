/**
 * 健澜科技 jlmedaios - 心理筛查 PHQ-9/GAD-7 API（M536，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/psych/screens?visitId=  权限码 psych:view
 *   POST /api/v1/psych/screens            权限码 psych:screen
 *
 * 后端契约：POST body 仅接受 visitId / instrument / answers[0-3]；
 * totalScore 求和、level 分级、needsPsychReferral 全部由后端二次计算（前端纯函数仅实时预览）。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 量表与题目文案（英文 key，中文文案直接作为题目与释义）                 */
/* ------------------------------------------------------------------ */

export type Instrument = 'phq9' | 'gad7';

export const INSTRUMENT_LABEL: Record<Instrument, string> = {
  phq9: 'PHQ-9 抑郁筛查',
  gad7: 'GAD-7 焦虑筛查',
};

export const PHQ9_QUESTIONS: string[] = [
  '做事时提不起劲或没有兴趣',
  '感到心情低落、沮丧或绝望',
  '入睡困难、睡不安稳或睡眠过多',
  '感觉疲倦或没有活力',
  '食欲不振或吃太多',
  '觉得自己很糟——或觉得自己很失败，让自己或家人失望',
  '对事物专注有困难，例如阅读报纸或看电视时',
  '动作或说话速度缓慢到别人已经察觉？或正好相反——烦躁坐立不安',
  '有不如死掉或用某种方式伤害自己的念头',
];

export const GAD7_QUESTIONS: string[] = [
  '感到紧张、焦虑或急切',
  '不能够停止或控制担忧',
  '对各种各样的事情担忧过多',
  '很难放松下来',
  '由于不安而无法静坐',
  '变得容易烦恼或易被激怒',
  '感到害怕，似乎将发生可怕的事',
];

/** 每题 0–3 分频率释义（两个量表共用） */
export const ANSWER_LABEL: Record<number, string> = {
  0: '完全没有',
  1: '有几天',
  2: '一半以上天数',
  3: '几乎每天',
};

export type ScreenLevel = 'mild' | 'moderate' | 'moderatelySevere' | 'severe';

export const LEVEL_LABEL: Record<ScreenLevel, string> = {
  mild: '轻度',
  moderate: '中度',
  moderatelySevere: '中重度',
  severe: '重度',
};

export const LEVEL_COLOR: Record<ScreenLevel, string> = {
  mild: 'green',
  moderate: 'yellow',
  moderatelySevere: 'orange',
  severe: 'red',
};

/* ------------------------------------------------------------------ */
/* 纯函数阈值（与后端冻结对齐，用于页面实时预览）                        */
/* ------------------------------------------------------------------ */

export function calcTotal(answers: number[]): number {
  return answers.reduce((acc, v) => acc + v, 0);
}

export function levelOf(instrument: Instrument, total: number): ScreenLevel {
  if (instrument === 'phq9') {
    if (total < 10) return 'mild';
    if (total <= 14) return 'moderate';
    if (total <= 19) return 'moderatelySevere';
    return 'severe';
  }
  if (total < 10) return 'mild';
  if (total <= 14) return 'moderate';
  return 'severe';
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface PsychScreenRecord {
  id: string;
  visitId: string;
  instrument: Instrument;
  answers: number[];
  totalScore: number;
  level: ScreenLevel;
  needsPsychReferral: boolean;
  screenedAt: string;
  demo?: boolean;
  patientId?: string;
  patientName?: string;
  signature?: string;
  assessorName?: string;
}

export interface PsychScreenSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  instrument: Instrument;
  answers: number[];
  screenedAt: string;
  signature: string;
  assessorName?: string;
}

export interface PsychScreenListResult {
  data: PsychScreenRecord[];
  demo: boolean;
}

export interface PsychScreenSubmitResult {
  record: PsychScreenRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* DEMO 兜底记录                                                        */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: PsychScreenRecord[] = [
  {
    id: 'PSY-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    instrument: 'phq9',
    answers: [3, 3, 3, 2, 3, 2, 3, 2, 1],
    totalScore: 22,
    level: 'severe',
    needsPsychReferral: true,
    screenedAt: new Date().toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
  {
    id: 'PSY-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    instrument: 'gad7',
    answers: [0, 0, 1, 0, 1, 0, 1],
    totalScore: 3,
    level: 'mild',
    needsPsychReferral: false,
    screenedAt: new Date(Date.now() - 3600_000).toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
];

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

export async function fetchPsychScreens(visitId?: string): Promise<PsychScreenListResult> {
  try {
    const res = await get<PsychScreenRecord[]>('/psych/screens', visitId ? { visitId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

export async function submitPsychScreen(input: PsychScreenSubmitInput): Promise<PsychScreenSubmitResult> {
  try {
    const res = await post<PsychScreenRecord>('/psych/screens', {
      visitId: input.visitId,
      instrument: input.instrument,
      answers: input.answers,
    });
    const record: PsychScreenRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      screenedAt: input.screenedAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const total = calcTotal(input.answers);
    const level = levelOf(input.instrument, total);
    const record: PsychScreenRecord = {
      id: `PSY-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      patientId: input.patientId,
      patientName: input.patientName,
      instrument: input.instrument,
      answers: input.answers,
      totalScore: total,
      level,
      needsPsychReferral: level !== 'mild',
      screenedAt: input.screenedAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: true,
    };
    return { record, demo: true };
  }
}
