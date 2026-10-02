/**
 * 健澜科技 jlmedaios - 科研专病队列聚合器（M5-B）
 *
 * 队列闭环：
 *  - 创建/编辑队列（草稿，纳入/排除标准）→ 发布（active）→ 运行匹配；
 *  - 运行匹配：扫描患者，组装研究画像，确定性规则引擎评估，符合者自动入组；
 *  - 成员快照默认脱敏；队列统计与脱敏数据集导出；
 *  - 归档（archived）。
 *
 * 红线：匹配确定性、可重复运行不重复入组；不写明文身份；队列不用于诊疗。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb } from '../../db/pool.js';
import {
  queryPatients,
  type Patient,
} from '../../db/repositories/patientRepo.js';
import {
  getLabResultsByPatient,
  type LabResult,
} from '../../db/repositories/labResultRepo.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  type CohortMember,
  type ResearchCohort,
  addCohortMember,
  countCohortMembers,
  createCohort,
  getCohortById,
  listCohortMembers,
  listCohorts,
  recordCohortRun,
  setCohortStatus,
  updateCohortDefinition,
} from '../../db/repositories/cohortRepo.js';
import {
  evaluateCohort,
  type CohortCriteria,
  type ResearchProfile,
} from '../../medical-tools/research/cohortRuleEngine.js';

/* -------------------------------- 错误类型 ------------------------------- */

export class ResearchError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ResearchError';
  }
}
const badRequest = (m: string) => new ResearchError(400, 'BAD_REQUEST', m);
const notFound = (m: string) => new ResearchError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new ResearchError(403, 'FORBIDDEN', m);
const conflict = (m: string) => new ResearchError(409, 'CONFLICT', m);

/* ------------------------------ 工具函数 ------------------------------ */

/** 由出生日期计算周岁 */
function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const bd = new Date(birthDate);
  if (Number.isNaN(bd.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  const monthDiff = now.getMonth() - bd.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < bd.getDate())) {
    age -= 1;
  }
  return age;
}

interface PatientDiagnosisRow {
  patientId: string;
  name: string;
  code: string | null;
  confirmed: boolean;
}

/** 批量取全部患者的诊断（按患者分组），避免逐患者查询 */
async function loadAllDiagnoses(): Promise<Map<string, PatientDiagnosisRow[]>> {
  const db = getDb();
  const rows = await db`
    SELECT patient_id, name, code, confirmed
    FROM clinical.diagnoses
  `;
  const map = new Map<string, PatientDiagnosisRow[]>();
  for (const r of rows as Array<Record<string, unknown>>) {
    const pid = String(r.patient_id);
    const item: PatientDiagnosisRow = {
      patientId: pid,
      name: String(r.name),
      code: r.code ? String(r.code) : null,
      confirmed: Boolean(r.confirmed),
    };
    const arr = map.get(pid) ?? [];
    arr.push(item);
    map.set(pid, arr);
  }
  return map;
}

/** 组装单个患者的研究画像 */
function buildProfile(
  patient: Patient,
  diagnoses: PatientDiagnosisRow[],
  labs: LabResult[],
): ResearchProfile {
  return {
    patientId: patient.id,
    gender: patient.gender,
    age: calcAge(patient.birthDate),
    tags: patient.tags ?? [],
    diagnoses: diagnoses.map((d) => ({
      name: d.name,
      code: d.code,
      confirmed: d.confirmed,
    })),
    labResults: labs.map((l) => ({
      itemCode: l.itemCode,
      itemName: l.itemName,
      numericValue: l.numericValue,
      abnormalFlag: l.abnormalFlag,
    })),
  };
}

/** 构造脱敏快照（不含明文身份字段） */
function buildSnapshot(
  patient: Patient,
  profile: ResearchProfile,
  matchedRules: string[],
): Record<string, unknown> {
  return {
    mrn: patient.mrn,
    gender: patient.gender,
    age: profile.age,
    tags: profile.tags,
    diagnoses: profile.diagnoses
      .filter((d) => d.confirmed)
      .map((d) => ({ name: d.name, code: d.code })),
    abnormalLabs: profile.labResults
      .filter((l) => l.abnormalFlag && l.abnormalFlag !== 'N')
      .map((l) => ({
        itemCode: l.itemCode,
        itemName: l.itemName,
        abnormalFlag: l.abnormalFlag,
      })),
    matchedRules,
  };
}

async function audit(
  auth: AuthView,
  action: string,
  resourceId: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  await recordChainAudit({
    actorId: auth.id,
    actorName: auth.realName,
    actorRole: auth.rawRoles[0] ?? null,
    actorDept: auth.deptName,
    action,
    resourceType: 'research_cohort',
    resourceId,
    result: 'success',
    detail,
  });
}

/* ------------------------------ 队列管理 ------------------------------ */

export interface CreateCohortInput {
  name: string;
  disease: string;
  diseaseCode?: string | null;
  criteria: CohortCriteria;
}

export async function createResearchCohort(
  auth: AuthView,
  input: CreateCohortInput,
): Promise<ResearchCohort> {
  if (!input.name?.trim()) throw badRequest('队列名称不能为空');
  if (!input.disease?.trim()) throw badRequest('目标疾病不能为空');
  if (!input.criteria || typeof input.criteria.include !== 'object') {
    throw badRequest('队列标准格式不正确（需含 include/exclude）');
  }
  const cohort = await createCohort({
    name: input.name.trim(),
    disease: input.disease.trim(),
    diseaseCode: input.diseaseCode ?? null,
    criteria: input.criteria,
    createdBy: auth.id,
  });
  await audit(auth, 'research.cohort_create', cohort.id, { name: cohort.name });
  return cohort;
}

