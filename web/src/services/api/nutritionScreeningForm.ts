/**
 * 健澜科技 jlmedaios - NRS-2002 入院营养风险筛查 API（M521-E，P0 首批）
 *
 * 对接真实 BFF：
 *   POST /api/v1/nutrition-screenings       权限码 nutrition:screen
 *   GET  /api/v1/nutrition-screenings?visitId=  权限码 nutrition:view
 *
 * 后端契约严格对齐（src/bff/aggregators/nutritionScreeningAggregator.ts）：
 *   POST body 仅接受 visitId / nutritionScore(0..3) / diseaseSeverity(0..3) /
 *   ageYears / resultNote?；BMI、近期体重下降、进食情况、皮下脂肪/肌肉消耗等
 *   本地扩展观察项聚合进 resultNote 备注，不向后端发送未定义字段导致 400。
 * 阈值规则冻结（与后端 medical-tools/nursing/nutritionScreening.ts 纯函数一致）：
 *   ageBonus = ageYears ≥ 70 ? 1 : 0；totalScore = nutritionScore + diseaseSeverity + ageBonus；
 *   nutritionRisk = totalScore ≥ 3；禁止自创年龄加分规则与阳性阈值。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 枚举与标准文案（7.E 冻结，选项标准文案照规范，禁止自创）              */
/* ------------------------------------------------------------------ */

export type NutritionScore = 0 | 1 | 2 | 3;
export type DiseaseSeverity = 0 | 1 | 2 | 3;

export const NUTRITION_SCORE_LABEL: Record<NutritionScore, string> = {
  0: '0 分 · 正常营养状态',
  1: '1 分 · 轻度蛋白质-能量营养不良',
  2: '2 分 · 中度营养不良',
  3: '3 分 · 重度营养不良',
};

export const NUTRITION_SCORE_DEFINITION: Record<NutritionScore, string> = {
  0: '正常营养状态',
  1: '3 个月体重下降 5% 或 BMI<20.5',
  2: '2 个月体重下降 5% 或 BMI<18.5 或白蛋白<30g/L',
  3: '1 个月体重下降 5% 或 BMI<17 或白蛋白<25g/L',
};

export const DISEASE_SEVERITY_LABEL: Record<DiseaseSeverity, string> = {
  0: '0 分 · 正常组织蛋白',
  1: '1 分 · 轻度疾病',
  2: '2 分 · 中度疾病',
  3: '3 分 · 重度疾病',
};

export const DISEASE_SEVERITY_DEFINITION: Record<DiseaseSeverity, string> = {
  0: '正常组织蛋白',
  1: '慢性病 / 急性发热 / 术后恢复',
  2: '大手术 / 肺炎 / 肝硬化 / 慢性肾病',
  3: '败血症 / ICU / 重度肺炎',
};

/** 本地扩展观察项：近期体重下降（聚合进 resultNote，不另发后端 key） */
export type WeightLoss = 'none' | 'less5' | 'fiveToTen' | 'overTen';

export const WEIGHT_LOSS_LABEL: Record<WeightLoss, string> = {
  none: '无明显体重下降',
  less5: '体重下降 <5%',
  fiveToTen: '体重下降 5–10%',
  overTen: '体重下降 >10%',
};

/** 本地扩展观察项：进食情况 */
export type IntakeStatus = 'normal' | 'partial' | 'none';

export const INTAKE_STATUS_LABEL: Record<IntakeStatus, string> = {
  normal: '正常进食',
  partial: '部分进食',
  none: '不能进食',
};

/** 本地扩展观察项：皮下脂肪 / 肌肉消耗 */
export type FatMuscleStatus = 'normal' | 'mild' | 'severe';

export const FAT_MUSCLE_LABEL: Record<FatMuscleStatus, string> = {
  normal: '皮下脂肪 / 肌肉正常',
  mild: '轻度消耗',
  severe: '重度消耗',
};

/* ------------------------------------------------------------------ */
/* 纯函数阈值（与后端一致，禁止自创规则）                                */
/* ------------------------------------------------------------------ */

