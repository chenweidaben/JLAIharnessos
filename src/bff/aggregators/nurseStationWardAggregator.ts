/**
 * 健澜AI原生医院操作系统OS - P0-3 护士站工作台补全聚合器
 *
 * 在 P0-3 已落的医嘱审核/PDA 床边执行（nurseStationTradeAggregator）之上，补四类写端闭环：
 *  - PDA 按执行单（slip）批量床边执行，消费 P0-2 orderCpoeAggregator 的 listSlips()；
 *  - 体征录入（生理区间硬校验，越界 400 指明项，不静默截断）；
 *  - 护理记录书写（recordType 白名单 + content 必填）；
 *  - 护理执行单汇总（待执行项 + 已执行留痕 + 体征/护理计数）。
 *
 * 权限复用 P0-2 assertCan（execute 域），不另起权限模型；越权 403 由 OrderCpoeError
 * 统一映射为 code=40300。DEMO_MODE 下纯内存台账，seed 时间一律相对当前滚动。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  OrderCpoeError,
  assertCan,
  listSlips,
  listOrders,
  type CpoeActor,
} from './orderCpoeAggregator.js';

const HOUR_MS = 3_600_000;

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

export type NursingRecordType =
  | 'shift_handover'
  | 'nursing_note'
  | 'intake_output'
  | 'skin_assessment';

export const NURSING_RECORD_TYPES: readonly NursingRecordType[] = [
  'shift_handover',
  'nursing_note',
  'intake_output',
  'skin_assessment',
];

export interface VitalsRecord {
  vitalsId: string;
  visitId: string;
  patientId: string;
  temperatureC: number;
  heartRateBpm: number;
  sbp: number;
  dbp: number;
  recordedBy: string;
  recordedByName?: string;
  recordedAt: number;
}

export interface NursingRecord {
  recordId: string;
  visitId: string;
  patientId: string;
  recordType: NursingRecordType;
  content: string;
  writtenBy: string;
  writtenByName?: string;
  writtenAt: number;
}

export interface PdaExecRecord {
  execId: string;
  slipNo: string;
  orderIds: string[];
  patientId: string;
  patientName: string;
  executedBy: string;
  executedByName?: string;
  executedAt: number;
  checks: { patientMatched: boolean };
}

export interface PdaDenial {
  slipNo: string;
  scannedPatientId: string;
  expectedPatientId: string;
  deniedBy: string;
  deniedAt: number;
  reason: string;
}

export interface WardExecutionSheet {
  visitId: string | null;
  pendingItems: Array<{
    orderId: string;
    visitId: string;
    patientId: string;
    patientName: string;
    content: string;
    status: string;
  }>;
  executedItems: Array<{
    execId: string;
    slipNo: string;
    orderIds: string[];
    patientId: string;
    executedAt: number;
  }>;
  vitalsCount: number;
  nursingRecordsCount: number;
  generatedAt: number;
}

/* ------------------------------------------------------------------ */
/* 内存台账                                                             */
/* ------------------------------------------------------------------ */

const vitals = new Map<string, VitalsRecord>();
const nursingRecords = new Map<string, NursingRecord>();
const pdaExecutions = new Map<string, PdaExecRecord>(); // slipNo -> 执行留痕
const pdaDenials: PdaDenial[] = [];

let vitalsSeq = 0;
let nursingSeq = 0;
let pdaExecSeq = 0;

/* ------------------------------------------------------------------ */
/* 生理区间（硬校验，越界 400 指明项）                                   */
/* ------------------------------------------------------------------ */

const VITALS_RANGES = [
  { field: '体温', key: 'temperatureC', unit: '℃', min: 30, max: 45 },
  { field: '心率', key: 'heartRateBpm', unit: 'bpm', min: 20, max: 250 },
  { field: '收缩压', key: 'sbp', unit: 'mmHg', min: 40, max: 300 },
  { field: '舒张压', key: 'dbp', unit: 'mmHg', min: 20, max: 200 },
] as const;

