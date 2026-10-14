/**
 * 健澜科技 jlmedaios - MEDMUSE 科主任 agent 驾驶舱聚合
 *
 * 当日科室运营 KPI 与医疗质量预警：
 *  - 床位周转率 = 当日出院人数 / 实际开放床位数；
 *  - 平均住院日 = 已出院患者 (dischargeAt - admitAt) 均值（天）；
 *  - 次均费用 = 已结算就诊 totalFee 均值（元）；
 *  - 甲级病历率 = 终末质控评分 ≥90 分占比。
 *
 * 数据策略：优先用 medicalHeaderRepo.listByDept + terminalQcRepo 做真实聚合；
 * repo 无数据/查询失败时，安全降级为内存演示行（demo: true），绝不抛 500。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import * as medicalHeaderRepo from '@/db/repositories/medicalHeaderRepo';
import type { TerminalQcIssue } from '@/db/repositories/terminalQcRepo';
import * as terminalQcRepo from '@/db/repositories/terminalQcRepo';

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

/**
 * 尝试从真实 repo 聚合当日科室统计行。
 * 仅 medicalHeaderRepo.listByDept 是科室级查询；床位无 repo 来源，bedCount 置 0（周转率诚实降级）。
 * 任一查询失败或无科室病历首页时返回 null，由上层走 DEMO 兜底，绝不抛错。
 */
async function tryLoadRealRow(
  dept: string,
): Promise<{ row: DeptKpiRow; qcIssues: TerminalQcIssue[] } | null> {
  if (!dept) return null;
  try {
    const headers = await medicalHeaderRepo.listByDept(dept, 100);
    if (!headers || headers.length === 0) return null;

    const today = new Date().toISOString().slice(0, 10);
    const losDays: number[] = [];
    const fees: number[] = [];
    let inHospitalCount = 0;
    let dischargedToday = 0;

    for (const h of headers) {
      if (h.dischargeDate) {
        const los = daysBetween(h.admissionDate, h.dischargeDate);
        if (los != null && los >= 0) losDays.push(los);
        if (h.dischargeDate.slice(0, 10) === today) dischargedToday++;
      } else {
        inHospitalCount++;
      }
      if (h.totalCost != null) fees.push(h.totalCost);
    }

    // 终末质控：按就诊取最新一条（限制 20 次以内，避免 N 次查询）
    const qcScores: number[] = [];
    const qcIssues: TerminalQcIssue[] = [];
    for (const h of headers.slice(0, 20)) {
      try {
        const recs = await terminalQcRepo.listLatestByVisit(h.visitId, 1);
        const latest = recs[0];
        if (latest && latest.score != null) qcScores.push(latest.score);
        qcIssues.push(...(latest?.issues ?? []));
      } catch { /* 单就诊质控缺失不影响整体 */ }
    }

    return {
      row: { inHospitalCount, dischargedToday, bedCount: 0, losDays, fees, qcScores },
      qcIssues,
    };
  } catch {
    return null;
  }
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
  return { deptName, date, demo: true, kpis: buildWarnings(kpis) };
}