export async function updateResearchCohort(
  auth: AuthView,
  id: string,
  patch: { name?: string; criteria?: CohortCriteria; disease?: string; diseaseCode?: string | null },
): Promise<ResearchCohort> {
  const existing = await getCohortById(id);
  if (!existing) throw notFound('队列不存在');
  if (existing.status !== 'draft') {
    throw conflict('仅草稿态队列可编辑（已发布请先归档后新建）');
  }
  const updated = await updateCohortDefinition(id, patch);
  return updated!;
}

export async function publishResearchCohort(
  auth: AuthView,
  id: string,
): Promise<ResearchCohort> {
  const existing = await getCohortById(id);
  if (!existing) throw notFound('队列不存在');
  if (existing.status !== 'draft') throw conflict('仅草稿态队列可发布');
  const updated = await setCohortStatus(id, 'active');
  await audit(auth, 'research.cohort_publish', id);
  return updated!;
}

export async function archiveResearchCohort(
  auth: AuthView,
  id: string,
): Promise<ResearchCohort> {
  const existing = await getCohortById(id);
  if (!existing) throw notFound('队列不存在');
  if (existing.status === 'archived') throw conflict('队列已归档');
  const updated = await setCohortStatus(id, 'archived');
  await audit(auth, 'research.cohort_archive', id);
  return updated!;
}

/* ------------------------------ 运行匹配 ------------------------------ */

export interface RunResult {
  cohortId: string;
  scanned: number;
  added: number;
  totalMembers: number;
}

export async function runCohortMatching(
  auth: AuthView,
  id: string,
): Promise<RunResult> {
  const cohort = await getCohortById(id);
  if (!cohort) throw notFound('队列不存在');
  if (cohort.status !== 'active') {
    throw conflict('仅已发布（active）队列可运行匹配');
  }

  // 扫描患者（含标签），批量取诊断
  const patients = await queryPatients({ limit: 10000 });
  const allDiagnoses = await loadAllDiagnoses();

  let added = 0;
  // 逐患者评估；检验按患者取（匹配通常只涉及少量检验项目）
  for (const patient of patients) {
    const diagnoses = allDiagnoses.get(patient.id) ?? [];
    let labs: LabResult[] = [];
    const needsLabs =
      (cohort.criteria.include.labs?.length ?? 0) > 0 ||
      (cohort.criteria.exclude.labs?.length ?? 0) > 0;
    if (needsLabs) {
      labs = await getLabResultsByPatient(patient.id, { limit: 200 });
    }
    const profile = buildProfile(patient, diagnoses, labs);
    const result = evaluateCohort(profile, cohort.criteria);
    if (!result.eligible) continue;
    const snapshot = buildSnapshot(patient, profile, result.matchedRules);
    const isNew = await addCohortMember(
      cohort.id,
      patient.id,
      result.matchedRules,
      snapshot,
    );
    if (isNew) added += 1;
  }

  await recordCohortRun(cohort.id, added);
  const totalMembers = await countCohortMembers(cohort.id);
  await audit(auth, 'research.cohort_run', id, { scanned: patients.length, added });
  return { cohortId: cohort.id, scanned: patients.length, added, totalMembers };
}

/* ------------------------------ 查询与统计 ------------------------------ */

export async function listResearchCohorts(
  auth: AuthView,
  options?: { status?: string },
): Promise<ResearchCohort[]> {
  return listCohorts(options?.status ? { status: options.status } : undefined);
}

export async function getResearchCohort(
  auth: AuthView,
  id: string,
): Promise<ResearchCohort> {
  const cohort = await getCohortById(id);
  if (!cohort) throw notFound('队列不存在');
  return cohort;
}

export async function getCohortMembers(
  auth: AuthView,
  id: string,
  options?: { limit?: number; offset?: number },
): Promise<CohortMember[]> {
  const cohort = await getCohortById(id);
  if (!cohort) throw notFound('队列不存在');
  return listCohortMembers(id, options);
}

export interface CohortStats {
  total: number;
  byGender: Record<string, number>;
  ageBuckets: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
}

/** 队列统计：总数、性别分布、年龄段分布、高频标签 */
export async function getResearchCohortStats(
  auth: AuthView,
  id: string,
): Promise<CohortStats> {
  const cohort = await getCohortById(id);
  if (!cohort) throw notFound('队列不存在');
  const members = await listCohortMembers(id, { limit: 10000 });

  const byGender: Record<string, number> = {};
  const ageBuckets: Record<string, number> = {
    '<40': 0,
    '40-59': 0,
    '60-74': 0,
    '≥75': 0,
    '未知': 0,
  };
  const tagCounts = new Map<string, number>();

  for (const m of members) {
    const snap = m.dataSnapshot;
    const gender = String(snap.gender ?? '未知');
    byGender[gender] = (byGender[gender] ?? 0) + 1;
    const age = snap.age as number | null;
    if (age === null || age === undefined) {
      ageBuckets['未知'] += 1;
    } else if (age < 40) {
      ageBuckets['<40'] += 1;
    } else if (age < 60) {
      ageBuckets['40-59'] += 1;
    } else if (age < 75) {
      ageBuckets['60-74'] += 1;
    } else {
      ageBuckets['≥75'] += 1;
    }
    const tags = (snap.tags as string[]) ?? [];
    for (const t of tags) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }

  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { total: members.length, byGender, ageBuckets, topTags };
}

/** 导出脱敏数据集（成员快照列表，无明文身份） */
export async function exportCohortDataset(
  auth: AuthView,
  id: string,
): Promise<Array<Record<string, unknown>>> {
  const cohort = await getCohortById(id);
  if (!cohort) throw notFound('队列不存在');
  const members = await listCohortMembers(id, { limit: 10000 });
  await audit(auth, 'research.cohort_export', id, { rows: members.length });
  return members.map((m) => m.dataSnapshot);
}