export interface RecordVitalsInput {
  visitId: string;
  patientId: string;
  temperatureC: number;
  heartRateBpm: number;
  sbp: number;
  dbp: number;
  recordedBy: string;
  recordedByName?: string;
  now?: number;
}

/**
 * 体征录入：visitId/patientId 必填；四项生理指标逐项区间校验。
 * 越界立即 400 并指明哪项（如「体温 46.2℃ 超出区间 30~45」），绝不静默截断。
 */
export function recordVitals(input: RecordVitalsInput): VitalsRecord {
  const now = input.now ?? Date.now();
  if (!input.visitId) throw new OrderCpoeError(400, 'visitId 必填');
  if (!input.patientId) throw new OrderCpoeError(400, 'patientId 必填');

  const raw: Record<string, number> = {
    temperatureC: input.temperatureC,
    heartRateBpm: input.heartRateBpm,
    sbp: input.sbp,
    dbp: input.dbp,
  };
  for (const r of VITALS_RANGES) {
    const v = raw[r.key];
    if (typeof v !== 'number' || Number.isNaN(v)) {
      throw new OrderCpoeError(400, `${r.field}必填且须为数值`);
    }
    if (v < r.min || v > r.max) {
      throw new OrderCpoeError(400, `${r.field} ${v}${r.unit} 超出区间 ${r.min}~${r.max}`);
    }
  }

  vitalsSeq += 1;
  const rec: VitalsRecord = {
    vitalsId: `VIT-${vitalsSeq}`,
    visitId: input.visitId,
    patientId: input.patientId,
    temperatureC: input.temperatureC,
    heartRateBpm: input.heartRateBpm,
    sbp: input.sbp,
    dbp: input.dbp,
    recordedBy: input.recordedBy,
    recordedByName: input.recordedByName,
    recordedAt: now,
  };
  vitals.set(rec.vitalsId, rec);
  return rec;
}

/* ------------------------------------------------------------------ */
/* 护理记录书写                                                         */
/* ------------------------------------------------------------------ */

export interface WriteNursingRecordInput {
  visitId: string;
  patientId: string;
  recordType: string;
  content: string;
  writtenBy: string;
  writtenByName?: string;
  now?: number;
}

/**
 * 护理记录书写：content 必填(400)；recordType 必须属于四类白名单，否则 400。
 */
export function writeNursingRecord(input: WriteNursingRecordInput): NursingRecord {
  const now = input.now ?? Date.now();
  if (!input.visitId) throw new OrderCpoeError(400, 'visitId 必填');
  if (!input.patientId) throw new OrderCpoeError(400, 'patientId 必填');
  if (!input.content || !String(input.content).trim()) {
    throw new OrderCpoeError(400, '护理记录内容必填');
  }
  const rt = input.recordType as NursingRecordType;
  if (!NURSING_RECORD_TYPES.includes(rt)) {
    throw new OrderCpoeError(
      400,
      `recordType 必须为 ${NURSING_RECORD_TYPES.join('/')} 之一`,
    );
  }

  nursingSeq += 1;
  const rec: NursingRecord = {
    recordId: `NR-${nursingSeq}`,
    visitId: input.visitId,
    patientId: input.patientId,
    recordType: rt,
    content: String(input.content).trim(),
    writtenBy: input.writtenBy,
    writtenByName: input.writtenByName,
    writtenAt: now,
  };
  nursingRecords.set(rec.recordId, rec);
  return rec;
}

/* ------------------------------------------------------------------ */
/* PDA 按执行单床边执行（消费 P0-2 execution-slip）                     */
/* ------------------------------------------------------------------ */

export interface PdaExecuteInput {
  slipNo: string;
  scannedPatientId: string;
  executedBy: string;
  executedByName?: string;
  actor: CpoeActor;
  now?: number;
}

