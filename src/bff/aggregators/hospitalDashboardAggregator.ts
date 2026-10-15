/**
 * 健澜科技 jlmedaios - 管理驾驶舱（院长驾驶舱 / 全院数据大屏）聚合器
 *
 * buildHospitalDashboard 为纯函数：仅依据各业务系统上报的原始口径计算全院驾驶舱视图，
 * 不读 DB、不发请求、不取当前时间，同一输入恒等输出，便于单测与重放。空数据 / 缺字段
 * 一律安全兜底为 0，绝不产生 NaN / Infinity。
 *
 * 十大核心指标：今日门诊量 / 住院人数 / 手术台数 / 急诊人数 / 平均候诊时间 /
 *               床位使用率 / 药品占比 / 患者满意度 / 医疗质量评分 / 系统智能度。
 * 趋势：近 30 天 门诊量 / 住院人数 / 患者满意度 三条曲线。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 单条趋势线的统计摘要（相对 7 天前） */
export interface TrendStat {
  /** 最新一日值 */
  latest: number;
  /** 7 天前值 */
  prev: number;
  /** 环比变化百分比（(latest-prev)/prev*100，prev 为 0 时取 0） */
  changePct: number;
}

/** 指标健康度：good 正常 / warn 预警 / danger 超标 */
export type MetricStatus = 'good' | 'warn' | 'danger';

/** 单张核心指标卡 */
export interface DashboardMetric {
  key: string;
  title: string;
  /** 大字号主数值（前端大屏 44px+ 展示） */
  value: number;
  unit: string;
  status: MetricStatus;
  /** 辅助说明（分母、阈值、明细等） */
  detail: string;
}

/** 近 30 天三线趋势（dates 与各数组等长，末尾为最新一天） */
export interface DashboardTrend {
  dates: string[];
  outpatient: number[];
  inpatient: number[];
  satisfaction: number[];
}

/** buildHospitalDashboard 输出（纯、无时间戳） */
export interface DashboardData {
  demo: boolean;
  metrics: DashboardMetric[];
  trend: DashboardTrend;
  trendStats: {
    outpatient: TrendStat;
    inpatient: TrendStat;
    satisfaction: TrendStat;
  };
}

/** listView 视图（带生成时间戳，供路由直接返回） */
export interface HospitalDashboardView extends DashboardData {
  demo: true;
  generatedAt: string;
}

/**
 * 管理驾驶舱聚合入参（全部可选，缺省按 0 兜底）。
 * 字段命名对齐各业务系统上报口径，避免在聚合层做隐式换算。
 */
export interface HospitalDashboardInput {
  /** 今日门诊量（人次） */
  todayOutpatient?: number;
  /** 当前在院人数 */
  inpatientCurrent?: number;
  /** 今日入院人数 */
  inpatientAdmitted?: number;
  /** 今日出院人数 */
  inpatientDischarged?: number;
  /** 今日已完成手术台数 */
  surgeryCompleted?: number;
  /** 今日计划手术台数 */
  surgeryScheduled?: number;
  /** 今日急诊分诊人数 */
  emergencyCount?: number;
  /** 平均候诊时间（分钟） */
  avgWaitingMinutes?: number;
  /** 已占用床位数 */
  bedOccupied?: number;
  /** 实际开放床位数 */
  bedTotal?: number;
  /** 药品收入（万元） */
  drugIncome?: number;
  /** 医疗收入合计（万元，药占比分母） */
  medicalTotalIncome?: number;
  /** 满意问卷份数 */
  satisfactionSatisfied?: number;
  /** 回收问卷总数 */
  satisfactionSurveyed?: number;
  /** 医疗质量评分（0-100） */
  medicalQualityScore?: number;
  /** 系统智能度评分（0-100，AI 辅助覆盖与采纳） */
  systemIntelligence?: number;
  /** 趋势日期标签（MM-DD，末尾为最新一天） */
  trendDates?: string[];
  /** 近 30 天门诊量序列（旧 -> 新） */
  trendOutpatient?: number[];
  /** 近 30 天在院人数序列（旧 -> 新） */
  trendInpatient?: number[];
  /** 近 30 天满意度序列（旧 -> 新） */
  trendSatisfaction?: number[];
}

/** 保留一位小数；分母为 0 / 非有限数时返回 0，避免 NaN / Infinity */
function ratio(numerator: number, denominator: number, scale = 1): number {
  const n = Number.isFinite(numerator) ? numerator : 0;
  const d = Number.isFinite(denominator) ? denominator : 0;
  if (!d || d <= 0) return 0;
  return Math.round((n / d) * scale * 10) / 10;
}

