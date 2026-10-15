/**
 * 健澜科技 jlmedaios - M147-C 三级公立医院绩效考核（国考）指标聚合器（纯函数）
 *
 * 按国家《三级公立医院绩效考核操作手册》最新版口径，落 4 维 20 项核心指标：
 *   医疗质量 C1-C6 / 运营效率 C7-C12 / 持续发展 C13-C18 / 满意度评价 C19-C20。
 *
 * 达标三色（红黄绿）判定口径：
 *   - 达成率 achievementRate：
 *       higher_is_better -> actual / target；
 *       lower_is_better  -> target / actual；
 *   - 达成率 >= 1.00  -> green  达标；
 *   - 达成率 >= 0.90  -> yellow 待改进（差一口气，方向修正即可）；
 *   - 达成率 <  0.90  -> red    未达标（需专项整改）。
 *
 * 【知识图谱与患者教育】：指标结论（如平均住院日、患者满意度）可作为患者健康教育
 *   与出院随访可解释话术的依据；本模块只算聚合统计量，不触及患者个体 PII。
 *
 * 本模块全部为无副作用纯函数，不触库、不取当前时间，便于单测；
 * 数据库读写与 period 注入由路由层（routes/hospitalKpi.ts）负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 指标维度四大类 */
export type KpiDimension = 'quality' | 'efficiency' | 'development' | 'satisfaction';

/** 指标方向：越大越好 / 越小越好 */
export type KpiDirection = 'higher_is_better' | 'lower_is_better';

/** 达标三色：绿达标 / 黄待改进 / 红未达标 */
export type KpiStatus = 'green' | 'yellow' | 'red';

/** 指标目录单项（国家最新版口径的基准目标值） */
export interface KpiCatalogItem {
  code: string;
  name: string;
  dimension: KpiDimension;
  unit: string;
  direction: KpiDirection;
  target: number;
  /** 演示/兜底实际值（无真实观测时使用，绝不冒充真实结论，路由层打 demo 标记） */
  demoActual: number;
}

/** 单条指标计算结果 */
export interface KpiResult {
  code: string;
  name: string;
  dimension: KpiDimension;
  dimensionLabel: string;
  period: string;
  actual: number;
  target: number;
  unit: string;
  direction: KpiDirection;
  /** 达成率（>=1 已超目标，方向已归一） */
  achievementRate: number;
  /** 归一化得分 0-100（达成率封顶 100） */
  score: number;
  status: KpiStatus;
  statusLabel: string;
  /** actual - target 的带符号差值（方向敏感解读：higher 越大越好，lower 越小越好） */
  gap: number;
}

/** 达标对比结论（compareKPIWithTarget 返回） */
export interface Comparison {
  kpiCode: string;
  direction: KpiDirection;
  actual: number;
  target: number;
  achievementRate: number;
  status: KpiStatus;
  statusLabel: string;
  gap: number;
  /** 人话结论：供看板与患者教育话术直接引用 */
  conclusion: string;
}

/** 周期间趋势单项（环比/同比） */
export interface KpiTrendPoint {
  code: string;
  name: string;
  dimension: KpiDimension;
  previous: number;
  current: number;
  /** 带符号变化（current - previous），方向敏感 */
  delta: number;
  /** 是否向好（方向归一后改善） */
  improving: boolean;
}

/** calculateHospitalKPI 可选入参：路由层从 DB 注入的实际观测值 { C1: 3.5, ... } */
export type KpiObservations = Record<string, number>;

/* ---------------------------------------------------------------------------
 * 国考 20 项指标目录（国家最新版口径基准目标值）
 * ------------------------------------------------------------------------- */