/**
 * PDA 按执行单床边执行：
 *  1) 权限 execute 域（assertCan），越权 403；
 *  2) slipNo 不存在 → 404；
 *  3) slip 内任一医嘱 stopped → 409「已停止医嘱不得执行」；
 *  4) 扫腕带患者与执行单绑定患者不一致 → 409，且写拒绝留痕（reason 固定文案）；
 *  5) 同一 slip 重复执行 → 409；
 *  6) 成功 → 写 PDA 执行留痕（checks.patientMatched=true）。
 */
export function pdaExecuteBySlip(input: PdaExecuteInput): PdaExecRecord {
  const now = input.now ?? Date.now();
  assertCan(input.actor, 'execute');

  const slip = listSlips().find((s) => s.slipNo === input.slipNo);
  if (!slip) {
    throw new OrderCpoeError(404, `执行单不存在: ${input.slipNo}`);
  }

  // 以医嘱台账为唯一真源解析患者/状态
  const orderMap = new Map(listOrders().map((o) => [o.orderId, o]));
  let expectedPatientId = '';
  let expectedPatientName = '';
  for (const oid of slip.orderIds) {
    const o = orderMap.get(oid);
    if (!o) throw new OrderCpoeError(404, `执行单含医嘱不存在: ${oid}`);
    if (o.status === 'stopped') {
      throw new OrderCpoeError(409, `已停止医嘱不得执行: ${oid}`);
    }
    expectedPatientId = expectedPatientId || o.patientId;
    expectedPatientName = expectedPatientName || o.patientName;
  }

  // 腕带患者一致性（在重复执行判断之前，扫错一律拒绝并留痕）
  if (input.scannedPatientId && input.scannedPatientId !== expectedPatientId) {
    const denial: PdaDenial = {
      slipNo: slip.slipNo,
      scannedPatientId: input.scannedPatientId,
      expectedPatientId,
      deniedBy: input.executedBy,
      deniedAt: now,
      reason: '腕带与执行单患者不匹配',
    };
    pdaDenials.push(denial);
    throw new OrderCpoeError(409, `${denial.reason}（期望 ${expectedPatientId}，扫到 ${input.scannedPatientId}）`);
  }

  if (pdaExecutions.has(slip.slipNo)) {
    throw new OrderCpoeError(409, `执行单已执行，不可重复执行: ${slip.slipNo}`);
  }

  pdaExecSeq += 1;
  const rec: PdaExecRecord = {
    execId: `PDAEXE-${pdaExecSeq}`,
    slipNo: slip.slipNo,
    orderIds: [...slip.orderIds],
    patientId: expectedPatientId,
    patientName: expectedPatientName,
    executedBy: input.executedBy,
    executedByName: input.executedByName,
    executedAt: now,
    checks: { patientMatched: true },
  };
  pdaExecutions.set(slip.slipNo, rec);
  return rec;
}

/** 取最近一条 PDA 拒绝留痕（供 E2E 断言字段）。 */
export function lastPdaDenial(): PdaDenial | null {
  return pdaDenials.length > 0 ? pdaDenials[pdaDenials.length - 1] : null;
}

/* ------------------------------------------------------------------ */
/* 护理执行单汇总                                                       */
/* ------------------------------------------------------------------ */

export interface BuildWardSheetInput {
  visitId?: string;
}

/**
 * 护理执行单汇总：
 *  - pendingItems：approved 待床边执行的医嘱（可按 visitId 过滤）；
 *  - executedItems：PDA 执行留痕；
 *  - vitalsCount / nursingRecordsCount：按 visitId 过滤后计数（不过滤则全量）。
 */
