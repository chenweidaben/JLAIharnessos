/**
 * 健澜科技 jlmedaios — 【AI深化与智能运营】医院运营预测与调配聚合器（M168-B）
 *
 * 运营预测要有置信区间，不能拍脑袋。本模块全部为纯函数、无副作用、不触库：
 *
 *   1) predictOutpatientVolume(history, days, holidays)
 *      门诊量预测：7 天中心化移动平均去趋势 + 星期季节因子 + 趋势最小二乘外推
 *      + 法定假日系数压减；用样本内残差标准差 s 构造 95% 预测区间
 *      （±1.96·s·√(1+k/n)，步长越远越宽——外推越久越不确定）。
 *   2) predictBedDemand(history, days, seasonality)
 *      床位需求预测：同一套趋势/季节/区间骨架，叠加调用方注入的月度/星期季节系数。
 *   3) optimizeSurgerySchedule(surgeries, rooms, doctors)
 *      手术排程优化：急诊优先 → 长手术优先 → 最早可行位贪心安放，
 *      目标：总等待最短 / 手术室与医生利用率最高 / 连台碎片化最小。
 *   4) recommendResourceAllocation(demand, supply)
 *      资源调配建议：按资源轧差，富余侧按富余度向缺口侧调拨，给出可执行调拨单与平衡分。
 *
 * 降级原则：历史样本不足（<14 天）时预测返回 degraded 空集，不编造数字；
 *           排程/调配在输入为空时返回空方案与明确提示，不臆造排班。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 预测：类型 ============================== */

/** 历史采样点：某运营指标在某自然日的读数 */
export interface HistoryPoint {
  /** 采样日期，ISO 格式 yyyy-mm-dd */
  date: string;
  /** 当日指标值（门诊人次 / 在院床位负荷 等） */
  value: number;
}

/** 预测序列中的单日预测点（含 95% 置信区间） */
export interface ForecastPoint {
  /** 预测日期，ISO 格式 yyyy-mm-dd */
  date: string;
  /** 点预测值 */
  value: number;
  /** 置信区间下界（已截断为非负） */
  lower: number;
  /** 置信区间上界 */
  upper: number;
}

/** 预测结果 */
export interface PredictResult {
  /** 指标名：outpatient_volume / bed_demand */
  metric: string;
  historyStart: string | null;
  historyEnd: string | null;
  /** 参与拟合的历史样本天数 */
  historyPoints: number;
  /** 未来 days 天的逐日预测点 */
  forecast: ForecastPoint[];
  /** 样本内残差标准差（区间宽度来源，可解释） */
  residualStd: number;
  /** 置信水平（固定 0.95） */
  confidenceLevel: number;
  modelMethod: string;
  /** 降级标志：历史不足时 true，forecast 为空数组 */
  degraded: boolean;
  /** 附加说明（如已压减的假日天数） */
  note?: string;
}

/** 床位预测的季节系数注入（缺省即中性 1） */
export interface BedSeasonality {
  /** 12 个月系数（1=中性，1.1=当月需求高 10%），按预测日月份取；长度不足时按 1 处理 */
  monthly?: number[];
  /** 7 天系数（0=周日…6=周六），按预测日星期取 */
  dayOfWeek?: number[];
}

/* ============================== 排程：类型 ============================== */

/** 手术紧急度：急诊最优先 */
export type Urgency = 'emergency' | 'urgent' | 'routine';

/** 待排手术 */
export interface Surgery {
  id: string;
  /** 预计手术时长（分钟） */
  durationMin: number;
  urgency: Urgency;
  /** 所需专科，如 orthopedics / general / *（通用） */
  specialty: string;
  /** 指定主刀医生 id（可选） */
  surgeonId?: string;
}

/** 可用手术室 */
export interface OperatingRoom {
  id: string;
  /** 房间可承接专科，'*' 表示通用 */
  specialty: string;
  /** 当日可用起始分钟（默认 480 = 08:00） */
  openMin?: number;
  /** 当日关闭分钟（默认 1080 = 18:00） */
  closeMin?: number;
}

