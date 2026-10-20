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
  // M198 空数据修复：DEMO_MODE 下返回确定性演示队列，避免页面「暂无数据」。
  if (process.env.DEMO_MODE === '1') {
    const demo: ResearchCohort[] = [
      { id: 'demo-cohort-01', name: '冠心病稳定型心绞痛队列', disease: '冠心病', diseaseCode: 'I25.101', criteria: { include: ['年龄>=18', '确诊冠心病'], exclude: ['急性心梗<30天'] }, status: 'active', createdBy: 'u_2001', lastRunAt: '2026-10-18 09:00', lastRunAdded: 12, createdAt: '2026-09-01 10:00', updatedAt: '2026-10-18 09:00' } as ResearchCohort,
      { id: 'demo-cohort-02', name: '2型糖尿病并发症随访队列', disease: '2型糖尿病', diseaseCode: 'E11.900', criteria: { include: ['糖尿病史>=1年'], exclude: ['1型糖尿病'] }, status: 'active', createdBy: 'u_2001', lastRunAt: '2026-10-17 14:00', lastRunAdded: 8, createdAt: '2026-09-05 11:00', updatedAt: '2026-10-17 14:00' } as ResearchCohort,
      { id: 'demo-cohort-03', name: '社区获得性肺炎预后队列', disease: '肺炎', diseaseCode: 'J18.900', criteria: { include: ['出院诊断=肺炎'], exclude: ['院内获得性肺炎'] }, status: 'draft', createdBy: 'u_2001', lastRunAt: null, lastRunAdded: 0, createdAt: '2026-10-10 16:00', updatedAt: '2026-10-10 16:00' } as ResearchCohort,
      { id: 'demo-cohort-04', name: '脑卒中二级预防队列', disease: '脑梗死', diseaseCode: 'I63.900', criteria: { include: ['脑梗死出院'], exclude: ['出血性卒中'] }, status: 'archived', createdBy: 'u_2001', lastRunAt: '2026-08-20 10:00', lastRunAdded: 25, createdAt: '2026-06-01 09:00', updatedAt: '2026-08-20 10:00' } as ResearchCohort,
    ];
    if (options?.status) return demo.filter((c) => c.status === options.status);
    return demo;
  }
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

/* ============================================================================
 * M140-B 科研项目管理（医院管理深化）
 * ----------------------------------------------------------------------------
 * 红线：跟踪到结题，不能登记完就不管了。项目四态闭环：
 *   applying 申报中 -> active 进行中 -> completed 已结题 -> accepted 已验收。
 *
 * 纯函数约定：不访问数据库、不发网络；状态保存在模块内的内存台账中，
 * 可通过 resetResearchProjectStore() 在测试/冷启动时重建。
 * ==========================================================================*/

/** 项目状态：申报中 / 进行中 / 已结题 / 已验收 */
export type ResearchProjectStatus = 'applying' | 'active' | 'completed' | 'accepted';

/** 里程碑流水条目 */
export interface ResearchMilestoneEntry {
  /** 里程碑名称 */
  name: string;
  /** 记录时间（ISO） */
  recordedAt: string;
}

/** 科研项目（纯数据，无 I/O） */
export interface ResearchProject {
  /** 业务编号 P-YYYY-XXXX */
  id: string;
  /** 课题名称 */
  title: string;
  /** 课题负责人工号 */
  leaderId: string;
  /** 承担科室 */
  dept: string;
  /** 经费（万元，非负） */
  funding: number;
  /** 计划开始日 yyyy-mm-dd */
  startDate: string;
  /** 计划结束日 yyyy-mm-dd */
  endDate: string;
  /** 四态闭环 */
  status: ResearchProjectStatus;
  /** 进度 0~100 */
  progress: number;
  /** 当前里程碑 */
  milestone: string;
  /** 里程碑流水 */
  milestones: ResearchMilestoneEntry[];
  createdAt: string;
  updatedAt: string;
}