/** 取数兜底：非有限数按 0 处理 */
function num(v: number | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** 归一化到固定长度 30：剔除非法值、取最近 30 个、不足前补 0 */
function normalize30(arr?: number[]): number[] {
  const src = (Array.isArray(arr) ? arr : []).filter((x) => Number.isFinite(x));
  const last = src.slice(-30);
  while (last.length < 30) last.unshift(0);
  return last;
}

/** 归一化日期标签到 30 个：缺省按 D-29..今天 兜底 */
function normalizeDates(labels?: string[], len = 30): string[] {
  const src = (Array.isArray(labels) ? labels : []).filter((x) => typeof x === 'string');
  const last = src.slice(-len);
  while (last.length < len) {
    const gap = len - last.length;
    last.unshift(gap === 1 ? '今天' : `D-${gap - 1}`);
  }
  return last;
}

/** 由等长序列计算 latest / prev(7天前) / changePct */
function buildStat(series: number[]): TrendStat {
  const latest = series[series.length - 1] ?? 0;
  const prev = series[series.length - 8] ?? 0;
  const changePct = prev === 0 ? 0 : Math.round(((latest - prev) / prev) * 1000) / 10;
  return { latest, prev, changePct };
}

/** 候诊时长健康度：>40 分钟过久(danger)，>25 分钟偏长(warn)，其余良好(good) */
function waitingStatus(minutes: number): MetricStatus {
  return minutes > 40 ? 'danger' : minutes > 25 ? 'warn' : 'good';
}

/** 床位使用率健康度：>95% 过度紧张(danger)，<75% 资源闲置(warn)，其余良好(good) */
function bedStatus(rate: number): MetricStatus {
  return rate > 95 ? 'danger' : rate < 75 ? 'warn' : 'good';
}

/** 药占比健康度：>45% 超限(danger)，>35% 偏高(warn)，其余良好(good) */
function drugStatus(rate: number): MetricStatus {
  return rate > 45 ? 'danger' : rate > 35 ? 'warn' : 'good';
}

/** 满意度健康度：<90% 偏低(danger)，<95% 一般(warn)，其余良好(good) */
function satisfactionStatus(rate: number): MetricStatus {
  return rate < 90 ? 'danger' : rate < 95 ? 'warn' : 'good';
}

/** 百分制评分健康度：<60 差(danger)，<80 待提升(warn)，其余良好(good) */
function scoreStatus(score: number): MetricStatus {
  return score < 60 ? 'danger' : score < 80 ? 'warn' : 'good';
}

/**
 * 管理驾驶舱纯函数聚合：汇总十大核心指标并给出健康度判定，
 * 同时把近 30 天三线序列归一化并计算环比摘要。
 *
 * 幂等：同一 input 恒等输出（无随机、无当前时间），便于单测与重放。
 *
 * @param input 各业务系统上报的原始口径（全可选，缺省按 0 兜底）
 * @returns DashboardData 指标卡 + 30 天趋势 + 环比摘要
 */
export function buildHospitalDashboard(input: HospitalDashboardInput = {}): DashboardData {
  const todayOutpatient = num(input.todayOutpatient);
  const inpatientCurrent = num(input.inpatientCurrent);
  const inpatientAdmitted = num(input.inpatientAdmitted);
  const inpatientDischarged = num(input.inpatientDischarged);
  const surgeryCompleted = num(input.surgeryCompleted);
  const surgeryScheduled = num(input.surgeryScheduled);
  const emergencyCount = num(input.emergencyCount);
  const avgWaitingMinutes = num(input.avgWaitingMinutes);
  const bedOccupied = num(input.bedOccupied);
  const bedTotal = num(input.bedTotal);
  const drugIncome = num(input.drugIncome);
  const medicalTotalIncome = num(input.medicalTotalIncome);
  const satisfactionSatisfied = num(input.satisfactionSatisfied);
  const satisfactionSurveyed = num(input.satisfactionSurveyed);
  const medicalQualityScore = num(input.medicalQualityScore);
  const systemIntelligence = num(input.systemIntelligence);

  // 床位使用率（%）
  const bedRate = ratio(bedOccupied, bedTotal, 100);
  // 手术完成率（%）
  const surgeryRate = ratio(surgeryCompleted, surgeryScheduled, 100);
  // 药占比（%）
  const drugRatio = ratio(drugIncome, medicalTotalIncome, 100);
  // 患者满意度（%）
  const satisfaction = ratio(satisfactionSatisfied, satisfactionSurveyed, 100);

  const metrics: DashboardMetric[] = [
    {
      key: 'todayOutpatient',
      title: '今日门诊量',
      value: todayOutpatient,
      unit: '人次',
      status: 'good',
      detail: '当日累计挂号就诊',
    },
    {
      key: 'inpatientCount',
      title: '住院人数',
      value: inpatientCurrent,
      unit: '人',
      status: 'good',
      detail: `入院 ${inpatientAdmitted} · 出院 ${inpatientDischarged}`,
    },
    {
      key: 'surgeryCount',
      title: '手术台数',
      value: surgeryCompleted,
      unit: '台',
      status: surgeryRate >= 95 ? 'good' : surgeryRate >= 85 ? 'warn' : 'danger',
      detail: `完成率 ${surgeryRate}% · 计划 ${surgeryScheduled} 台`,
    },
    {
      key: 'emergencyCount',
      title: '急诊人数',
      value: emergencyCount,
      unit: '人次',
      status: 'good',
      detail: '今日急诊分诊量',
    },
    {
      key: 'avgWaitingMinutes',
      title: '平均候诊时间',
      value: avgWaitingMinutes,
      unit: '分钟',
      status: waitingStatus(avgWaitingMinutes),
      detail: '挂号到就诊平均时长',
    },
    {
      key: 'bedUsageRate',
      title: '床位使用率',
      value: bedRate,
      unit: '%',
      status: bedStatus(bedRate),
      detail: `${bedOccupied}/${bedTotal} 张 · 空床 ${Math.max(bedTotal - bedOccupied, 0)} 张`,
    },
    {
      key: 'drugCostRatio',
      title: '药品占比',
      value: drugRatio,
      unit: '%',
      status: drugStatus(drugRatio),
      detail: `药品 ${drugIncome} / 医疗 ${medicalTotalIncome} 万元`,
    },
    {
      key: 'patientSatisfaction',
      title: '患者满意度',
      value: satisfaction,
      unit: '%',
      status: satisfactionStatus(satisfaction),
      detail: `满意 ${satisfactionSatisfied}/${satisfactionSurveyed} 份`,
    },
    {
      key: 'medicalQualityScore',
      title: '医疗质量评分',
      value: medicalQualityScore,
      unit: '分',
      status: scoreStatus(medicalQualityScore),
      detail: '甲级病历 · 核心制度综合',
    },
    {
      key: 'systemIntelligence',
      title: '系统智能度',
      value: systemIntelligence,
      unit: '分',
      status: scoreStatus(systemIntelligence),
      detail: 'AI 辅助覆盖与采纳率',
    },
  ];

  const outpatient = normalize30(input.trendOutpatient);
  const inpatient = normalize30(input.trendInpatient);
  const satisfactionSeries = normalize30(input.trendSatisfaction);

  const trend: DashboardTrend = {
    dates: normalizeDates(input.trendDates, 30),
    outpatient,
    inpatient,
    satisfaction: satisfactionSeries,
  };

  return {
    demo: false,
    metrics,
    trend,
    trendStats: {
      outpatient: buildStat(outpatient),
      inpatient: buildStat(inpatient),
      satisfaction: buildStat(satisfactionSeries),
    },
  };
}

/** 生成最近 n 天 MM-DD 标签（末尾为今天），仅供演示视图使用（非纯） */
function recentLabels(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 86400000);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    out.push(`${mm}-${dd}`);
  }
  return out;
}

