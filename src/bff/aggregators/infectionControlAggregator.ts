/**
 * 健澜科技 jlmedaios - 医院感染控制聚合器（M141-D）
 *
 * 【质量与安全】核心诉求：实时预警，不能等爆发了才发现。
 *   一线每报一例院感，系统立即按「同科室 + 同感染类型 + 24h 内 ≥2 例」自动标红，
 *   院感科在暴发前即介入流调与接触隔离，把事件拦在聚集萌芽阶段。
 *
 * 三类纯函数（逻辑层无 I/O、不读库、不发请求、不触碰 WebSocket）：
 *   - reportInfection(patientId, dept, type, source): Event
 *       登记一例院感上报，落内存事件日志，并即时判定是否触发自动聚集预警；
 *   - trackInfectionSpread(dept, days): SpreadAlert[]
 *       回看某科室近 days 天，按感染类型聚合，≥2 例即出聚集预警；
 *   - generateInfectionReport(period): MonthlyReport
 *       生成月度院感质控月报，覆盖四类核心监测指标率值。
 *
 * 四类监测指标（国家院感质控口径）：
 *   ssi    手术部位感染率          = SSI 例数 / 手术台次（每百台次）
 *   clabsi 导管相关血流感染率      = CLABSI 例数 / 中心静脉导管日（每千导管日）
 *   vap    呼吸机相关肺炎率        = VAP 例数 / 机械通气日（每千通气日）
 *   mdro   多重耐药菌检出率        = MDRO 检出例数 / 住院日（每千住院日）
 *
 * 说明：对外三个入口函数操作模块内进程级事件日志（灰度/演示用，后续可平滑替换为
 *   clinical.infection_control_event 真实落库，函数签名不变）；核心判定逻辑全部下沉为
 *     可对数组直算的纯函数（detectSpreadInEvents / buildReportFromEvents），便于单测追溯。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 【质量与安全】四类院感监测指标 */
export type InfectionType = 'ssi' | 'clabsi' | 'vap' | 'mdro';

/** 上报来源 */
export type InfectionSource = 'nurse' | 'doctor' | 'microbiology' | 'surveillance' | 'other';

/** 单条院感上报事件 */
export interface InfectionEvent {
  id: string;
  patientId: string;
  /** 科室编码/名称（trackInfectionSpread 用 dept 匹配） */
  dept: string;
  type: InfectionType;
  source: InfectionSource;
  /** 上报时刻 ISO8601 */
  reportedAt: string;
  /** 【质量与安全】同科室同类型 24h 内 ≥2 例 → 自动预警标红 */
  autoAlert: boolean;
}

/** 单条聚集传播预警 */
export interface SpreadAlert {
  dept: string;
  type: InfectionType;
  /** 窗内同科室同类型例数 */
  count: number;
  patientIds: string[];
  /** 回看窗（小时） */
  windowHours: number;
  message: string;
  alertedAt: string;
}

/** 单指标率值 */
export interface InfectionMetric {
  type: InfectionType;
  label: string;
  /** 本期例数 */
  cases: number;
  /** 分母（手术台次 / 导管日 / 通气日 / 住院日） */
  denominator: number;
  /** 口径单位：每百台次 / 每千日 */
  unit: string;
  /** 率值（cases / denominator * 单位基数） */
  rate: number;
}

/** 月度院感质控月报 */
export interface MonthlyReport {
  /** 账期 YYYY-MM */
  period: string;
  generatedAt: string;
  totalEvents: number;
  /** 四类核心监测指标率值 */
  metrics: InfectionMetric[];
  /** 本期触发的聚集预警 */
  alerts: SpreadAlert[];
  /** 科室分布 */
  deptBreakdown: { dept: string; cases: number }[];
}

/* ---------------- 监测阈值与口径（导出便于单测与评审追溯） ---------------- */

/** 【质量与安全】同科室同类型自动预警回看窗（小时）= 24h */
export const SPREAD_WINDOW_HOURS = 24;
/** 【质量与安全】同科室同类型自动预警阈值例数 = 2 */
export const SPREAD_THRESHOLD = 2;

