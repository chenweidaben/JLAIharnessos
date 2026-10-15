/**
 * 健澜科技 jlmedaios - 慢病管理聚合器（M39-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import { createPlan, recordVitals, listPlans, listVitalsByPatient, type Plan, type Vitals } from '../../db/repositories/chronicRepo.js';
import { abnormalLevel } from '../../medical-tools/nursing/chronicDisease.js';

export class ChronicError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'ChronicError';
  }
}
const badRequest = (m: string) => new ChronicError(400, 'BAD_REQUEST', m);
const forbidden = (m: string) => new ChronicError(403, 'FORBIDDEN', m);
function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createPlanView(
  auth: AuthView,
  inp: { patientId: string; disease: 'hypertension' | 'diabetes'; targetSbp?: number | null; targetDbp?: number | null; targetHba1c?: number | null; nextFollowupAt: string },
): Promise<Plan> {
  assertPermission(auth, 'chronic:manage');
  if (!UUID_RE.test(inp.patientId)) throw badRequest('patientId 非法');
  return withTx(async (tx) => {
    const r = await createPlan(inp, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'chronic.plan', resourceType: 'chronic_followup_plan', resourceId: r.id,
      patientRef: r.patientId, visitRef: null, result: 'success',
      detail: { disease: r.disease },
    }, tx);
    return r;
  });
}

export async function recordVitalsView(
  auth: AuthView,
  inp: { patientId: string; sbp?: number | null; dbp?: number | null; fastingGlucose?: number | null; hba1c?: number | null; note?: string | null },
): Promise<Vitals & { level: string; interventionTaskId: string | null }> {
  assertPermission(auth, 'chronic:manage');
  if (!UUID_RE.test(inp.patientId)) throw badRequest('patientId 非法');
  const disease = inp.sbp != null || inp.dbp != null ? 'hypertension' : 'diabetes';
  const level = abnormalLevel(disease, inp.sbp ?? null, inp.dbp ?? null, inp.fastingGlucose ?? null, inp.hba1c ?? null);
  const { rec, taskId } = await withTx(async (tx) => {
    const r = await recordVitals({ ...inp, createdBy: auth.id }, tx);
    await recordChainAudit({
      actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
      action: 'chronic.vitals', resourceType: 'chronic_vitals', resourceId: r.id,
      patientRef: r.patientId, visitRef: null, result: 'success',
      detail: { level, sbp: r.sbp, dbp: r.dbp, fpg: r.fastingGlucose, hba1c: r.hba1c },
    }, tx);
    let taskId: string | null = null;
    if (level === 'abnormal' || level === 'critical') {
      const exists = await hasOpenTask(r.patientId, 'chronic', tx);
      if (!exists) {
        const t = await createTask({
          source: 'chronic', visitId: null,
          title: `Chronic ${disease} ${level}`,
          finding: `sbp=${r.sbp} dbp=${r.dbp} fpg=${r.fastingGlucose} hba1c=${r.hba1c} level=${level}`,
          assigneeId: auth.id, createdBy: auth.id,
        }, tx);
        taskId = t.id;
      }
    }
    return { rec: r, taskId };
  });
  return { ...rec, level, interventionTaskId: taskId };
}

export async function listChronicView(auth: AuthView, patientId: string): Promise<{ plans: Plan[]; vitals: Vitals[] }> {
  assertPermission(auth, 'chronic:view');
  if (!UUID_RE.test(patientId)) throw badRequest('patientId 非法');
  const [plans, vitals] = await Promise.all([listPlans(patientId), listVitalsByPatient(patientId)]);
  return { plans, vitals };
}

// ============================================================================
// M131-B 慢病管理助手（AI能力深化）
//
// 以下为无副作用纯函数，以 clinical.chronic_disease_record 测量记录为输入：
//   - buildChronicDiseaseManagement：聚合某患者的慢病概览——分病种取最新测量，
//     与指南控制目标做「达标/超标」对比，给出总体风险分级；
//   - predictRiskTrend：对各指标时间序列做最小二乘线性回归，外推 7 天后取值，
//     按周环比升降判定趋势方向，并叠加最新超目标幅度给出 0-100 风险分。
// 本纯函数层不触库，记录读取由 routes/patientChronic.ts 经 repo 完成，便于单测。
// ============================================================================

/** 慢病因：hypertension 高血压 / diabetes 糖尿病 / chd 冠心病 */
export type ChronicDiseaseType = 'hypertension' | 'diabetes' | 'chd';