/** 年龄加分：≥70 岁加 1 分 */
export function calcAgeBonus(ageYears: number): number {
  return ageYears >= 70 ? 1 : 0;
}

/** 总分 = 营养状态分 + 疾病严重度分 + 年龄加分 */
export function calcTotalScore(nutritionScore: number, diseaseSeverity: number, ageBonus: number): number {
  return nutritionScore + diseaseSeverity + ageBonus;
}

/** 营养风险：总分 ≥3 判定阳性 */
export function isNutritionRisk(totalScore: number): boolean {
  return totalScore >= 3;
}

export const NUTRITION_ADVICE_POSITIVE = '营养风险阳性，建议营养科会诊并制定营养支持计划';
export const NUTRITION_ADVICE_NEGATIVE = '暂无营养风险，常规随访';

export function nutritionAdvice(risk: boolean): string {
  return risk ? NUTRITION_ADVICE_POSITIVE : NUTRITION_ADVICE_NEGATIVE;
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface NutritionScreeningRecord {
  id: string;
  visitId: string;
  patientId?: string;
  patientName?: string;
  nutritionScore: NutritionScore;
  diseaseSeverity: DiseaseSeverity;
  ageYears?: number;
  ageBonus: number;
  totalScore: number;
  nutritionRisk: boolean;
  resultNote: string | null;
  advice?: string;
  interventionTaskId?: string | null;
  signature?: string;
  assessorName?: string;
  createdBy?: string;
  createdAt: string;
  /** 扩展观察项（后端契约暂未持久化，本地/演示记录用于页面展示） */
  bmi?: number;
  weightLoss?: WeightLoss;
  intakeStatus?: IntakeStatus;
  fatMuscle?: FatMuscleStatus;
  demo?: boolean;
}

export interface NutritionSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  ageYears: number;
  nutritionScore: NutritionScore;
  diseaseSeverity: DiseaseSeverity;
  bmi?: number;
  weightLoss?: WeightLoss;
  intakeStatus?: IntakeStatus;
  fatMuscle?: FatMuscleStatus;
  resultNote?: string;
  signature: string;
  assessorName?: string;
}

export interface NutritionListResult {
  data: NutritionScreeningRecord[];
  demo: boolean;
}