/** 可用医生 */
export interface Surgeon {
  id: string;
  specialty: string;
  /** 当日最早可上台分钟（默认 480） */
  availableMin?: number;
  /** 当日最晚下台分钟（默认 1080） */
  availableMax?: number;
  /** 当日最大台次（默认 4） */
  maxDailyCases?: number;
}

/** 一台手术的排定结果 */
export interface SurgeryAssignment {
  surgeryId: string;
  roomId: string;
  surgeonId: string;
  /** 上台开始分钟（当日分钟） */
  startMin: number;
  endMin: number;
  /** 相对房间开台的等待分钟（越短越好） */
  waitMin: number;
  urgency: Urgency;
}

/** 未排上的手术 */
export interface UnassignedSurgery {
  surgeryId: string;
  urgency: Urgency;
  reason: string;
}

/** 排程优化指标 */
export interface ScheduleMetrics {
  assigned: number;
  unassigned: number;
  /** 全部手术总等待分钟 */
  totalWaitMin: number;
  /** 当日最后一台结束分钟（makespan） */
  makespanMin: number;
  /** 房间空闲分钟合计（开台到收台的空转） */
  idleMin: number;
  /** 手术室利用率 0~1（手术占用 / 可用窗口） */
  roomUtilization: number;
}

export interface SurgeryScheduleResult {
  schedule: SurgeryAssignment[];
  unassigned: UnassignedSurgery[];
  metrics: ScheduleMetrics;
}

/* ============================== 调配：类型 ============================== */

/** 单类资源需求 */
export interface DemandItem {
  resource: string;
  required: number;
  dept?: string;
}

/** 单类资源供给 */
export interface SupplyItem {
  resource: string;
  available: number;
  dept?: string;
}

/** 一条调拨建议 */
export interface TransferAdvice {
  resource: string;
  fromDept: string;
  toDept: string;
  /** 建议调拨数量 */
  amount: number;
  reason: string;
}

export interface ResourceAllocationResult {
  /** 按资源轧差后的明细 */
  gaps: Array<{
    resource: string;
    required: number;
    available: number;
    net: number;
    status: 'surplus' | 'balanced' | 'shortage';
  }>;
  transfers: TransferAdvice[];
  /** 整体平衡分 0~1（1=供需完全匹配） */
  balanceScore: number;
  /** 仍未被调拨覆盖的缺口 */
  unmet: Array<{ resource: string; amount: number }>;
  notes: string[];
}

/* ============================== 通用统计小工具 ============================== */

const MIN_HISTORY_DAYS = 14;
const MA_WINDOW = 7;
const Z_95 = 1.96;
/** 连台换台缓冲（分钟） */
const TURNOVER_MIN = 15;
const DEFAULT_OPEN = 480; // 08:00
const DEFAULT_CLOSE = 1080; // 18:00

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, v) => a + v, 0) / values.length;
}