/** 指标中文标签 */
export const TYPE_LABEL: Record<InfectionType, string> = {
  ssi: '手术部位感染率',
  clabsi: '导管相关血流感染率',
  vap: '呼吸机相关肺炎率',
  mdro: '多重耐药菌检出率',
};

/** 指标单位口径 */
const TYPE_UNIT: Record<InfectionType, string> = {
  ssi: '每百台手术',
  clabsi: '每千导管日',
  vap: '每千通气日',
  mdro: '每千住院日',
};

/** 指标率值放大基数（每百=100 / 每千=1000） */
const TYPE_RATE_BASE: Record<InfectionType, number> = {
  ssi: 100,
  clabsi: 1000,
  vap: 1000,
  mdro: 1000,
};

/**
 * 默认月度分母（演示/灰度用，后续可接 HIS 真实工作量统计覆盖）。
 * ssi→手术台次；clabsi→中心静脉导管日；vap→机械通气日；mdro→出院/住院日。
 */
export const DEFAULT_MONTHLY_DENOMINATOR: Record<InfectionType, number> = {
  ssi: 200,
  clabsi: 1500,
  vap: 800,
  mdro: 9000,
};

/* ---------------- 进程级事件日志（灰度/演示；后续替换为真实落库） ---------------- */

const eventLog: InfectionEvent[] = [];
let seq = 0;

/** 测试/用例隔离：清空事件日志与自增序号 */
export function __resetInfectionEvents(): void {
  eventLog.length = 0;
  seq = 0;
}

/** 全量事件（按上报时间倒序，最新在前） */
export function listInfectionEvents(): InfectionEvent[] {
  return [...eventLog].sort((a, b) => Date.parse(b.reportedAt) - Date.parse(a.reportedAt));
}

/* ---------------- 纯逻辑层（对事件数组直算，无副作用） ---------------- */

/**
 * 【质量与安全】纯函数：在已有事件集合上，判定某新事件是否触发
 * 「同科室 + 同类型 + windowHours 窗内 ≥ threshold 例」自动预警。
 */
export function evaluateAutoAlert(
  existing: InfectionEvent[],
  candidate: Pick<InfectionEvent, 'dept' | 'type' | 'reportedAt'>,
  windowHours: number = SPREAD_WINDOW_HOURS,
  threshold: number = SPREAD_THRESHOLD,
): boolean {
  const t = Date.parse(candidate.reportedAt);
  if (!Number.isFinite(t)) return false;
  const winMs = windowHours * 3600 * 1000;
  const same = existing.filter(
    (e) =>
      e.dept === candidate.dept &&
      e.type === candidate.type &&
      Number.isFinite(Date.parse(e.reportedAt)) &&
      Date.parse(e.reportedAt) >= t - winMs &&
      Date.parse(e.reportedAt) <= t + 1,
  );
  // 含本次在内
  return same.length + 1 >= threshold;
}

/**
 * 【质量与安全】纯函数：回看某科室近 days 天，按感染类型聚合聚集预警。
 * @param events 全部事件
 * @param dept   目标科室
 * @param days   回看天数
 * @param nowIso 锚点时刻（默认 now），便于单测复现
 */
export function detectSpreadInEvents(
  events: InfectionEvent[],
  dept: string,
  days: number,
  nowIso: string = new Date().toISOString(),
): SpreadAlert[] {
  const list = Array.isArray(events) ? events : [];
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now) || days <= 0) return [];
  const winMs = days * 24 * 3600 * 1000;
  const since = now - winMs;

  const mine = list.filter(
    (e) =>
      e.dept === dept &&
      Number.isFinite(Date.parse(e.reportedAt)) &&
      Date.parse(e.reportedAt) >= since &&
      Date.parse(e.reportedAt) <= now + 1,
  );

  const byType = new Map<InfectionType, InfectionEvent[]>();
  for (const e of mine) {
    const arr = byType.get(e.type) ?? [];
    arr.push(e);
    byType.set(e.type, arr);
  }

  const alerts: SpreadAlert[] = [];
  for (const [type, arr] of byType) {
    if (arr.length < SPREAD_THRESHOLD) continue;
    arr.sort((a, b) => Date.parse(a.reportedAt) - Date.parse(b.reportedAt));
    alerts.push({
      dept,
      type,
      count: arr.length,
      patientIds: arr.map((e) => e.patientId),
      windowHours: days * 24,
      message:
        `【质量与安全】${dept} 近 ${days} 天内「${TYPE_LABEL[type]}」已达 ${arr.length} 例，` +
        `同科室同类型聚集，疑似接触/器械传播，请院感科立即介入流调与隔离处置`,
      alertedAt: nowIso,
    });
  }
  return alerts;
}