export interface NutritionSubmitResult {
  record: NutritionScreeningRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* 确定性 DEMO 兜底记录（1 阳性、1 阴性，全部打 demo:true）             */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: NutritionScreeningRecord[] = [
  {
    id: 'NUTR-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    nutritionScore: 2,
    diseaseSeverity: 2,
    ageYears: 72,
    ageBonus: 1,
    totalScore: 5,
    nutritionRisk: true,
    resultNote:
      'BMI 17.8；近期体重下降：体重下降 5–10%；进食情况：部分进食；皮下脂肪/肌肉：轻度消耗；既往下肢深静脉血栓，卧床进食减少。',
    advice: NUTRITION_ADVICE_POSITIVE,
    interventionTaskId: 'TASK-NUTR-DEMO-001',
    signature: '陈医师',
    assessorName: '陈医师',
    createdAt: new Date().toISOString(),
    bmi: 17.8,
    weightLoss: 'fiveToTen',
    intakeStatus: 'partial',
    fatMuscle: 'mild',
    demo: true,
  },
  {
    id: 'NUTR-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    nutritionScore: 0,
    diseaseSeverity: 1,
    ageYears: 64,
    ageBonus: 0,
    totalScore: 1,
    nutritionRisk: false,
    resultNote:
      'BMI 23.4；近期体重下降：无明显体重下降；进食情况：正常进食；皮下脂肪/肌肉：皮下脂肪 / 肌肉正常。',
    advice: NUTRITION_ADVICE_NEGATIVE,
    interventionTaskId: null,
    signature: '陈医师',
    assessorName: '陈医师',
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    bmi: 23.4,
    weightLoss: 'none',
    intakeStatus: 'normal',
    fatMuscle: 'normal',
    demo: true,
  },
];

/** 把扩展观察项聚合进后端允许的备注字段，避免发送未定义 key */
function buildNote(input: NutritionSubmitInput): string | undefined {
  const parts: string[] = [];
  if (input.bmi != null) parts.push(`BMI ${input.bmi}`);
  if (input.weightLoss) parts.push(`近期体重下降：${WEIGHT_LOSS_LABEL[input.weightLoss]}`);
  if (input.intakeStatus) parts.push(`进食情况：${INTAKE_STATUS_LABEL[input.intakeStatus]}`);
  if (input.fatMuscle) parts.push(`皮下脂肪/肌肉：${FAT_MUSCLE_LABEL[input.fatMuscle]}`);
  if (input.resultNote?.trim()) parts.push(input.resultNote.trim());
  return parts.length > 0 ? parts.join('；') : undefined;
}

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

/** 查询营养筛查记录（按就诊过滤；BFF 失败返回 DEMO 列表并打标） */
export async function fetchNutritionScreenings(visitId?: string): Promise<NutritionListResult> {
  try {
    const res = await get<NutritionScreeningRecord[]>(
      '/nutrition-screenings',
      visitId ? { visitId } : undefined,
    );
    const rawItems = Array.isArray(res) ? res : [];
    if (rawItems.length > 0) {
      // 列表端点不回传 advice / interventionTaskId，按纯函数阈值本地补齐建议文案
      const items = rawItems.map((r) => ({
        ...r,
        advice: r.advice ?? nutritionAdvice(r.nutritionRisk),
        interventionTaskId: r.interventionTaskId ?? null,
      }));
      return { data: items, demo: false };
    }
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

/** 提交 NRS-2002 筛查；真实落库失败时降级为本地演示记录，绝不伪造成功提示 */
export async function submitNutritionScreening(
  input: NutritionSubmitInput,
): Promise<NutritionSubmitResult> {
  const ageBonus = calcAgeBonus(input.ageYears);
  const totalScore = calcTotalScore(input.nutritionScore, input.diseaseSeverity, ageBonus);
  const nutritionRisk = isNutritionRisk(totalScore);
  const payload = {
    visitId: input.visitId,
    nutritionScore: input.nutritionScore,
    diseaseSeverity: input.diseaseSeverity,
    ageYears: input.ageYears,
    resultNote: buildNote(input),
  };
  try {
    const res = await post<NutritionScreeningRecord>('/nutrition-screenings', payload);
    const record: NutritionScreeningRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      ageYears: input.ageYears,
      ageBonus: res.ageBonus ?? ageBonus,
      totalScore: res.totalScore ?? totalScore,
      nutritionRisk: res.nutritionRisk ?? nutritionRisk,
      advice: res.advice ?? nutritionAdvice(nutritionRisk),
      interventionTaskId: res.interventionTaskId ?? null,
      signature: input.signature,
      assessorName: input.assessorName,
      bmi: input.bmi,
      weightLoss: input.weightLoss,
      intakeStatus: input.intakeStatus,
      fatMuscle: input.fatMuscle,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    const demoRecord: NutritionScreeningRecord = {
      id: `NUTR-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      patientId: input.patientId,
      patientName: input.patientName,
      nutritionScore: input.nutritionScore,
      diseaseSeverity: input.diseaseSeverity,
      ageYears: input.ageYears,
      ageBonus,
      totalScore,
      nutritionRisk,
      resultNote: buildNote(input) ?? null,
      advice: nutritionAdvice(nutritionRisk),
      interventionTaskId: null,
      signature: input.signature,
      assessorName: input.assessorName,
      createdAt: new Date().toISOString(),
      bmi: input.bmi,
      weightLoss: input.weightLoss,
      intakeStatus: input.intakeStatus,
      fatMuscle: input.fatMuscle,
      demo: true,
    };
    void err;
    return { record: demoRecord, demo: true };
  }
}
