/**
 * 健澜AI原生医院操作系统OS - P5-1 医疗质量管理指标闭环（电子病历 6 级）
 *
 * 派生指标聚合器：从样本事件计算 9 项质量指标。
 * - CDS hard-stop / override 率
 * - 护理敏感（跌倒/压疮）每千住院日
 * - 医嘱执行中位时长
 * - 危急值 24h 闭环率 + 中位 ack 时长
 * - 满意度平均分 + 低分工单闭环率
 * - 三级检诊主任查房完成率
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface CdsReviewEvent {
  eventId: string;
  doctorId: string;
  departmentId: string;
  date: string;             // YYYY-MM-DD
  level: 'hard-stop' | 'warning';
  overridden: boolean;
}

export interface NursingAdverseEvent {
  eventId: string;
  departmentId: string;
  date: string;
  type: 'fall' | 'pressure-ulcer' | 'tube-displacement';
  inpatientDays: number;
}

export interface OrderExecutionEvent {
  eventId: string;
  doctorId: string;
  departmentId: string;
  date: string;
  orderToExecMin: number;   // 开立到执行分钟
}

export interface CriticalValueEvent {
  eventId: string;
  departmentId: string;
  date: string;
  ackMin: number | null;    // null = 未确认
}

export interface SatisfactionEvent {
  eventId: string;
  departmentId: string;
  date: string;
  score: number;            // 1-5
}

export interface LowScoreTicket {
  ticketId: string;
  departmentId: string;
  date: string;
  closed: boolean;
}

export interface ChiefRoundEvent {
  eventId: string;
  departmentId: string;
  date: string;
  required: number;
  completed: number;
}

interface Store {
  cds: CdsReviewEvent[];
  nursing: NursingAdverseEvent[];
  orders: OrderExecutionEvent[];
  critical: CriticalValueEvent[];
  satisfaction: SatisfactionEvent[];
  tickets: LowScoreTicket[];
  rounds: ChiefRoundEvent[];
}

const store: Store = { cds: [], nursing: [], orders: [], critical: [], satisfaction: [], tickets: [], rounds: [] };

export const METRIC_WHITELIST = [
  'cdsHardStopRate', 'cdsOverrideRate',
  'fallRatePer1000', 'pressureUlcerRatePer1000',
  'orderExecutionMedianMin',
  'criticalValueClosedLoopRate', 'criticalValueAvgAckMin',
  'patientSatisfactionAvg', 'lowScoreTicketClosedRate',
  'chiefRoundCompletionRate',
] as const;
export type MetricKey = typeof METRIC_WHITELIST[number];

function inWindow(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function filterDept<T extends { departmentId: string }>(arr: T[], departmentId?: string): T[] {
  return departmentId ? arr.filter((x) => x.departmentId === departmentId) : arr;
}

export interface Overview {
  cdsHardStopRate: number;
  cdsOverrideRate: number;
  fallRatePer1000: number;
  pressureUlcerRatePer1000: number;
  orderExecutionMedianMin: number;
  criticalValueClosedLoopRate: number;
  criticalValueAvgAckMin: number;
  patientSatisfactionAvg: number;
  lowScoreTicketClosedRate: number;
  chiefRoundCompletionRate: number;
}

export function computeOverview(departmentId?: string, from?: string, to?: string): Overview {
  const cds = filterDept(store.cds, departmentId).filter((e) => inWindow(e.date, from, to));
  const nursing = filterDept(store.nursing, departmentId).filter((e) => inWindow(e.date, from, to));
  const orders = filterDept(store.orders, departmentId).filter((e) => inWindow(e.date, from, to));
  const crit = filterDept(store.critical, departmentId).filter((e) => inWindow(e.date, from, to));
  const sat = filterDept(store.satisfaction, departmentId).filter((e) => inWindow(e.date, from, to));
  const tk = filterDept(store.tickets, departmentId).filter((e) => inWindow(e.date, from, to));
  const rd = filterDept(store.rounds, departmentId).filter((e) => inWindow(e.date, from, to));

  const hardStops = cds.filter((e) => e.level === 'hard-stop').length;
  const warnings = cds.filter((e) => e.level === 'warning');
  const overridden = warnings.filter((e) => e.overridden).length;

  const inpatientDays = nursing.reduce((s, e) => s + e.inpatientDays, 0);
  const falls = nursing.filter((e) => e.type === 'fall').length;
  const pressureUlcers = nursing.filter((e) => e.type === 'pressure-ulcer').length;

  const acked = crit.filter((e) => e.ackMin !== null);
  const ackMinNums = acked.map((e) => e.ackMin as number);

  const roundRequired = rd.reduce((s, e) => s + e.required, 0);
  const roundCompleted = rd.reduce((s, e) => s + e.completed, 0);

  return {
    cdsHardStopRate: cds.length ? hardStops / cds.length : 0,
    cdsOverrideRate: warnings.length ? overridden / warnings.length : 0,
    fallRatePer1000: inpatientDays ? (falls / inpatientDays) * 1000 : 0,
    pressureUlcerRatePer1000: inpatientDays ? (pressureUlcers / inpatientDays) * 1000 : 0,
    orderExecutionMedianMin: median(orders.map((o) => o.orderToExecMin)),
    criticalValueClosedLoopRate: crit.length ? acked.length / crit.length : 0,
    criticalValueAvgAckMin: median(ackMinNums),
    patientSatisfactionAvg: sat.length ? sat.reduce((s, e) => s + e.score, 0) / sat.length : 0,
    lowScoreTicketClosedRate: tk.length ? tk.filter((t) => t.closed).length / tk.length : 0,
    chiefRoundCompletionRate: roundRequired ? roundCompleted / roundRequired : 0,
  };
}

export interface DoctorRow {
  doctorId: string;
  departmentId: string;
  cdsTotal: number;
  hardStopCount: number;
  overrideCount: number;
  orderCount: number;
  orderExecutionMedianMin: number;
}

export function byDoctor(departmentId?: string, from?: string, to?: string): DoctorRow[] {
  const map = new Map<string, DoctorRow>();
  for (const e of store.cds) {
    if (departmentId && e.departmentId !== departmentId) continue;
    if (!inWindow(e.date, from, to)) continue;
    const row = map.get(e.doctorId) ?? {
      doctorId: e.doctorId, departmentId: e.departmentId,
      cdsTotal: 0, hardStopCount: 0, overrideCount: 0, orderCount: 0, orderExecutionMedianMin: 0,
    };
    row.cdsTotal += 1;
    if (e.level === 'hard-stop') row.hardStopCount += 1;
    if (e.level === 'warning' && e.overridden) row.overrideCount += 1;
    map.set(e.doctorId, row);
  }
  for (const o of store.orders) {
    if (departmentId && o.departmentId !== departmentId) continue;
    if (!inWindow(o.date, from, to)) continue;
    const row = map.get(o.doctorId) ?? {
      doctorId: o.doctorId, departmentId: o.departmentId,
      cdsTotal: 0, hardStopCount: 0, overrideCount: 0, orderCount: 0, orderExecutionMedianMin: 0,
    };
    row.orderCount += 1;
    map.set(o.doctorId, row);
  }
  // 重算每位医生中位执行时长
  for (const [doctorId, row] of map) {
    const nums = store.orders.filter((o) => o.doctorId === doctorId).map((o) => o.orderToExecMin);
    row.orderExecutionMedianMin = median(nums);
  }
  return Array.from(map.values());
}

export interface TrendPoint { date: string; value: number; }

export function trend(metric: MetricKey, departmentId?: string, from?: string, to?: string): TrendPoint[] {
  const overview = computeOverview(departmentId, from, to);
  // 按日聚合：每天独立计算该指标
  const dates = new Set<string>();
  for (const e of [...store.cds, ...store.nursing, ...store.orders, ...store.critical, ...store.satisfaction, ...store.tickets, ...store.rounds]) {
    if (departmentId && (e as { departmentId: string }).departmentId !== departmentId) continue;
    if (inWindow(e.date, from, to)) dates.add(e.date);
  }
  const result: TrendPoint[] = [];
  for (const d of Array.from(dates).sort()) {
    const day = computeOverview(departmentId, d, d);
    result.push({ date: d, value: day[metric] });
  }
  // 兜底：若窗口内无任何事件但全局 overview 有值，返回单点
  if (result.length === 0 && overview[metric] > 0) {
    result.push({ date: from ?? new Date().toISOString().slice(0, 10), value: overview[metric] });
  }
  return result;
}

export function seed(): void {
  __resetStore();
  const depts = ['DEPT-INT', 'DEPT-SURG'];
  const docs = ['DOC-001', 'DOC-002', 'DOC-003'];
  let n = 0;
  const next = (p: string) => `${p}-${Date.now().toString(36)}-${n++}`;

  for (let d = 0; d < 3; d++) {
    const date = new Date(Date.now() - (2 - d) * 86400000).toISOString().slice(0, 10);
    depts.forEach((dept, di) => {
      docs.forEach((doc, i) => {
        // CDS：5 条审查，2 hard-stop，3 warning（其中 1 override）
        store.cds.push({ eventId: next('cds'), doctorId: doc, departmentId: dept, date, level: 'hard-stop', overridden: false });
        if (i % 2 === 0) store.cds.push({ eventId: next('cds'), doctorId: doc, departmentId: dept, date, level: 'hard-stop', overridden: false });
        store.cds.push({ eventId: next('cds'), doctorId: doc, departmentId: dept, date, level: 'warning', overridden: i === 0 });
        store.cds.push({ eventId: next('cds'), doctorId: doc, departmentId: dept, date, level: 'warning', overridden: false });
        // 护理：每科室 100 住院日，1 跌倒
        store.nursing.push({ eventId: next('nur'), departmentId: dept, date, type: 'fall', inpatientDays: 100 });
        store.nursing.push({ eventId: next('nur'), departmentId: dept, date, type: 'pressure-ulcer', inpatientDays: 100 });
        // 医嘱执行时长 15/30/45 min
        store.orders.push({ eventId: next('ord'), doctorId: doc, departmentId: dept, date, orderToExecMin: 15 + i * 15 });
        // 危急值 5 条，4 条 30min 内确认
        store.critical.push({ eventId: next('cv'), departmentId: dept, date, ackMin: 20 + i * 5 });
        if (i === 2) store.critical.push({ eventId: next('cv'), departmentId: dept, date, ackMin: null });
        // 满意度 3.5/4/4.5
        store.satisfaction.push({ eventId: next('sat'), departmentId: dept, date, score: 3.5 + i * 0.5 });
        // 低分工单 2 条 1 closed
        store.tickets.push({ ticketId: next('tk'), departmentId: dept, date, closed: i === 0 });
        // 主任查房 required=2 completed=1+di
        store.rounds.push({ eventId: next('rd'), departmentId: dept, date, required: 2, completed: 1 + di });
      });
    });
  }
}

export function __resetStore(): void {
  store.cds = []; store.nursing = []; store.orders = [];
  store.critical = []; store.satisfaction = []; store.tickets = []; store.rounds = [];
}
