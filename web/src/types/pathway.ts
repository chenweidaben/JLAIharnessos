/**
 * 健澜科技 jlmedaios - 临床路径管理闭环类型（M15-A）
 *
 * 对标国家《临床路径管理指导原则》、电子病历五级评审、三甲评审：
 * 结构化路径定义（按天/阶段标准医嘱表单）+ 入径评估/签名 + 路径执行（一键下达走真实医嘱）
 * + 正/负变异管理 + 退出/完成出径 + 出院标准逐项核对 + 质控指标（分子分母可核查）。
 *
 * 医疗安全：AI 不自主开医嘱/诊断；标准医嘱仅为待确认清单，一键下达本质是执行人本人电子签名；
 * 入径/退出/完成出径须有资质医师（pathway:manage）电子签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 路径定义状态 */
export type PathwayStatus = 'active' | 'retired';

/** 表单项目类型（与 clinical.pathway_form_items.item_type CHECK 一致） */
export type PathwayItemType =
  | 'drug'
  | 'lab'
  | 'imaging'
  | 'treatment'
  | 'nursing'
  | 'diet'
  | 'other';

/** 入径状态机：在径 → 完成出径 / 变异退出 */
export type EnrollmentStatus = 'in_path' | 'completed' | 'withdrawn';

/** 表单项目执行状态 */
export type ExecutionStatus = 'pending' | 'executed' | 'skipped' | 'replaced';

/** 变异方向 */
export type VariationType = 'positive' | 'negative';

/** 变异原因分类（与 clinical.pathway_variations.category CHECK 一致） */
export type VariationCategory =
  | 'early_discharge'
  | 'complication'
  | 'resistance'
  | 'abnormal_exam'
  | 'patient_reason'
  | 'diagnosis_change'
  | 'other';

/** 结构化路径定义 */
export interface PathwayDefinition {
  id: string;
  pathwayCode: string;
  name: string;
  icdCode: string | null;
  applicableDepartments: string[];
  standardLos: number | null;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  dischargeCriteria: string[];
  version: string;
  status: PathwayStatus;
  sourceKnowledgeId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 按天/阶段标准医嘱表单项目 */
export interface PathwayFormItem {
  id: string;
  pathwayId: string;
  stageDay: number;
  stageName: string;
  itemCode: string;
  itemType: PathwayItemType;
  content: string;
  required: boolean;
  sortOrder: number;
  createdAt: string;
}

/** 入径记录 */
export interface PathwayEnrollment {
  id: string;
  enrollmentNo: string;
  pathwayId: string;
  pathwayName?: string | null;
  visitId: string;
  patientId: string;
  patientName?: string | null;
  enrollmentDiagnosis: string;
  diagnosisCode: string | null;
  status: EnrollmentStatus;
  enrolledBy: string;
  enrolledAt: string;
  completedBy: string | null;
  completedAt: string | null;
  dischargeCriteriaMet: string[] | null;
  withdrawnBy: string | null;
  withdrawnAt: string | null;
  withdrawReason: string | null;
  actualLos: number | null;
  actualFee: number | null;
  createdAt: string;
  updatedAt: string;
}

/** 表单项目执行记录（与真实医嘱 order 关联） */
export interface PathwayExecution {
  id: string;
  enrollmentId: string;
  formItemId: string;
  stageDay: number;
  status: ExecutionStatus;
  orderId: string | null;
  note: string | null;
  executedBy: string | null;
  executedAt: string | null;
}

/** 变异记录 */
export interface PathwayVariation {
  id: string;
  variationNo: string;
  enrollmentId: string;
  stageDay: number | null;
  variationType: VariationType;
  category: VariationCategory;
  description: string;
  recordedBy: string;
  recordedAt: string;
  handled: boolean;
}

/** 可入径住院患者（在院 + 诊断 ICD 命中 active 路径 + 未入径） */
export interface EligiblePatient {
  visitId: string;
  patientId: string;
  patientName: string | null;
  diagnosis: string;
  diagnosisCode: string | null;
  pathwayId: string;
  pathwayCode: string;
  pathwayName: string;
  icdCode: string | null;
}

/** 入径详情：入径 + 按天表单 + 执行 + 变异 */
export interface EnrollmentDetail {
  enrollment: PathwayEnrollment;
  forms: PathwayFormItem[];
  executions: PathwayExecution[];
  variations: PathwayVariation[];
}

/** 质控指标分数（分子/分母可核查；除零 rate=null） */
export interface PathwayFraction {
  numerator: number;
  denominator: number;
  rate: number | null;
}

/** 临床路径质控指标（§6，含分子分母） */
export interface PathwayMetrics {
  period: { from: string; to: string };
  enrollmentRate: PathwayFraction;
  completionRate: PathwayFraction;
  variationRate: PathwayFraction;
  withdrawalRate: PathwayFraction;
  /** 完成出径患者平均住院日（与 standard_los 对比）；无样本 null。 */
  avgLos: number | null;
  /** 完成出径患者平均住院费用；无样本 null。 */
  avgFee: number | null;
  /** 变异原因分布 category → count。 */
  variationCategoryDistribution: Record<string, number>;
}