/** 年度科研报告 */
export interface ResearchReport {
  /** 报告年度 */
  year: number;
  /** 当年立项项目总数 */
  total: number;
  /** 按状态计数 */
  byStatus: Record<ResearchProjectStatus, number>;
  /** 按承担科室汇总 */
  byDept: Array<{ dept: string; count: number; funding: number }>;
  /** 当年项目经费合计（万元） */
  totalFunding: number;
  /** 平均进度（0~100，四舍五入） */
  avgProgress: number;
  /** 已结题数 */
  completedCount: number;
  /** 已验收数 */
  acceptedCount: number;
  generatedAt: string;
}

/** 项目状态中文标签（前端/报告共用口径） */
export const RESEARCH_STATUS_LABEL: Record<ResearchProjectStatus, string> = {
  applying: '申报中',
  active: '进行中',
  completed: '已结题',
  accepted: '已验收',
};

/* ------------------------- 内存台账（纯函数状态载体） ------------------------- */

const projectLedger = new Map<string, ResearchProject>();
let projectSeq = 0;

function projectNowIso(): string {
  return new Date().toISOString();
}

/** 重建项目台账。测试或冷启动时调用。 */
export function resetResearchProjectStore(): void {
  projectLedger.clear();
  projectSeq = 0;
}

/** 深拷贝项目快照返回，避免外部改写污染台账 */
function snapshotProject(p: ResearchProject): ResearchProject {
  return { ...p, milestones: p.milestones.map((m) => ({ ...m })) };
}

/** 校验 yyyy-mm-dd 日期串，返回 Date；非法抛错 */
function parseDate(s: unknown, field: string): Date {
  const str = String(s ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error(`${field} 格式应为 yyyy-mm-dd：${str || '(空)'}`);
  }
  const d = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`${field} 不是有效日期：${str}`);
  return d;
}

/* ------------------------------ 纯函数：登记 ------------------------------ */

/**
 * 登记科研项目（医院管理深化）。
 * 登记后状态为「申报中」，progress=0；后续 updateResearchProgress 推动闭环。
 *
 * @param title     课题名称（必填）
 * @param leaderId  课题负责人工号（必填）
 * @param dept      承担科室（必填）
 * @param funding   经费（万元，>=0）
 * @param startDate 计划开始 yyyy-mm-dd
 * @param endDate   计划结束 yyyy-mm-dd（不得早于开始）
 * @returns 新建项目快照
 */
export function registerResearchProject(
  title: string,
  leaderId: string,
  dept: string,
  funding: number,
  startDate: string,
  endDate: string,
): ResearchProject {
  const t = String(title ?? '').trim();
  if (!t) throw new Error('课题名称 title 不能为空');
  const lid = String(leaderId ?? '').trim();
  if (!lid) throw new Error('课题负责人 leaderId 不能为空');
  const d = String(dept ?? '').trim();
  if (!d) throw new Error('承担科室 dept 不能为空');
  const fund = Number(funding);
  if (!Number.isFinite(fund) || fund < 0) throw new Error('经费 funding 必须为非负数（万元）');

  const sd = parseDate(startDate, '开始日期 startDate');
  const ed = parseDate(endDate, '结束日期 endDate');
  if (ed.getTime() < sd.getTime()) {
    throw new Error('结束日期 endDate 不得早于开始日期 startDate');
  }

  projectSeq += 1;
  const year = sd.getUTCFullYear();
  const id = `P-${year}-${String(projectSeq).padStart(4, '0')}`;
  const now = projectNowIso();
  const project: ResearchProject = {
    id,
    title: t,
    leaderId: lid,
    dept: d,
    funding: Math.round(fund * 100) / 100,
    startDate: sd.toISOString().slice(0, 10),
    endDate: ed.toISOString().slice(0, 10),
    status: 'applying',
    progress: 0,
    milestone: '项目申报',
    milestones: [{ name: '项目申报', recordedAt: now }],
    createdAt: now,
    updatedAt: now,
  };
  projectLedger.set(id, project);
  return snapshotProject(project);
}

/* ----------------------------- 纯函数：进度 ----------------------------- */