function sampleStd(values: number[]): number {
  if (values.length < 2) return 0;
  const mu = mean(values);
  const acc = values.reduce((s, v) => s + (v - mu) * (v - mu), 0);
  return Math.sqrt(acc / (values.length - 1));
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(isoDate: string): number {
  return new Date(isoDate + 'T00:00:00Z').getUTCDay();
}

function monthOf(isoDate: string): number {
  return new Date(isoDate + 'T00:00:00Z').getUTCMonth(); // 0..11
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/** 专科是否匹配：相等或任一方为 '*'（通用） */
function specialtyMatch(a: string, b: string): boolean {
  const x = (a || '*').toLowerCase();
  const y = (b || '*').toLowerCase();
  return x === '*' || y === '*' || x === y;
}

/* ============================== 预测内核 ============================== */

interface RunOptions {
  metric: string;
  digits: number;
  /** 法定假日集合（ISO 日期），命中时对点预测乘 holidayFactor */
  holidaySet?: Set<string>;
  holidayFactor?: number;
  /** 床位季节系数 */
  seasonality?: BedSeasonality;
  method: string;
}

function emptyResult(metric: string, method: string): PredictResult {
  return {
    metric,
    historyStart: null,
    historyEnd: null,
    historyPoints: 0,
    forecast: [],
    residualStd: 0,
    confidenceLevel: 0.95,
    modelMethod: method,
    degraded: true,
  };
}

/**
 * 统一预测内核：移动平均去趋势 + 星期季节因子 + 最小二乘趋势外推 + 残差置信区间。
 */
function runPrediction(history: HistoryPoint[], days: number, opts: RunOptions): PredictResult {
  if (!Array.isArray(history)) return emptyResult(opts.metric, opts.method);
  const clean = history
    .filter((p) => p && typeof p.date === 'string' && Number.isFinite(p.value))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (clean.length < MIN_HISTORY_DAYS || days <= 0) return emptyResult(opts.metric, opts.method);

  const n = clean.length;
  const dates = clean.map((p) => p.date);
  const y = clean.map((p) => Math.max(0, p.value));

  // 1) 中心化移动平均趋势
  const trend: number[] = new Array(n).fill(0);
  const half = Math.floor(MA_WINDOW / 2);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    trend[i] = mean(y.slice(lo, hi + 1));
  }

  // 2) 星期季节因子（归一化到均值 1）
  const ratio = y.map((v, i) => (trend[i] > 1e-9 ? v / trend[i] : 1));
  const byWeekday: number[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < n; i++) byWeekday[weekdayOf(dates[i])].push(ratio[i]);
  const rawSf = byWeekday.map((arr) => (arr.length > 0 ? mean(arr) : 1));
  const sfMean = mean(rawSf) || 1;
  const weekdaySf = rawSf.map((s) => s / sfMean);

  // 3) 趋势项最小二乘线性外推
  const xMean = (n - 1) / 2;
  const yMean = mean(trend);
  let denom = 0;
  let numer = 0;
  for (let i = 0; i < n; i++) {
    denom += (i - xMean) * (i - xMean);
    numer += (i - xMean) * (trend[i] - yMean);
  }
  const slope = denom > 1e-9 ? numer / denom : 0;
  const intercept = yMean - slope * xMean;

  // 4) 样本内残差标准差（区间宽度来源）
  const residuals: number[] = [];
  for (let i = 0; i < n; i++) {
    const fitted = trend[i] * weekdaySf[weekdayOf(dates[i])];
    residuals.push(y[i] - fitted);
  }
  const s = sampleStd(residuals);

  // 5) 外推未来 days 天
  const lastDate = dates[n - 1];
  const forecast: ForecastPoint[] = [];
  let holidayHits = 0;
  for (let k = 1; k <= days; k++) {
    const projDate = addDays(lastDate, k);
    const projTrend = intercept + slope * (n - 1 + k);
    let point = projTrend * weekdaySf[weekdayOf(projDate)];

    // 床位季节系数叠加
    if (opts.seasonality) {
      const mon = opts.seasonality.monthly;
      if (Array.isArray(mon) && mon.length === 12) {
        point *= mon[monthOf(projDate)] || 1;
      }
      const dow = opts.seasonality.dayOfWeek;
      if (Array.isArray(dow) && dow.length === 7) {
        point *= dow[weekdayOf(projDate)] || 1;
      }
    }

    // 法定假日压减（如国庆/春节门诊量骤降）
    let holidayApplied = false;
    if (opts.holidaySet && opts.holidaySet.has(projDate)) {
      point *= opts.holidayFactor ?? 0.35;
      holidayApplied = true;
      holidayHits += 1;
    }

    point = Math.max(0, point);
    const halfW = Z_95 * s * Math.sqrt(1 + k / n);
    forecast.push({
      date: projDate,
      value: round(point, opts.digits),
      lower: round(Math.max(0, point - halfW), opts.digits),
      upper: round(point + halfW, opts.digits),
    });
    void holidayApplied;
  }

  const result: PredictResult = {
    metric: opts.metric,
    historyStart: dates[0],
    historyEnd: lastDate,
    historyPoints: n,
    forecast,
    residualStd: round(s, opts.digits),
    confidenceLevel: 0.95,
    modelMethod: opts.method,
    degraded: false,
  };
  if (holidayHits > 0) {
    result.note = `已按法定假日系数压减 ${holidayHits} 天（假日门诊量取基准的 ${(
      (opts.holidayFactor ?? 0.35) * 100
    ).toFixed(0)}%）`;
  }
  return result;
}

/**
 * 门诊量预测（人次，整数）。
 *
 * @param history  逐日门诊量历史（按日期升序更佳，内部会重排）
 * @param days     预测未来天数
 * @param holidays 法定假日 ISO 日期列表；命中日门诊量按 holidayFactor（默认 0.35）压减
 */
export function predictOutpatientVolume(
  historyData: HistoryPoint[],
  days: number,
  holidays: string[] = [],
): PredictResult {
  const holidaySet = new Set((holidays || []).filter((d) => typeof d === 'string'));
  return runPrediction(historyData, days, {
    metric: 'outpatient_volume',
    digits: 0,
    holidaySet,
    holidayFactor: 0.35,
    method: 'ma7+seasonal7d+lin_trend+holiday',
  });
}

/**
 * 床位需求预测（床位负荷，保留 1 位小数）。
 *
 * @param history    逐日床位负荷历史（在院人次 / 占用床日）
 * @param days       预测未来天数
 * @param seasonality 调用方注入的月度/星期季节系数（1=中性）
 */
export function predictBedDemand(
  historyData: HistoryPoint[],
  days: number,
  seasonality: BedSeasonality = {},
): PredictResult {
  return runPrediction(historyData, days, {
    metric: 'bed_demand',
    digits: 1,
    seasonality,
    method: 'ma7+seasonal7d+lin_trend+injected_seasonality',
  });
}

/* ============================== 手术排程优化 ============================== */

const URGENCY_RANK: Record<Urgency, number> = { emergency: 0, urgent: 1, routine: 2 };

/**
 * 手术排程优化（贪心：急诊优先 + 长手术优先 + 最早可行位）。
 *
 * 优化目标：等待时间最短 / 房间与医生利用率最高 / 连台碎片化最小。
 * 纯函数：只读入参，不修改原数组。
 */
export function optimizeSurgerySchedule(
  surgeries: Surgery[],
  rooms: OperatingRoom[],
  doctors: Surgeon[],
): SurgeryScheduleResult {
  const empty: SurgeryScheduleResult = {
    schedule: [],
    unassigned: [],
    metrics: { assigned: 0, unassigned: 0, totalWaitMin: 0, makespanMin: 0, idleMin: 0, roomUtilization: 0 },
  };
  if (!Array.isArray(surgeries) || surgeries.length === 0) return empty;
  if (!Array.isArray(rooms) || rooms.length === 0) return empty;
  if (!Array.isArray(doctors) || doctors.length === 0) return empty;

  // 拷贝工作副本，记录房间/医生占用尾点与医生台次
  const roomState = rooms.map((r) => ({
    ...r,
    busyUntil: r.openMin ?? DEFAULT_OPEN,
    busyMin: 0,
  }));
  const docState = doctors.map((d) => ({
    ...d,
    busyUntil: d.availableMin ?? DEFAULT_OPEN,
    cases: 0,
  }));

  const sorted = surgeries
    .slice()
    .sort((a, b) =>
      URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
      (b.durationMin ?? 0) - (a.durationMin ?? 0),
    );

  const schedule: SurgeryAssignment[] = [];
  const unassigned: UnassignedSurgery[] = [];

  for (const s of sorted) {
    const dur = Math.max(0, s.durationMin || 0);
    let best: {
      roomIdx: number;
      docIdx: number;
      start: number;
      end: number;
      wait: number;
    } | null = null;

    for (let ri = 0; ri < roomState.length; ri++) {
      const room = roomState[ri];
      if (!specialtyMatch(room.specialty, s.specialty)) continue;
      const roomClose = room.closeMin ?? DEFAULT_CLOSE;

      for (let di = 0; di < docState.length; di++) {
        const doc = docState[di];
        if (!specialtyMatch(doc.specialty, s.specialty)) continue;
        if (s.surgeonId && doc.id !== s.surgeonId) continue;
        const maxCases = doc.maxDailyCases ?? 4;
        if (doc.cases >= maxCases) continue;

        const docClose = doc.availableMax ?? DEFAULT_CLOSE;
        // 开始：房间开台/医生到岗 之后，且上一台结束 + 换台缓冲之后
        const start = Math.max(room.openMin ?? DEFAULT_OPEN, doc.availableMin ?? DEFAULT_OPEN, room.busyUntil, doc.busyUntil);
        const end = start + dur;
        if (end > Math.min(roomClose, docClose)) continue;

        const wait = start - (room.openMin ?? DEFAULT_OPEN);
        if (best === null || start < best.start || (start === best.start && wait < best.wait)) {
          best = { roomIdx: ri, docIdx: di, start, end, wait };
        }
      }
    }

    if (best === null) {
      let reason = '无匹配房间/医生';
      const hasRoom = roomState.some((r) => specialtyMatch(r.specialty, s.specialty));
      const hasDoc = docState.some((d) => specialtyMatch(d.specialty, s.specialty));
      if (!hasRoom) reason = '无匹配专科手术室';
      else if (!hasDoc) reason = '无匹配专科医生';
      else reason = '当日窗口已满，建议顺延或加开';
      unassigned.push({ surgeryId: s.id, urgency: s.urgency, reason });
      continue;
    }

    const room = roomState[best.roomIdx];
    const doc = docState[best.docIdx];
    schedule.push({
      surgeryId: s.id,
      roomId: room.id,
      surgeonId: doc.id,
      startMin: best.start,
      endMin: best.end,
      waitMin: best.wait,
      urgency: s.urgency,
    });
    room.busyUntil = best.end + TURNOVER_MIN;
    room.busyMin += dur;
    doc.busyUntil = best.end + TURNOVER_MIN;
    doc.cases += 1;
  }

  // 指标聚合
  const totalWaitMin = schedule.reduce((a, x) => a + x.waitMin, 0);
  const makespanMin = schedule.length > 0 ? Math.max(...schedule.map((x) => x.endMin)) : 0;
  let availableWindow = 0;
  let busyTotal = 0;
  let idleTotal = 0;
  for (const room of roomState) {
    const open = room.openMin ?? DEFAULT_OPEN;
    const close = room.closeMin ?? DEFAULT_CLOSE;
    availableWindow += Math.max(0, close - open);
    busyTotal += room.busyMin;
    idleTotal += Math.max(0, close - open - room.busyMin);
  }

  return {
    schedule,
    unassigned,
    metrics: {
      assigned: schedule.length,
      unassigned: unassigned.length,
      totalWaitMin,
      makespanMin,
      idleMin: idleTotal,
      roomUtilization: availableWindow > 0 ? round(busyTotal / availableWindow, 3) : 0,
    },
  };
}

/* ============================== 资源调配建议 ============================== */

/**
 * 资源调配建议：按资源轧差，富余侧优先、缺口侧按缺口大小依次补足。
 *
 * 优化目标：患者等待最短（缺口尽快补平）/ 资源利用率最高（富余不闲置）。
 */
export function recommendResourceAllocation(
  demand: DemandItem[],
  supply: SupplyItem[],
): ResourceAllocationResult {
  const notes: string[] = [];
  if (!Array.isArray(demand) || demand.length === 0) {
    return { gaps: [], transfers: [], balanceScore: 1, unmet: [], notes: ['无资源需求，无需调配。'] };
  }
  if (!Array.isArray(supply) || supply.length === 0) {
    return { gaps: [], transfers: [], balanceScore: 0, unmet: [], notes: ['无可用资源供给，无法调配。'] };
  }

  // 按「资源 × 科室」聚合：科室自有供给 − 科室需求 = 科室净余量
  // deptLedger[resource][dept] = { supply, demand }
  const deptLedger = new Map<string, Map<string, { supply: number; demand: number }>>();
  const touch = (resource: string, dept: string): { supply: number; demand: number } => {
    let perDept = deptLedger.get(resource);
    if (!perDept) {
      perDept = new Map();
      deptLedger.set(resource, perDept);
    }
    let cell = perDept.get(dept);
    if (!cell) {
      cell = { supply: 0, demand: 0 };
      perDept.set(dept, cell);
    }
    return cell;
  };

  for (const d of demand) touch(d.resource, d.dept ?? '全院').demand += Math.max(0, d.required || 0);
  for (const s of supply) touch(s.resource, s.dept ?? '全院').supply += Math.max(0, s.available || 0);

  const gaps: ResourceAllocationResult['gaps'] = [];
  const transfers: TransferAdvice[] = [];
  const unmet: Array<{ resource: string; amount: number }> = [];

  for (const [resource, perDept] of deptLedger) {
    let required = 0;
    let available = 0;
    const surplusPool: Array<{ dept: string; amount: number }> = [];
    const deficitList: Array<{ dept: string; amount: number }> = [];

    for (const [dept, cell] of perDept) {
      required += cell.demand;
      available += cell.supply;
      const net = cell.supply - cell.demand;
      if (net > 0) surplusPool.push({ dept, amount: net });
      else if (net < 0) deficitList.push({ dept, amount: -net });
    }

    const net = available - required;
    const status: 'surplus' | 'balanced' | 'shortage' =
      net > 0 ? 'surplus' : net < 0 ? 'shortage' : 'balanced';
    gaps.push({ resource, required, available, net, status });

    // 富余多的科室先出、缺口大的科室先补（同资源内轧差；跨资源不可互换）
    surplusPool.sort((a, b) => b.amount - a.amount);
    deficitList.sort((a, b) => b.amount - a.amount);
    for (const deficit of deficitList) {
      for (const surplus of surplusPool) {
        if (deficit.amount <= 0) break;
        if (surplus.amount <= 0) continue;
        const amount = Math.min(surplus.amount, deficit.amount);
        transfers.push({
          resource,
          fromDept: surplus.dept,
          toDept: deficit.dept,
          amount,
          reason: `${resource} 缺口 ${deficit.amount}，由 ${surplus.dept} 调入 ${amount}`,
        });
        surplus.amount -= amount;
        deficit.amount -= amount;
      }
      if (deficit.amount > 0) {
        unmet.push({ resource, amount: deficit.amount });
      }
    }
  }

  // 平衡分：被满足的需求 / 总需求（1=全满足）
  const totalRequired = gaps.reduce((a, g) => a + g.required, 0);
  const balanceScore = totalRequired > 0 ? round(1 - unmet.reduce((a, u) => a + u.amount, 0) / totalRequired, 3) : 1;

  if (unmet.length > 0) {
    notes.push(`仍有 ${unmet.length} 类资源缺口未被内部富余覆盖，建议启动跨院/租赁支援。`);
  } else {
    notes.push('全部资源缺口已由内部富余轧差补足，无需外部支援。');
  }

  return { gaps: gaps.sort((a, b) => a.net - b.net), transfers, balanceScore, unmet, notes };
}