export const KPI_CATALOG: readonly KpiCatalogItem[] = [
  // —— 医疗质量 C1-C6 ——
  { code: 'C1', name: '门诊人次数与出院人次数比', dimension: 'quality', unit: '比值', direction: 'higher_is_better', target: 3.2, demoActual: 3.5 },
  { code: 'C2', name: '出院患者四级手术比例', dimension: 'quality', unit: '%', direction: 'higher_is_better', target: 18, demoActual: 16.2 },
  { code: 'C3', name: '低风险组病例死亡率', dimension: 'quality', unit: '‰', direction: 'lower_is_better', target: 0.2, demoActual: 0.18 },
  { code: 'C4', name: '医疗服务收入占医疗收入比例', dimension: 'quality', unit: '%', direction: 'higher_is_better', target: 35, demoActual: 33.5 },
  { code: 'C5', name: '门诊患者基本药物处方占比', dimension: 'quality', unit: '%', direction: 'higher_is_better', target: 55, demoActual: 58 },
  { code: 'C6', name: '住院患者抗菌药物使用强度', dimension: 'quality', unit: 'DDDs', direction: 'lower_is_better', target: 40, demoActual: 44 },
  // —— 运营效率 C7-C12 ——
  { code: 'C7', name: '平均住院日', dimension: 'efficiency', unit: '天', direction: 'lower_is_better', target: 8.0, demoActual: 7.6 },
  { code: 'C8', name: '术前平均住院日', dimension: 'efficiency', unit: '天', direction: 'lower_is_better', target: 1.5, demoActual: 1.7 },
  { code: 'C9', name: '门诊次均费用增幅', dimension: 'efficiency', unit: '%', direction: 'lower_is_better', target: 5.0, demoActual: 4.2 },
  { code: 'C10', name: '住院次均费用增幅', dimension: 'efficiency', unit: '%', direction: 'lower_is_better', target: 5.0, demoActual: 6.1 },
  { code: 'C11', name: '资产负债率', dimension: 'efficiency', unit: '%', direction: 'lower_is_better', target: 40, demoActual: 38 },
  { code: 'C12', name: '人员支出占业务支出比例', dimension: 'efficiency', unit: '%', direction: 'higher_is_better', target: 40, demoActual: 42 },
  // —— 持续发展 C13-C18 ——
  { code: 'C13', name: '医护比', dimension: 'development', unit: '比值', direction: 'higher_is_better', target: 1.2, demoActual: 1.1 },
  { code: 'C14', name: '医师日均担负诊疗人次', dimension: 'development', unit: '人次', direction: 'higher_is_better', target: 8.0, demoActual: 7.2 },
  { code: 'C15', name: '每百名卫技人员科研成果转化金额', dimension: 'development', unit: '万元', direction: 'higher_is_better', target: 50, demoActual: 30 },
  { code: 'C16', name: '省级以上带教导师数', dimension: 'development', unit: '人', direction: 'higher_is_better', target: 20, demoActual: 22 },
  { code: 'C17', name: '住院医师规范化培训合格率', dimension: 'development', unit: '%', direction: 'higher_is_better', target: 95, demoActual: 96 },
  { code: 'C18', name: '高级职称医师占比', dimension: 'development', unit: '%', direction: 'higher_is_better', target: 25, demoActual: 23 },
  // —— 满意度评价 C19-C20 ——
  { code: 'C19', name: '门诊患者满意度', dimension: 'satisfaction', unit: '%', direction: 'higher_is_better', target: 90, demoActual: 92 },
  { code: 'C20', name: '员工满意度', dimension: 'satisfaction', unit: '%', direction: 'higher_is_better', target: 80, demoActual: 76 },
];

/** 维度中文标签 */
export const DIMENSION_LABEL: Record<KpiDimension, string> = {
  quality: '医疗质量',
  efficiency: '运营效率',
  development: '持续发展',
  satisfaction: '满意度评价',
};

/** 三色阈值：达成率 >= MET 达标；>= WARN 待改进；否则未达标 */
const MET_RATE = 1.0;
const WARN_RATE = 0.9;
/** 浮点容差：16.2/18=0.89999… 这类边界粉尘不得翻转三色 */
const EPS = 1e-9;

/** 按编码查目录项（未登记编码抛错，防止脏数据静默通过） */
function lookupCatalog(code: string): KpiCatalogItem {
  const item = KPI_CATALOG.find((k) => k.code === code);
  if (!item) {
    throw new Error(`未登记的国考指标编码: ${code}（仅支持 C1..C20）`);
  }
  return item;
}

/**
 * 达标判定：由方向与实际/目标计算达成率与红黄绿三色。
 * lower_is_better 时 actual=0 视为完美（达成率 Infinity，收敛为 1.0）。
 */
export function evaluateStatus(
  direction: KpiDirection,
  actual: number,
  target: number,
): { achievementRate: number; status: KpiStatus; statusLabel: string; gap: number } {
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) {
    throw new Error(`达标判定需要有限正数目标值：actual=${actual}, target=${target}`);
  }

  // 方向归一：统一为「达成率 >= 1 表示达标」
  const achievementRate =
    direction === 'higher_is_better'
      ? actual / target
      : actual <= 0
        ? Number.POSITIVE_INFINITY
        : target / actual;

  const capped = Number.isFinite(achievementRate) ? achievementRate : MET_RATE;

  let status: KpiStatus;
  let statusLabel: string;
  if (capped >= MET_RATE - EPS) {
    status = 'green';
    statusLabel = '达标';
  } else if (capped >= WARN_RATE - EPS) {
    status = 'yellow';
    statusLabel = '待改进';
  } else {
    status = 'red';
    statusLabel = '未达标';
  }

  return { achievementRate: capped, status, statusLabel, gap: actual - target };
}

/**
 * 纯函数：计算某考核周期全部 20 项国考指标结果。
 *
 * @param period       考核周期标签（如 '2026' / '2026-Q3'），透传到每条结果
 * @param observations 路由层从 DB 注入的实际观测值 { C1: 3.5, ... }；
 *                     缺省或缺失的指标回退目录 demoActual（路由层据此打 demo 标记）
 * @returns            20 条 KpiResult，按目录顺序（C1..C20）
 */
