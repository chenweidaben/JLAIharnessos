/**
 * 健澜科技 jlmedaios — 【质量与合规】医院质量管理 PDCA 纯函数聚合器（M155-A）
 *
 * 依据《医疗质量管理办法》第十八条与《三级医院评审标准（2022 年版）》
 * 第四章：质量改进必须按 PDCA 循环闭环——
 *
 *   Plan  问题分析 + 量化目标 + 措施计划
 *   Do    措施实施 + 过程记录
 *   Check 前后数据对比 + 效果评估（before/after，真算，不空壳）
 *   Act   标准化 + 遗留问题转入下一循环
 *
 * 本模块全部为纯函数：不触库、不发网络、不读时间外参（注入 now/id 便于单测）。
 * 路由层（src/bff/routes/qualityPdca.ts）负责鉴权与持久化，纯函数负责
 * 状态机合法性与效果数学。任何阶段跳跃（Plan→Check）与静默丢弃遗留问题
 * 都在这一层被拒绝，保证「真改进，不是填表」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** PDCA 四阶段（与 medmuse.pdca_phase 枚举一一对应） */
export type PDCAPhase = 'Plan' | 'Do' | 'Check' | 'Act';

/** 指标方向：lower_better 越低越好（跌倒率/感染率），higher_better 越高越好（手卫生合规率） */
export type Direction = 'lower_better' | 'higher_better';

/** 量化目标：把「降低跌倒发生率」翻译成可算的数学题 */
export interface PDCAQuantTarget {
  /** 指标名，如「住院跌倒发生率」 */
  metric: string;
  /** 单位，如 ‰ / % / 分 */
  unit: string;
  /** 方向 */
  direction: Direction;
  /** 改进前基线值 */
  baseline: number;
  /** 改进目标值 */
  goal: number;
}

/** 一次指标采样（Check 阶段 before / after 各一次） */
export interface MetricSample {
  /** 样本量（出院人数/观察床日/手卫生时机数），n<30 视为 underpowered */
  sampleSize: number;
  /** 发生率或合规率（与 target.unit 同量纲） */
  rate: number;
}

/** Do 阶段一条措施的实施记录 */
export interface PDCAFlowRecord {
  measure: string;
  owner: string;
  executedAt: string;
  evidence?: string;
}

/** 一个 PDCA 改进项目（内存态，对应 medmuse.quality_improvement_project 一行） */
export interface PDCAProject {
  id: string;
  name: string;
  dept: string;
  leader: string;
  target: PDCAQuantTarget;
  phase: PDCAPhase;
  plan: { problem: string; measures: string[] };
  doRecords: PDCAFlowRecord[];
  check: { before: MetricSample; after: MetricSample } | null;
  act: { standardized: string[]; carryover: string };
  phaseHistory: Array<{ phase: PDCAPhase; enteredAt: string; note?: string }>;
  /** Act 完成且无遗留问题时闭环 */
  closed: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Check 阶段效果计算结果（before/after 真对比） */
export interface PDCAEffect {
  projectId: string;
  metric: string;
  unit: string;
  direction: Direction;
  before: MetricSample;
  after: MetricSample;
  /** 绝对变化 after - before（带符号；lower_better 下为负即改善） */
  absoluteDelta: number;
  /** 相对改善百分比（%）：lower_better=(before-after)/before；higher_better=(after-before)/before */
  improvementPct: number;
  /** 目标差距关闭率 0~1（超出 1 表示超额达成，仍如实报告） */
  goalAttainment: number;
  /** 判定：met 达标 / partial 部分达标 / missed 未达标 */
  verdict: 'met' | 'partial' | 'missed';
  /** 样本量不足（任一侧 n<30）时 true，提示结论需谨慎 */
  underpowered: boolean;
  /** 人话结论 */
  summary: string;
}

/** 纯函数错误（路由层映射为 HTTP 4xx） */
export class PdcaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PdcaError';
  }
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

/** 阶段允许的后继状态（PDCA 闭环 + Act 回到 Plan 开启下一循环） */
const NEXT_PHASE: Record<PDCAPhase, PDCAPhase[]> = {
  Plan: ['Do'],
  Do: ['Check'],
  Check: ['Act'],
  Act: ['Plan'],
};