/** 单条慢病测量记录（与 clinical.chronic_disease_record 行结构对齐） */
export interface ChronicDiseaseRecord {
  id: string;
  patientId: string;
  disease: ChronicDiseaseType;
  /** 收缩压 mmHg（高血压） */
  sbp: number | null;
  /** 舒张压 mmHg（高血压） */
  dbp: number | null;
  /** 空腹血糖 mmol/L（糖尿病，目标 <7.0） */
  fastingGlucose: number | null;
  /** 糖化血红蛋白 %（糖尿病） */
  hba1c: number | null;
  /** 静息心率 bpm（冠心病） */
  heartRate: number | null;
  /** 低密度脂蛋白胆固醇 mmol/L（冠心病，目标 <1.8） */
  ldl: number | null;
  measuredAt: string;
  note?: string | null;
}

/** 指标 key 联合类型 */
export type ChronicMetricKey = 'sbp' | 'dbp' | 'fastingGlucose' | 'hba1c' | 'heartRate' | 'ldl';

/** 单个指标的控制目标定义 */
export interface ChronicMetricTarget {
  key: ChronicMetricKey;
  label: string;
  unit: string;
  /** 控制目标值（本类指标均为「越低越好」） */
  target: number;
}

/** 病种中文显示名 */
export const CHRONIC_DISEASE_NAMES: Record<ChronicDiseaseType, string> = {
  hypertension: '高血压',
  diabetes: '糖尿病',
  chd: '冠心病',
};

/**
 * 各病种控制目标（AI能力深化 · 指南目标值）：
 *   - 高血压：收缩压 <140 mmHg 且 舒张压 <90 mmHg
 *   - 糖尿病：空腹血糖 <7.0 mmol/L（糖化血红蛋白 <7.0%）
 *   - 冠心病：LDL-C <1.8 mmol/L（极高危）、静息心率 <70 bpm
 */
export const CHRONIC_TARGETS: Record<ChronicDiseaseType, ChronicMetricTarget[]> = {
  hypertension: [
    { key: 'sbp', label: '收缩压', unit: 'mmHg', target: 140 },
    { key: 'dbp', label: '舒张压', unit: 'mmHg', target: 90 },
  ],
  diabetes: [
    { key: 'fastingGlucose', label: '空腹血糖', unit: 'mmol/L', target: 7.0 },
    { key: 'hba1c', label: '糖化血红蛋白', unit: '%', target: 7.0 },
  ],
  chd: [
    { key: 'ldl', label: '低密度脂蛋白', unit: 'mmol/L', target: 1.8 },
    { key: 'heartRate', label: '静息心率', unit: 'bpm', target: 70 },
  ],
};

/** 单指标最新值 vs 目标值对比 */
export interface ChronicMetricComparison {
  key: ChronicMetricKey;
  label: string;
  unit: string;
  current: number | null;
  target: number;
  /** 当前值是否达标（<目标值） */
  atTarget: boolean;
  /** 超出目标的幅度（current - target）；未测量为 null */
  delta: number | null;
}

/** 单病种状态：controlled 全部达标 / abnormal 超标未危急 / critical 危急 */
export type ChronicStatus = 'controlled' | 'abnormal' | 'critical';

/** 单病种概览 */
export interface ChronicDiseaseSummary {
  disease: ChronicDiseaseType;
  diseaseName: string;
  latestAt: string | null;
  status: ChronicStatus;
  metrics: ChronicMetricComparison[];
}

/** 单指标趋势序列 */
export interface ChronicMetricTrend {
  key: ChronicMetricKey;
  label: string;
  unit: string;
  target: number;
  points: { at: string; value: number }[];
  /** 每日变化斜率（线性回归）；样本不足为 null */
  slopePerDay: number | null;
  /** 由最后一次测量外推 7 天后的预测值 */
  predictedNext: { at: string; value: number } | null;
  direction: 'improving' | 'worsening' | 'stable';
}

/** 风险趋势预测结果（predictRiskTrend 返回值） */
export interface ChronicRiskTrend {
  direction: 'improving' | 'worsening' | 'stable';
  /** 0-100 综合风险分 */
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  /** 样本量置信度 */
  confidence: 'low' | 'medium' | 'high';
  metrics: ChronicMetricTrend[];
}

/** 慢病管理概览（buildChronicDiseaseManagement 返回值） */
export interface ChronicOverview {
  patientId: string;
  overallRisk: 'controlled' | 'abnormal' | 'critical' | 'unknown';
  riskScore: number;
  diseases: ChronicDiseaseSummary[];
  trend: ChronicRiskTrend;
  recordCount: number;
  generatedAt: string;
}

/** 保留 1 位小数，避免 json 浮点长尾 */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

function metricValue(r: ChronicDiseaseRecord, key: ChronicMetricKey): number | null {
  const v = r[key];
  return v == null ? null : Number(v);
}

