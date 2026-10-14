/**
 * 健澜科技 jlmedaios - MEDMUSE 科主任 agent 驾驶舱聚合
 *
 * 当日科室运营 KPI 与医疗质量预警：
 *  - 床位周转率 = 当日出院人数 / 实际开放床位数；
 *  - 平均住院日 = 已出院患者 (dischargeAt - admitAt) 均值（天）；
 *  - 次均费用 = 已结算就诊 totalFee 均值（元）；
 *  - 甲级病历率 = 终末质控评分 ≥90 分占比。
 *
 * 数据策略：真实装载 ——
 *  - 在院/当日出院/平均住院日：visitRepo.listInpatientByDept（状态过滤）；
 *  - 次均费用：drgRepo.listDrgResults 本科室结算 totalFee；
 *  - 甲级病历率：terminalQcRepo.listRecentByDept 近 30 日 ≥90 分占比；
 * 各 repo 调用独立 try/catch，单项失败只令该 KPI 降级为 null，不波及其它字段；
 * 就诊主查询无数据/失败时整体回退内存演示行（demo: true），绝不抛 500。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import * as drgRepo from '@/db/repositories/drgRepo';
import type { TerminalQcIssue } from '@/db/repositories/terminalQcRepo';
import * as terminalQcRepo from '@/db/repositories/terminalQcRepo';
import * as visitRepo from '@/db/repositories/visitRepo';

import type { AuthView } from '../view/userView.js';

/** 驾驶舱业务异常（status 直接映射 HTTP 状态码） */
export class DeptCockpitError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/* ------------------------------- 纯函数：KPI 计算 ------------------------------- */

/** KPI 原始统计行（由 loadDeptDaily 从 repo 聚合或 DEMO 兜底填充） */
export interface DeptKpiRow {
  /** 在院人数（未出院） */
  inHospitalCount: number;
  /** 当日出院人数 */
  dischargedToday: number;
  /** 实际开放床位数（无床位来源时为 0，周转率降级为 null，不臆造） */
  bedCount: number;
  /** 已出院患者住院日（天）样本 */
  losDays: number[];
  /** 次均费用样本（元） */
  fees: number[];
  /** 终末质控评分样本（0-100） */
  qcScores: number[];
}

/** KPI 结果（样本不足时对应项为 null，前端展示为 '-'） */
export interface DeptKpis {
  /** 床位周转率（次/日），保留 2 位小数 */
  bedTurnoverRate: number | null;
  /** 平均住院日（天），保留 1 位小数 */
  avgLod: number | null;
  /** 次均费用（元），四舍五入到元 */
  avgCost: number | null;
  /** 甲级病历率（≥90 分占比，0-1），保留 2 位小数 */
  gradeARate: number | null;
}