export function calculateHospitalKPI(
  period: string,
  observations?: KpiObservations,
): KpiResult[] {
  const safePeriod = (period ?? '').trim() || 'current';
  const obs = observations ?? {};

  return KPI_CATALOG.map((item) => {
    const injected = obs[item.code];
    const actual =
      typeof injected === 'number' && Number.isFinite(injected)
        ? injected
        : item.demoActual;

    const { achievementRate, status, statusLabel, gap } = evaluateStatus(
      item.direction,
      actual,
      item.target,
    );

    return {
      code: item.code,
      name: item.name,
      dimension: item.dimension,
      dimensionLabel: DIMENSION_LABEL[item.dimension],
      period: safePeriod,
      actual: round2(actual),
      target: item.target,
      unit: item.unit,
      direction: item.direction,
      achievementRate: round4(achievementRate),
      score: Math.min(100, Math.round(achievementRate * 100)),
      status,
      statusLabel,
      gap: round2(gap),
    };
  });
}

/**
 * 纯函数：单项指标达标对比（看板红黄绿灯 + 患者教育话术）。
 *
 * @param kpiCode C1..C20
 * @param actual  本期实际值
 * @param target  目标值（缺省取目录基准目标）
 */
export function compareKPIWithTarget(
  kpiCode: string,
  actual: number,
  target?: number,
): Comparison {
  const item = lookupCatalog(kpiCode);
  const t = target ?? item.target;

  const { achievementRate, status, statusLabel, gap } = evaluateStatus(
    item.direction,
    actual,
    t,
  );

  const conclusion = buildConclusion(item, actual, t, achievementRate, status);

  return {
    kpiCode,
    direction: item.direction,
    actual: round2(actual),
    target: t,
    achievementRate: round4(achievementRate),
    status,
    statusLabel,
    gap: round2(gap),
    conclusion,
  };
}

/**
 * 纯函数：两周期趋势对比（同比/环比）。
 * 返回逐项变化与「向好/向差」，方向已归一（lower_is_better 下降视为向好）。
 */
export function compareKpiTrend(
  previous: KpiResult[],
  current: KpiResult[],
): KpiTrendPoint[] {
  const prevMap = new Map(previous.map((r) => [r.code, r]));
  return current
    .map((cur) => {
      const prev = prevMap.get(cur.code);
      const previousValue = prev ? prev.actual : cur.actual;
      const delta = round2(cur.actual - previousValue);
      // 方向归一：higher 上升向好；lower 下降向好
      const improving =
        cur.direction === 'higher_is_better' ? delta > 0 : delta < 0;
      return {
        code: cur.code,
        name: cur.name,
        dimension: cur.dimension,
        previous: previousValue,
        current: cur.actual,
        delta,
        improving,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

/** 周期汇总：四维分组 + 三色计数 + 总达标率（供看板头部 KPI 卡） */
export interface KpiSummary {
  total: number;
  green: number;
  yellow: number;
  red: number;
  passRate: number;
  byDimension: Array<{
    dimension: KpiDimension;
    dimensionLabel: string;
    total: number;
    green: number;
    yellow: number;
    red: number;
    avgScore: number;
  }>;
}

export function summarizeKpi(results: KpiResult[]): KpiSummary {
  const green = results.filter((r) => r.status === 'green').length;
  const yellow = results.filter((r) => r.status === 'yellow').length;
  const red = results.filter((r) => r.status === 'red').length;

  const dims: KpiDimension[] = ['quality', 'efficiency', 'development', 'satisfaction'];
  const byDimension = dims.map((dim) => {
    const items = results.filter((r) => r.dimension === dim);
    return {
      dimension: dim,
      dimensionLabel: DIMENSION_LABEL[dim],
      total: items.length,
      green: items.filter((r) => r.status === 'green').length,
      yellow: items.filter((r) => r.status === 'yellow').length,
      red: items.filter((r) => r.status === 'red').length,
      avgScore: round1(items.reduce((s, r) => s + r.score, 0) / Math.max(1, items.length)),
    };
  });

  return {
    total: results.length,
    green,
    yellow,
    red,
    passRate: round1((green / Math.max(1, results.length)) * 100),
    byDimension,
  };
}

/* ------------------------------ 内部工具 ------------------------------ */

/** 人话结论：达标/待改进/未达标三档话术，可直接进患者教育与院长汇报 */
function buildConclusion(
  item: KpiCatalogItem,
  actual: number,
  target: number,
  rate: number,
  status: KpiStatus,
): string {
  const unit = item.unit;
  const diff = Math.abs(actual - target);
  if (status === 'green') {
    return `「${item.name}」本期 ${round2(actual)}${unit}，已达成国家目标 ${target}${unit}，保持即可。`;
  }
  if (status === 'yellow') {
    return `「${item.name}」本期 ${round2(actual)}${unit}，距目标 ${target}${unit} 仅差 ${round2(diff)}${unit}（达成率 ${(rate * 100).toFixed(0)}%），方向修正后可达标。`;
  }
  return `「${item.name}」本期 ${round2(actual)}${unit}，明显偏离目标 ${target}${unit}（达成率 ${(rate * 100).toFixed(0)}%），需纳入专项整改。`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