/** 危急阈值（AI能力深化：超过即触发紧急干预提示） */
function isCriticalChronic(disease: ChronicDiseaseType, r: ChronicDiseaseRecord): boolean {
  switch (disease) {
    case 'hypertension':
      return (r.sbp != null && r.sbp >= 180) || (r.dbp != null && r.dbp >= 110);
    case 'diabetes':
      return (r.fastingGlucose != null && r.fastingGlucose >= 11.1) || (r.hba1c != null && r.hba1c >= 10);
    case 'chd':
      return (r.ldl != null && r.ldl >= 4.9) || (r.heartRate != null && r.heartRate >= 100);
  }
}

/** 由单条最新记录判定病种状态：critical > controlled(全部达标) > abnormal */
function diseaseStatus(disease: ChronicDiseaseType, r: ChronicDiseaseRecord): ChronicStatus {
  if (isCriticalChronic(disease, r)) return 'critical';
  const targets = CHRONIC_TARGETS[disease];
  const present = targets.filter((t) => metricValue(r, t.key) != null);
  if (present.length === 0) return 'abnormal';
  const allOnTarget = present.every((t) => {
    const v = metricValue(r, t.key);
    return v != null && v < t.target;
  });
  return allOnTarget ? 'controlled' : 'abnormal';
}

/** 单病种最新值 vs 目标值对比列表 */
function compareMetrics(disease: ChronicDiseaseType, r: ChronicDiseaseRecord): ChronicMetricComparison[] {
  return CHRONIC_TARGETS[disease].map((t) => {
    const current = metricValue(r, t.key);
    return {
      key: t.key,
      label: t.label,
      unit: t.unit,
      current,
      target: t.target,
      atTarget: current != null && current < t.target,
      delta: current == null ? null : r1(current - t.target),
    };
  });
}

/** 指标风险计分权重：超出目标后每单位对应的分值（封顶 cap） */
const RISK_WEIGHTS: Record<ChronicMetricKey, { perUnit: number; cap: number }> = {
  sbp: { perUnit: 1.5, cap: 30 },
  dbp: { perUnit: 2.0, cap: 20 },
  fastingGlucose: { perUnit: 5.0, cap: 25 },
  hba1c: { perUnit: 3.0, cap: 15 },
  ldl: { perUnit: 8.0, cap: 20 },
  heartRate: { perUnit: 0.5, cap: 10 },
};

/** 全部指标 key 顺序（趋势聚合用） */
const ALL_METRIC_KEYS: ChronicMetricKey[] = ['sbp', 'dbp', 'fastingGlucose', 'hba1c', 'ldl', 'heartRate'];

/** 指标元信息：key -> {label, unit, target}（合并三病种目标表） */
const METRIC_META: Record<ChronicMetricKey, { label: string; unit: string; target: number }> = (() => {
  const meta = {} as Record<ChronicMetricKey, { label: string; unit: string; target: number }>;
  for (const disease of Object.keys(CHRONIC_TARGETS) as ChronicDiseaseType[]) {
    for (const t of CHRONIC_TARGETS[disease]) meta[t.key] = { label: t.label, unit: t.unit, target: t.target };
  }
  return meta;
})();

/** 对 (天偏移, 数值) 序列做最小二乘线性回归，返回每日斜率；<2 点或零方差返回 null */
function linearSlopePerDay(points: { at: number; value: number }[]): number | null {
  if (points.length < 2) return null;
  const n = points.length;
  const meanT = points.reduce((s, p) => s + p.at, 0) / n;
  const meanV = points.reduce((s, p) => s + p.value, 0) / n;
  let cov = 0;
  let varT = 0;
  for (const p of points) {
    cov += (p.at - meanT) * (p.value - meanV);
    varT += (p.at - meanT) ** 2;
  }
  if (varT === 0) return null;
  return cov / varT;
}

/**
 * 风险趋势预测（AI能力深化）。
 *
 * 对各指标时间序列做线性回归：
 *   - 周环比（slope×7）≤ -1 判为 improving（指标向好），≥ 1 判为 worsening（恶化）；
 *   - 由最后一次测量外推 7 天得到 predictedNext；
 *   - 风险分 = Σ 各指标「最新值超目标幅度 × 单位分值（封顶）」，再按趋势方向 ±10，
 *     截断到 [0,100]；据此映射 low/moderate/high/critical。
 *
 * 本函数不修改入参，对 records 做时间升序拷贝后计算。
 *
 * @param records 某患者的全部慢病测量记录
 * @returns 趋势方向 / 风险分 / 分指标序列与外推
 */