/**
 * 纯函数：由事件集合生成某账期（YYYY-MM）院感质控月报。
 * @param events      全部事件
 * @param period      账期 YYYY-MM
 * @param denominators 月度分母覆盖（默认 DEFAULT_MONTHLY_DENOMINATOR）
 */
export function buildReportFromEvents(
  events: InfectionEvent[],
  period: string,
  denominators: Record<InfectionType, number> = DEFAULT_MONTHLY_DENOMINATOR,
): MonthlyReport {
  const list = Array.isArray(events) ? events : [];
  const inPeriod = list.filter((e) => e.reportedAt.slice(0, 7) === period);

  const types: InfectionType[] = ['ssi', 'clabsi', 'vap', 'mdro'];
  const metrics: InfectionMetric[] = types.map((type) => {
    const cases = inPeriod.filter((e) => e.type === type).length;
    const denominator = denominators[type] ?? 0;
    const base = TYPE_RATE_BASE[type];
    const rate = denominator > 0 ? Number(((cases / denominator) * base).toFixed(2)) : 0;
    return { type, label: TYPE_LABEL[type], cases, denominator, unit: TYPE_UNIT[type], rate };
  });

  // 本期涉及科室分布
  const deptMap = new Map<string, number>();
  for (const e of inPeriod) deptMap.set(e.dept, (deptMap.get(e.dept) ?? 0) + 1);
  const deptBreakdown = [...deptMap.entries()]
    .map(([dept, cases]) => ({ dept, cases }))
    .sort((a, b) => b.cases - a.cases);

  // 本期触发的聚集预警：对本期出现过的每个科室做一次回看（窗=当期已发生天数近似 30 天）
  const alerts: SpreadAlert[] = [];
  const periodStart = new Date(`${period}-01T00:00:00Z`).toISOString();
  const anchor = inPeriod.length
    ? inPeriod.map((e) => Date.parse(e.reportedAt)).reduce((m, t) => Math.max(m, t), 0)
    : Date.parse(periodStart);
  const anchorIso = Number.isFinite(anchor) ? new Date(anchor).toISOString() : periodStart;
  for (const dept of deptMap.keys()) {
    alerts.push(...detectSpreadInEvents(inPeriod, dept, 30, anchorIso));
  }

  return {
    period,
    generatedAt: new Date().toISOString(),
    totalEvents: inPeriod.length,
    metrics,
    alerts,
    deptBreakdown,
  };
}

/* ---------------- 对外入口（操作进程级事件日志） ---------------- */

/**
 * 【质量与安全】上报一例院感事件。
 * 登记即查：同科室同类型 24h 窗内已达阈值则 autoAlert=true（实时预警，不等暴发）。
 * @returns 落账后的事件（含 autoAlert 判定）
 */
export function reportInfection(
  patientId: string,
  dept: string,
  type: InfectionType,
  source: InfectionSource = 'nurse',
): InfectionEvent {
  seq += 1;
  const reportedAt = new Date().toISOString();
  const candidate: InfectionEvent = {
    id: `ie-${seq}`,
    patientId,
    dept,
    type,
    source,
    reportedAt,
    autoAlert: false,
  };
  // 【质量与安全】实时预警：用已落账事件判定是否触发 24h 聚集阈值
  candidate.autoAlert = evaluateAutoAlert(eventLog, candidate);
  eventLog.push(candidate);
  return candidate;
}

/**
 * 【质量与安全】传播追踪：回看某科室近 days 天，按类型出聚集预警。
 */
export function trackInfectionSpread(dept: string, days: number): SpreadAlert[] {
  return detectSpreadInEvents(eventLog, dept, days);
}

/**
 * 月度院感质控月报（账期 YYYY-MM）。
 */
export function generateInfectionReport(period: string): MonthlyReport {
  return buildReportFromEvents(eventLog, period);
}