function nowIso(injected?: string): string {
  return injected ?? new Date().toISOString();
}

function genId(injected?: string): string {
  if (injected) return injected;
  return `pdca_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function assertFiniteNum(v: number, field: string): void {
  if (!Number.isFinite(v)) throw new PdcaError(400, `${field} 必须是数字`);
}

// ---------------------------------------------------------------------------
// 纯函数一：创建项目（默认落在 Plan 阶段）
// ---------------------------------------------------------------------------

/**
 * 创建 PDCA 改进项目。
 * @param name   项目名（如「降低住院患者跌倒发生率」）
 * @param dept   责任科室
 * @param leader 项目负责人
 * @param target 量化目标（指标/单位/方向/基线/目标值）
 * @param opts   注入 id/now（单测可复现）；生产不传
 */
export function createPDCAProject(
  name: string,
  dept: string,
  leader: string,
  target: PDCAQuantTarget,
  opts?: { id?: string; now?: string },
): PDCAProject {
  if (!name || !name.trim()) throw new PdcaError(400, '项目名称不能为空');
  if (!dept || !dept.trim()) throw new PdcaError(400, '责任科室不能为空');
  if (!leader || !leader.trim()) throw new PdcaError(400, '项目负责人不能为空');
  if (!target || !target.metric) throw new PdcaError(400, '量化目标缺少指标名');
  assertFiniteNum(target.baseline, '基线值');
  assertFiniteNum(target.goal, '目标值');
  if (target.direction !== 'lower_better' && target.direction !== 'higher_better') {
    throw new PdcaError(400, '目标方向必须是 lower_better 或 higher_better');
  }

  const ts = nowIso(opts?.now);
  const id = genId(opts?.id);
  return {
    id,
    name: name.trim(),
    dept: dept.trim(),
    leader: leader.trim(),
    target,
    phase: 'Plan',
    plan: { problem: '', measures: [] },
    doRecords: [],
    check: null,
    act: { standardized: [], carryover: '' },
    phaseHistory: [{ phase: 'Plan', enteredAt: ts, note: '项目创建' }],
    closed: false,
    createdAt: ts,
    updatedAt: ts,
  };
}

// ---------------------------------------------------------------------------
// 纯函数二：阶段推进（状态机校验，拒绝跳跃）
// ---------------------------------------------------------------------------

/**
 * 推进项目到下一阶段。纯函数：返回新对象，不修改入参。
 * @param project   当前项目（内存态）
 * @param nextPhase 目标阶段
 * @param opts      now/note；Act→Plan 时若仍有 carryover 会作为下一循环问题延续
 */
export function advancePDCAPhase(
  project: PDCAProject,
  nextPhase: PDCAPhase,
  opts?: { now?: string; note?: string },
): PDCAProject {
  if (!project) throw new PdcaError(400, '项目不存在');
  if (project.closed) throw new PdcaError(400, '项目已闭环，不可再推进');

  const allowed = NEXT_PHASE[project.phase] ?? [];
  if (!allowed.includes(nextPhase)) {
    throw new PdcaError(
      400,
      `阶段流转非法：${project.phase} → ${nextPhase}（只允许 ${allowed.join(' / ')}）`,
    );
  }

  // 进入 Check 前必须有 Do 记录，否则「Check」是空对空
  if (nextPhase === 'Check' && project.doRecords.length === 0) {
    throw new PdcaError(400, '进入 Check 前至少要有一条 Do 实施记录');
  }
  // 进入 Act 前必须有 before/after 数据，否则「Act」无据可依
  if (nextPhase === 'Act' && !project.check) {
    throw new PdcaError(400, '进入 Act 前必须完成 Check（提交 before/after 数据）');
  }

  const ts = nowIso(opts?.now);
  const next: PDCAProject = {
    ...project,
    phase: nextPhase,
    updatedAt: ts,
    phaseHistory: [
      ...project.phaseHistory,
      { phase: nextPhase, enteredAt: ts, note: opts?.note },
    ],
  };

  // Act → Plan：遗留问题转入下一循环（不空转）
  if (nextPhase === 'Plan') {
    const carryover = project.act.carryover?.trim();
    next.act = { standardized: [], carryover: '' };
    next.check = null;
    next.doRecords = [];
    if (carryover) {
      next.plan = {
        problem: `上一循环遗留：${carryover}`,
        measures: [],
      };
    }
  }

  // Act 且无遗留问题 → 闭环
  if (nextPhase === 'Act' && !project.act.carryover?.trim()) {
    next.closed = true;
  }

  return next;
}

// ---------------------------------------------------------------------------
// 纯函数三：Check 效果计算（before/after 真对比）
// ---------------------------------------------------------------------------

/**
 * 计算 PDCA 项目效果。要求项目已带 before/after 采样，否则抛错。
 * 所有数值来自 project.check，不编造。
 */
export function calculatePDCAEffect(project: PDCAProject): PDCAEffect {
  if (!project) throw new PdcaError(400, '项目不存在');
  if (!project.check) {
    throw new PdcaError(400, '尚未采集 before/after 数据，无法计算效果');
  }
  const { before, after } = project.check;
  assertFiniteNum(before.rate, 'before 率值');
  assertFiniteNum(after.rate, 'after 率值');
  if (before.sampleSize < 0 || after.sampleSize < 0) {
    throw new PdcaError(400, '样本量不能为负');
  }

  const { direction, baseline, goal, metric, unit } = project.target;

  // 绝对变化（带符号）
  const absoluteDelta = after.rate - before.rate;

  // 相对改善百分比
  let improvementPct = 0;
  if (before.rate > 0) {
    improvementPct =
      direction === 'lower_better'
        ? ((before.rate - after.rate) / before.rate) * 100
        : ((after.rate - before.rate) / before.rate) * 100;
  }

  // 目标差距关闭率（0=原地踏步，1=正好达标，>1 超额）
  let goalAttainment = 0;
  const gap = direction === 'lower_better' ? baseline - goal : goal - baseline;
  const closed =
    direction === 'lower_better' ? baseline - after.rate : after.rate - baseline;
  if (gap !== 0) {
    goalAttainment = closed / gap;
  } else if (after.rate === goal) {
    goalAttainment = 1;
  }

  // 判定
  const met =
    direction === 'lower_better' ? after.rate <= goal : after.rate >= goal;
  const verdict: PDCAEffect['verdict'] = met
    ? 'met'
    : improvementPct >= 20
      ? 'partial'
      : 'missed';

  const underpowered = before.sampleSize < 30 || after.sampleSize < 30;

  // 人话结论
  const deltaSign = absoluteDelta >= 0 ? '+' : '';
  const verb =
    direction === 'lower_better'
      ? Math.abs(absoluteDelta) < 1e-9
        ? '基本无变化'
        : absoluteDelta < 0
          ? '下降'
          : '上升（恶化）'
      : Math.abs(absoluteDelta) < 1e-9
        ? '基本无变化'
        : absoluteDelta > 0
          ? '上升'
          : '下降（恶化）';
  const summary =
    `${metric} 由 ${before.rate}${unit}（n=${before.sampleSize}）变为 ` +
    `${after.rate}${unit}（n=${after.sampleSize}），${verb} ${deltaSign}${absoluteDelta.toFixed(2)}${unit}，` +
    `相对改善 ${improvementPct.toFixed(1)}%，目标差距关闭率 ${(goalAttainment * 100).toFixed(0)}%，` +
    `判定：${verdict === 'met' ? '达标' : verdict === 'partial' ? '部分达标' : '未达标'}` +
    `${underpowered ? '（样本量不足，结论需谨慎）' : ''}`;

  return {
    projectId: project.id,
    metric,
    unit,
    direction,
    before,
    after,
    absoluteDelta: Number(absoluteDelta.toFixed(4)),
    improvementPct: Number(improvementPct.toFixed(2)),
    goalAttainment: Number(goalAttainment.toFixed(4)),
    verdict,
    underpowered,
    summary,
  };
}
