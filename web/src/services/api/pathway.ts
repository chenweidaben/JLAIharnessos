/**
 * 健澜科技 jlmedaios - 临床路径管理 API（M15-A）
 *
 * 真实 BFF（src/bff/routes/pathway.ts），全部读写 PostgreSQL，无 mock。
 * 路径相对（baseURL 已含 /api/v1），禁止再带 /api/v1 前缀。
 *
 * 医疗安全：AI 不自主开医嘱/诊断；标准医嘱仅为待确认清单，一键下达本质是执行人本人电子签名；
 * 入径/退出/完成出径须有资质医师（pathway:manage）电子签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';
import type {
  EligiblePatient,
  EnrollmentDetail,
  PathwayDefinition,
  PathwayEnrollment,
  PathwayExecution,
  PathwayFormItem,
  PathwayMetrics,
  PathwayVariation,
  VariationCategory,
} from '@/types/pathway';

/* ------------------------------ 路径定义 ------------------------------- */

/** 路径定义列表（可按状态/ICD 过滤）。 */
export function listDefinitions(params?: {
  status?: 'active' | 'retired';
  icd?: string;
}): Promise<PathwayDefinition[]> {
  return get<PathwayDefinition[]>('/pathway/definitions', {
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.icd ? { icd: params.icd } : {}),
  });
}

/** 新建/更新路径定义（按 pathway_code upsert，含入径/排除/出院标准）。 */
export function upsertDefinition(body: Partial<PathwayDefinition>): Promise<PathwayDefinition> {
  return post<PathwayDefinition>('/pathway/definitions', body);
}

/** 路径表单项目（可按 stageDay 过滤）。 */
export function listFormItems(
  pathwayId: string,
  params?: { stageDay?: number },
): Promise<PathwayFormItem[]> {
  return get<PathwayFormItem[]>(`/pathway/definitions/${pathwayId}/forms`, {
    ...(params?.stageDay ? { stageDay: params.stageDay } : {}),
  });
}

/** 新建/更新表单项目（按 pathway_id + stage_day + item_code upsert）。 */
export function upsertFormItem(
  pathwayId: string,
  body: Partial<PathwayFormItem>,
): Promise<PathwayFormItem> {
  return post<PathwayFormItem>(`/pathway/definitions/${pathwayId}/forms`, body);
}

/* ------------------------------ 入径 ----------------------------------- */

/** 可入径住院患者（在院 + 诊断 ICD 命中 active 路径 + 未入径）。 */
export function listEligible(): Promise<EligiblePatient[]> {
  return get<EligiblePatient[]>('/pathway/eligible');
}

/** 入径记录列表（可按状态/就诊/路径过滤）。 */
export function listEnrollments(params?: {
  status?: string;
  visitId?: string;
  pathwayId?: string;
}): Promise<PathwayEnrollment[]> {
  return get<PathwayEnrollment[]>('/pathway/enrollments', {
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.visitId ? { visitId: params.visitId } : {}),
    ...(params?.pathwayId ? { pathwayId: params.pathwayId } : {}),
  });
}

/** 医师确认入径（电子签名；校验诊断匹配、无排除项、无重复）。 */
export function enroll(body: {
  visitId: string;
  pathwayId: string;
  confirmedInclusion: string[];
  confirmedExclusion: string[];
}): Promise<PathwayEnrollment> {
  return post<PathwayEnrollment>('/pathway/enroll', body);
}

/** 入径详情：入径 + 按天表单 + 执行 + 变异。 */
export function getEnrollment(id: string): Promise<EnrollmentDetail> {
  return get<EnrollmentDetail>(`/pathway/enrollments/${id}`);
}

/* ------------------------------ 路径执行 ------------------------------- */

/** 一键下达表单项目（createInpatientOrder + reviewOrder 执行人本人电子签名，建 execution 绑定 order）。 */
export function executeFormItem(
  enrollmentId: string,
  body: { formItemId: string },
): Promise<PathwayExecution> {
  return post<PathwayExecution>(`/pathway/enrollments/${enrollmentId}/execute`, body);
}

/** 标记项目未执行/替代（附说明）。 */
export function skipFormItem(
  enrollmentId: string,
  body: { formItemId: string; status: 'skipped' | 'replaced'; note?: string },
): Promise<PathwayExecution> {
  return post<PathwayExecution>(`/pathway/enrollments/${enrollmentId}/skip`, body);
}

/* ------------------------------ 变异 ---------------------------------- */

/** 记录变异（自动判定正/负；负性且建议退出时返回提示）。 */
export function recordVariation(
  enrollmentId: string,
  body: { category: VariationCategory; description: string; stageDay?: number },
): Promise<PathwayVariation> {
  return post<PathwayVariation>(`/pathway/enrollments/${enrollmentId}/variation`, body);
}

/** 变异列表。 */
export function listVariations(enrollmentId: string): Promise<PathwayVariation[]> {
  return get<PathwayVariation[]>(`/pathway/enrollments/${enrollmentId}/variations`);
}

/* --------------------------- 退出 / 完成出径 ---------------------------- */

/** 退出路径（in_path→withdrawn，记 actual_los/fee，电子签名）。 */
export function withdraw(enrollmentId: string, body: { reason: string }): Promise<PathwayEnrollment> {
  return post<PathwayEnrollment>(`/pathway/enrollments/${enrollmentId}/withdraw`, body);
}

/** 完成出径（出院标准全部满足才 completed，否则 409 列出未满足项）。 */
export function complete(
  enrollmentId: string,
  body: { confirmedDischarge: string[] },
): Promise<PathwayEnrollment> {
  return post<PathwayEnrollment>(`/pathway/enrollments/${enrollmentId}/complete`, body);
}

/* ------------------------------ 质控指标 ------------------------------- */

/** 临床路径质控指标（分子分母可核查）。 */
export function getPathwayMetrics(from: string, to: string): Promise<PathwayMetrics> {
  return get<PathwayMetrics>(
    `/pathway/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}