export function buildWardExecutionSheet(input: BuildWardSheetInput = {}): WardExecutionSheet {
  const now = Date.now();
  const allOrders = listOrders();
  const orders = input.visitId
    ? allOrders.filter((o) => o.visitId === input.visitId)
    : allOrders;

  const pendingItems = orders
    .filter((o) => o.status === 'approved')
    .map((o) => ({
      orderId: o.orderId,
      visitId: o.visitId,
      patientId: o.patientId,
      patientName: o.patientName,
      content: o.content,
      status: o.status,
    }));

  const executedItems = Array.from(pdaExecutions.values())
    .filter((r) => !input.visitId || r.orderIds.some((oid) => {
      const o = allOrders.find((x) => x.orderId === oid);
      return o && o.visitId === input.visitId;
    }))
    .map((r) => ({
      execId: r.execId,
      slipNo: r.slipNo,
      orderIds: r.orderIds,
      patientId: r.patientId,
      executedAt: r.executedAt,
    }));

  const vitalsCount = input.visitId
    ? Array.from(vitals.values()).filter((v) => v.visitId === input.visitId).length
    : vitals.size;
  const nursingRecordsCount = input.visitId
    ? Array.from(nursingRecords.values()).filter((n) => n.visitId === input.visitId).length
    : nursingRecords.size;

  return {
    visitId: input.visitId ?? null,
    pendingItems,
    executedItems,
    vitalsCount,
    nursingRecordsCount,
    generatedAt: now,
  };
}

/* ------------------------------------------------------------------ */
/* 查询                                                                */
/* ------------------------------------------------------------------ */

export function listVitals(visitId?: string): VitalsRecord[] {
  const all = Array.from(vitals.values());
  return visitId ? all.filter((v) => v.visitId === visitId) : all;
}

export function listNursingRecords(visitId?: string): NursingRecord[] {
  const all = Array.from(nursingRecords.values());
  return visitId ? all.filter((n) => n.visitId === visitId) : all;
}

/* ------------------------------------------------------------------ */
/* DEMO seed（滚动时间基准）                                            */
/* ------------------------------------------------------------------ */

function seedDemo(): void {
  const now = Date.now();
  vitalsSeq = 0;
  nursingSeq = 0;
  pdaExecSeq = 0;
  vitals.clear();
  nursingRecords.clear();
  pdaExecutions.clear();
  pdaDenials.length = 0;

  const seedVitals: Array<[string, string, number, number, number, number, number]> = [
    // visitId, patientId, temp, hr, sbp, dbp, hoursAgo
    ['VISIT-A100', 'PT-P001', 36.6, 78, 120, 78, 2],
    ['VISIT-B200', 'PT-P002', 37.1, 84, 128, 82, 4],
    ['VISIT-C300', 'PT-P003', 36.4, 72, 118, 76, 6],
  ];
  for (const [vid, pid, t, hr, sbp, dbp, hrs] of seedVitals) {
    vitalsSeq += 1;
    vitals.set(`VIT-${vitalsSeq}`, {
      vitalsId: `VIT-${vitalsSeq}`,
      visitId: vid,
      patientId: pid,
      temperatureC: t,
      heartRateBpm: hr,
      sbp,
      dbp,
      recordedBy: 'u_nurse01',
      recordedByName: '护士钱',
      recordedAt: now - hrs * HOUR_MS,
    });
  }

  const seedNotes: Array<[string, string, NursingRecordType, string, number]> = [
    ['VISIT-A100', 'PT-P001', 'shift_handover', '白班交班：患者神志清，输液通畅，夜间无不适。', 3],
    ['VISIT-B200', 'PT-P002', 'nursing_note', '雾化吸入后咳嗽减轻，继续观察呼吸频率。', 5],
  ];
  for (const [vid, pid, rt, content, hrs] of seedNotes) {
    nursingSeq += 1;
    nursingRecords.set(`NR-${nursingSeq}`, {
      recordId: `NR-${nursingSeq}`,
      visitId: vid,
      patientId: pid,
      recordType: rt,
      content,
      writtenBy: 'u_nurse01',
      writtenByName: '护士钱',
      writtenAt: now - hrs * HOUR_MS,
    });
  }
}

/** 单测/重启隔离。 */
export function __resetStore(): void {
  seedDemo();
}

seedDemo();