/** 近 30 天门诊基线（工作日高、周末低的确定性锯齿，演示用） */
function demoOutpatientSeries(): number[] {
  const base = [
    8200, 8600, 9100, 9050, 9300, 6100, 5400,
    8400, 8800, 9200, 9150, 9400, 6300, 5500,
    8500, 8900, 9300, 9250, 9500, 6400, 5600,
    8600, 9000, 9400, 9350, 9600, 6500, 5700,
    8700, 9080,
  ];
  return base.slice(-30);
}

/** 近 30 天在院人数（缓慢爬坡后平稳） */
function demoInpatientSeries(): number[] {
  const base: number[] = [];
  for (let i = 0; i < 30; i += 1) {
    base.push(1760 + Math.round(Math.sin(i / 3) * 28) + i);
  }
  return base;
}

/** 近 30 天满意度（%，缓升） */
function demoSatisfactionSeries(): number[] {
  const base: number[] = [];
  for (let i = 0; i < 30; i += 1) {
    base.push(Math.round((91 + Math.min(i * 0.18, 4)) * 10) / 10);
  }
  return base;
}

/** 内置演示数据（demo:true），供管理驾驶舱大屏在无业务库时演示。 */
export function listView(): HospitalDashboardView {
  const base = buildHospitalDashboard({
    todayOutpatient: 10246,
    inpatientCurrent: 1812,
    inpatientAdmitted: 132,
    inpatientDischarged: 118,
    surgeryCompleted: 96,
    surgeryScheduled: 104,
    emergencyCount: 218,
    avgWaitingMinutes: 18,
    bedOccupied: 1786,
    bedTotal: 2000,
    drugIncome: 865,
    medicalTotalIncome: 2480,
    satisfactionSatisfied: 946,
    satisfactionSurveyed: 980,
    medicalQualityScore: 93.5,
    systemIntelligence: 87,
    trendDates: recentLabels(30),
    trendOutpatient: demoOutpatientSeries(),
    trendInpatient: demoInpatientSeries(),
    trendSatisfaction: demoSatisfactionSeries(),
  });
  return {
    ...base,
    demo: true,
    generatedAt: new Date().toISOString(),
  };
}