/**
 * 更新项目进度（医院管理深化），驱动四态闭环，跟踪到结题：
 *   - 申报中 + progress>0        -> 进行中
 *   - progress>=100             -> 已结题（杜绝僵尸课题停在进行中）
 *   - 已结题 + 里程碑含「验收」   -> 已验收（闭环收口）
 *   - 已验收项目禁止再改进度（收口后冻结）
 *
 * @param projectId 项目编号（registerResearchProject 返回的 id）
 * @param progress  进度 0~100（整数）
 * @param milestone 当前里程碑名称（必填，如「伦理审查通过」「中期检查」「验收通过」）
 * @returns 更新后的项目快照
 */
export function updateResearchProgress(
  projectId: string,
  progress: number,
  milestone: string,
): ResearchProject {
  const id = String(projectId ?? '').trim();
  const p = projectLedger.get(id);
  if (!p) throw new Error(`科研项目不存在：${id || '(空编号)'}`);
  if (p.status === 'accepted') {
    throw new Error(`项目 ${id} 已验收闭环，不再调整进度`);
  }

  const prog = Number(progress);
  if (!Number.isFinite(prog) || !Number.isInteger(prog) || prog < 0 || prog > 100) {
    throw new Error('进度 progress 必须为 0~100 的整数');
  }
  const ms = String(milestone ?? '').trim();
  if (!ms) throw new Error('里程碑 milestone 不能为空');

  p.progress = prog;
  p.milestone = ms;
  p.updatedAt = projectNowIso();
  p.milestones.push({ name: ms, recordedAt: p.updatedAt });

  // 状态机：验收优先于结题（已结题项目凭「验收」里程碑收口）
  if (p.status === 'completed' && ms.includes('验收')) {
    p.status = 'accepted';
  } else if (prog >= 100) {
    p.status = 'completed';
  } else if (p.status === 'applying' && prog > 0) {
    p.status = 'active';
  }
  return snapshotProject(p);
}

/* ----------------------------- 纯函数：报告 ----------------------------- */

/**
 * 生成年度科研报告（医院管理深化）。按 startDate 所属年度归集。
 *
 * @param year 报告年度（如 2026）
 * @returns 汇总报告
 */
export function generateResearchReport(year: number): ResearchReport {
  const y = Number(year);
  if (!Number.isFinite(y) || !Number.isInteger(y) || y < 2000 || y > 2100) {
    throw new Error(`报告年度 year 不合法：${String(year)}`);
  }
  const byStatus: Record<ResearchProjectStatus, number> = {
    applying: 0,
    active: 0,
    completed: 0,
    accepted: 0,
  };
  const deptMap = new Map<string, { count: number; funding: number }>();
  let totalFunding = 0;
  let progressSum = 0;

  for (const p of projectLedger.values()) {
    if (!p.startDate.startsWith(`${y}-`)) continue;
    byStatus[p.status] += 1;
    totalFunding += p.funding;
    progressSum += p.progress;
    const entry = deptMap.get(p.dept) ?? { count: 0, funding: 0 };
    entry.count += 1;
    entry.funding = Math.round((entry.funding + p.funding) * 100) / 100;
    deptMap.set(p.dept, entry);
  }

  const total = byStatus.applying + byStatus.active + byStatus.completed + byStatus.accepted;
  const byDept = [...deptMap.entries()]
    .map(([dept, v]) => ({ dept, count: v.count, funding: v.funding }))
    .sort((a, b) => b.funding - a.funding || a.dept.localeCompare(b.dept));

  return {
    year: y,
    total,
    byStatus,
    byDept,
    totalFunding: Math.round(totalFunding * 100) / 100,
    avgProgress: total > 0 ? Math.round((progressSum / total) * 10) / 10 : 0,
    completedCount: byStatus.completed,
    acceptedCount: byStatus.accepted,
    generatedAt: projectNowIso(),
  };
}

/** 项目列表（GET 管理端用），按更新时间倒序；可按状态过滤 */
export function listResearchProjects(filter?: { status?: ResearchProjectStatus }): ResearchProject[] {
  const all = [...projectLedger.values()]
    .filter((p) => !filter?.status || p.status === filter.status)
    .map(snapshotProject);
  all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return all;
}