const round = (v: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

/** 均值；空数组返回 null（不臆造 0） */
function mean(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * 纯函数：把原始统计行算成四项 KPI。
 * - bedCount<=0 → 床位周转率 null（无床位来源时不臆造）；
 * - 样本数组为空 → 对应均值 null；
 * - 甲级病历率 = score>=90 占比。
 */
export function computeDeptKpis(row: DeptKpiRow): DeptKpis {
  const turnover =
    row.bedCount > 0 ? round(row.dischargedToday / row.bedCount, 2) : null;
  const los = mean(row.losDays);
  const cost = mean(row.fees);
  const gradeA =
    row.qcScores.length > 0
      ? round(row.qcScores.filter((s) => s >= 90).length / row.qcScores.length, 2)
      : null;
  return {
    bedTurnoverRate: turnover,
    avgLod: los == null ? null : round(los, 1),
    avgCost: cost == null ? null : Math.round(cost),
    gradeARate: gradeA,
  };
}

/* ------------------------------- 预警 ------------------------------- */

export type DeptSeverity = 'error' | 'warning' | 'info';

/** 医疗质量预警项 */
export interface DeptWarning {
  id: string;
  /** 预警项 */
  item: string;
  severity: DeptSeverity;
  /** 建议动作 */
  suggestion: string;
}

/** 平均住院日红线（天） */
const LOD_RED_LINE = 10;
/** 次均费用红线（元） */
const COST_RED_LINE = 10000;
/** 甲级病历率红线 */
const GRADE_A_RED_LINE = 0.9;

/** 由 KPI 与终末质控问题清单推导预警列表（纯逻辑） */
export function buildWarnings(kpis: DeptKpis, qcIssues: TerminalQcIssue[] = []): DeptWarning[] {
  const warnings: DeptWarning[] = [];

  if (kpis.gradeARate != null && kpis.gradeARate < GRADE_A_RED_LINE) {
    warnings.push({
      id: 'grade-a-rate-low',
      item: `甲级病历率 ${(kpis.gradeARate * 100).toFixed(0)}% 低于 ${GRADE_A_RED_LINE * 100}% 红线`,
      severity: 'error',
      suggestion: '约谈质控医生，对乙级/丙级病历限期整改并复查',
    });
  }
  if (kpis.avgLod != null && kpis.avgLod > LOD_RED_LINE) {
    warnings.push({
      id: 'los-high',
      item: `平均住院日 ${kpis.avgLod} 天超过 ${LOD_RED_LINE} 天红线`,
      severity: 'warning',
      suggestion: '排查超长住院病例，启动临床路径与术前等待日专项管控',
    });
  }
  if (kpis.avgCost != null && kpis.avgCost > COST_RED_LINE) {
    warnings.push({
      id: 'cost-high',
      item: `次均费用 ${kpis.avgCost} 元超过 ${COST_RED_LINE} 元参考线`,
      severity: 'warning',
      suggestion: '分析不合理用药与耗材，对照 DRG/DIP 病组成本复盘',
    });
  }

  // 终末质控 error 级问题直接转预警（去重后最多 3 条）
  const seen = new Set<string>();
  for (const issue of qcIssues) {
    if (issue.severity !== 'error') continue;
    if (seen.has(issue.rule)) continue;
    seen.add(issue.rule);
    warnings.push({
      id: `qc.${issue.rule}`,
      item: issue.message,
      severity: 'error',
      suggestion: '退回管床医生补正，科室质控员复核后归档',
    });
    if (warnings.filter((w) => w.id.startsWith('qc.')).length >= 3) break;
  }

  if (warnings.length === 0) {
    warnings.push({
      id: 'all-good',
      item: '当日科室运行指标正常',
      severity: 'info',
      suggestion: '保持现有质控节奏，关注在院高危患者随访',
    });
  }
  return warnings;
}

/* ------------------------------- 数据装载 ------------------------------- */

/** 两个 ISO/日期串相差的整天数；任一缺失或非法返回 null */
function daysBetween(fromDate: string, toDate: string): number | null {
  if (!fromDate || !toDate) return null;
  const a = new Date(fromDate).getTime();
  const b = new Date(toDate).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return (b - a) / 86_400_000;
}

/* ----------------------- 纯函数：真实就诊/结算 → 统计样本 ----------------------- */

/** 住院就诊的最小视图（与 visitRepo.Visit 对齐的可测子集） */
export interface InpatientVisitLike {
  status: string;
  admitAt: string | null;
  dischargeAt: string | null;
}

/**
 * 纯函数：把住院就诊列表汇总为在院数 / 当日出院数 / 住院日样本。
 * - 在院：status === 'ongoing'（未出院）；
 * - 当日出院：status === 'discharged' 且 dischargeAt 的日期等于 today；
 * - 住院日：已出院 = dischargeAt - admitAt；在院且缺 dischargeAt = nowIso - admitAt（已住院天数）；
 * - transferred/cancelled 不计入在院、出院与住院日样本。
 */
export function summarizeInpatientVisits(
  visits: InpatientVisitLike[],
  today: string,
  nowIso: string,
): { inHospitalCount: number; dischargedToday: number; losDays: number[] } {
  let inHospitalCount = 0;
  let dischargedToday = 0;
  const losDays: number[] = [];
  for (const v of visits) {
    const ongoing = v.status === 'ongoing';
    const discharged = v.status === 'discharged';
    if (!ongoing && !discharged) continue;
    if (ongoing) inHospitalCount++;
    // 缺 dischargeAt 的在院患者用「已住院天数」（nowIso - admitAt）
    const endIso = v.dischargeAt ?? nowIso;
    const los = daysBetween(v.admitAt ?? '', endIso);
    if (los != null && los >= 0) losDays.push(los);
    if (discharged && v.dischargeAt && v.dischargeAt.slice(0, 10) === today) {
      dischargedToday++;
    }
  }
  return { inHospitalCount, dischargedToday, losDays };
}

/** DRG/DIP 结算结果的最小费用视图（与 drgRepo.DrgResultListRow 对齐） */
export interface DeptFeeRow {
  department: string;
  totalFee: string | number | null;
}

/**
 * 纯函数：从 DRG/DIP 结算结果中挑出本科室、含总费用的样本（元）。
 * totalFee 为字符串/数值均可解析；非法或空值跳过（不臆造费用）。
 */
export function pickDeptFeeSamples(rows: DeptFeeRow[], dept: string): number[] {
  const fees: number[] = [];
  for (const r of rows) {
    if (r.department !== dept) continue;
    if (r.totalFee == null) continue;
    const n = Number(r.totalFee);
    if (Number.isFinite(n) && n >= 0) fees.push(n);
  }
  return fees;
}

/**
 * 尝试从真实 repo 聚合当日科室统计行。
 * - 就诊主查询（visitRepo.listInpatientByDept）是锚点：失败或无在院/出院住院记录 → 返回 null，
 *   由上层走 DEMO 兜底；
 * - 次均费用（drgRepo）、甲级病历率（terminalQcRepo 近 30 日）各自独立 try/catch，
 *   单项失败只令对应样本为空（KPI 降级 null），不波及其它字段；
 * - 床位无 repo 来源，bedCount 置 0（周转率诚实降级为 null，不臆造）。
 */
async function tryLoadRealRow(
  dept: string,
): Promise<{ row: DeptKpiRow; qcIssues: TerminalQcIssue[] } | null> {
  if (!dept) return null;

  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  // (1) 锚点：在院人数 / 当日出院数 / 住院日样本 —— visitRepo 状态过滤
  let inHospitalCount = 0;
  let dischargedToday = 0;
  const losDays: number[] = [];
  let hasRealVisits = false;
  try {
    const visits = await visitRepo.listInpatientByDept(dept, 500);
    if (visits && visits.length > 0) {
      hasRealVisits = true;
      const s = summarizeInpatientVisits(visits, today, nowIso);
      inHospitalCount = s.inHospitalCount;
      dischargedToday = s.dischargedToday;
      losDays.push(...s.losDays);
    }
  } catch { /* 就诊查询失败：整体走 DEMO 兜底 */ }

  // 无任何真实就诊数据 → 回退演示行
  if (!hasRealVisits) return null;

  // (2) 次均费用 —— drgRepo 真实结算 totalFee（失败/为空不影响其它字段）
  const fees: number[] = [];
  try {
    const results = await drgRepo.listDrgResults(null);
    fees.push(...pickDeptFeeSamples(results, dept));
  } catch { /* DRG/DIP 结算缺失：次均费用降级 null */ }

  // (3) 甲级病历率 —— terminalQcRepo 近 30 日评分 ≥90 占比（失败不影响其它字段）
  const qcScores: number[] = [];
  const qcIssues: TerminalQcIssue[] = [];
  try {
    const recs = await terminalQcRepo.listRecentByDept(dept, 30, 200);
    for (const r of recs) {
      if (r.score != null) qcScores.push(r.score);
      qcIssues.push(...r.issues);
    }
  } catch { /* 终末质控缺失：甲级病历率降级 null */ }

  return {
    row: { inHospitalCount, dischargedToday, bedCount: 0, losDays, fees, qcScores },
    qcIssues,
  };
}

/** 内存演示兜底行（DEMO 风格，前端明确标注 demo） */
const DEMO_ROW: DeptKpiRow = {
  inHospitalCount: 42,
  dischargedToday: 6,
  bedCount: 50,
  losDays: [5.2, 4.8, 6.1, 7.3, 5.9, 4.5],
  fees: [8200, 7600, 9100, 6800, 10200, 7900],
  qcScores: [92, 88, 95, 78, 90, 96, 85, 91],
};

/** 驾驶舱返回结构 */
export interface DeptCockpitResult {
  deptName: string;
  date: string;
  /** true = 当前为内存演示数据，repo 暂无真实聚合 */
  demo: boolean;
  kpis: DeptKpis;
  warnings: DeptWarning[];
}

/**
 * 加载科主任驾驶舱当日数据。
 * 权限校验 dept_cockpit:view；repo 查不到时返回 DEMO 兜底（demo:true），绝不抛 500。
 */
export async function loadDeptDaily(view: AuthView): Promise<DeptCockpitResult> {
  if (!view.permissions.includes('dept_cockpit:view')) {
    throw new DeptCockpitError(403, '无权限');
  }

  const deptName = view.deptName || '未知科室';
  const date = new Date().toISOString().slice(0, 10);

  const real = await tryLoadRealRow(deptName);
  if (real) {
    const kpis = computeDeptKpis(real.row);
    return { deptName, date, demo: false, kpis, warnings: buildWarnings(kpis, real.qcIssues) };
  }

  // 真实数据不可用：DEMO 兜底
  const kpis = computeDeptKpis(DEMO_ROW);
  return { deptName, date, demo: true, kpis, warnings: buildWarnings(kpis) };
}