export function predictRiskTrend(records: ChronicDiseaseRecord[]): ChronicRiskTrend {
  const DAY = 86_400_000;
  const sorted = [...records].sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
  const t0 = sorted.length > 0 ? new Date(sorted[0].measuredAt).getTime() : 0;

  const metrics: ChronicMetricTrend[] = [];
  let improving = 0;
  let worsening = 0;

  for (const key of ALL_METRIC_KEYS) {
    const pts = sorted
      .map((r) => {
        const v = metricValue(r, key);
        return v == null
          ? null
          : { atMs: new Date(r.measuredAt).getTime(), value: v, at: r.measuredAt };
      })
      .filter((p): p is { atMs: number; value: number; at: string } => p != null);
    if (pts.length === 0) continue;

    const slope = linearSlopePerDay(pts.map((p) => ({ at: (p.atMs - t0) / DAY, value: p.value })));

    // 本类指标均「越低越好」：数值下降为改善，上升为恶化
    let direction: ChronicMetricTrend['direction'] = 'stable';
    if (slope != null) {
      const week = slope * 7;
      if (week <= -1) direction = 'improving';
      else if (week >= 1) direction = 'worsening';
    }
    if (direction === 'improving') improving++;
    else if (direction === 'worsening') worsening++;

    const lastP = pts[pts.length - 1];
    const predictedNext =
      slope != null
        ? { at: new Date(lastP.atMs + 7 * DAY).toISOString(), value: r1(lastP.value + slope * 7) }
        : null;

    const m = METRIC_META[key];
    metrics.push({
      key,
      label: m.label,
      unit: m.unit,
      target: m.target,
      points: pts.map((p) => ({ at: p.at, value: p.value })),
      slopePerDay: slope == null ? null : r1(slope),
      predictedNext,
      direction,
    });
  }

  let direction: ChronicRiskTrend['direction'] = 'stable';
  if (worsening > improving && worsening > 0) direction = 'worsening';
  else if (improving > worsening && improving > 0) direction = 'improving';

  // 风险分：每个指标取其最近一次测量值，累加超目标幅度
  const latestByMetric = new Map<ChronicMetricKey, number>();
  for (const r of sorted) {
    for (const key of ALL_METRIC_KEYS) {
      const v = metricValue(r, key);
      if (v != null) latestByMetric.set(key, v);
    }
  }
  let score = 0;
  for (const key of ALL_METRIC_KEYS) {
    const v = latestByMetric.get(key);
    const w = RISK_WEIGHTS[key];
    const t = METRIC_META[key].target;
    if (v != null && v > t) score += Math.min(w.cap, (v - t) * w.perUnit);
  }
  if (direction === 'worsening') score += 10;
  else if (direction === 'improving') score -= 10;
  score = Math.max(0, Math.min(100, r1(score)));

  const riskLevel: ChronicRiskTrend['riskLevel'] =
    score >= 70 ? 'critical' : score >= 45 ? 'high' : score >= 20 ? 'moderate' : 'low';

  const n = sorted.length;
  const confidence: ChronicRiskTrend['confidence'] = n >= 6 ? 'high' : n >= 3 ? 'medium' : 'low';

  return { direction, riskScore: score, riskLevel, confidence, metrics };
}

/**
 * 构建慢病管理概览（AI能力深化）。
 *
 *   1. 对 records 按测量时间升序拷贝（不修改入参）；
 *   2. 分病种取最新一条，计算各指标「当前值 vs 控制目标」达标对比与病种状态；
 *   3. 调用 predictRiskTrend 汇总趋势与风险分；
 *   4. 总体风险：任一种 critical→critical；任一 abnormal→abnormal；全部达标→controlled；无记录→unknown。
 *
 * @param patientId 患者 ID
 * @param records   该患者的全部慢病测量记录
 * @returns 慢病管理概览
 */
export function buildChronicDiseaseManagement(
  patientId: string,
  records: ChronicDiseaseRecord[],
): ChronicOverview {
  const sorted = [...records].sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
  const trend = predictRiskTrend(sorted);

  // 分病种取最新一条（升序遍历，后写覆盖）
  const latestByDisease = new Map<ChronicDiseaseType, ChronicDiseaseRecord>();
  for (const r of sorted) latestByDisease.set(r.disease, r);

  const diseases: ChronicDiseaseSummary[] = Array.from(latestByDisease.entries()).map(([disease, latest]) => ({
    disease,
    diseaseName: CHRONIC_DISEASE_NAMES[disease],
    latestAt: latest.measuredAt,
    status: diseaseStatus(disease, latest),
    metrics: compareMetrics(disease, latest),
  }));

  let overallRisk: ChronicOverview['overallRisk'] = 'unknown';
  if (diseases.length > 0) {
    if (diseases.some((d) => d.status === 'critical')) overallRisk = 'critical';
    else if (diseases.some((d) => d.status === 'abnormal')) overallRisk = 'abnormal';
    else overallRisk = 'controlled';
  }

  return {
    patientId,
    overallRisk,
    riskScore: trend.riskScore,
    diseases,
    trend,
    recordCount: sorted.length,
    generatedAt: new Date().toISOString(),
  };
}
