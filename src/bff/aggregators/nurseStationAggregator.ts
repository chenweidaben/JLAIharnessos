/**
 * 健澜科技 jlmedaios - 护士站四合一聚合器（M18-B）
 *
 * 纯读聚合，组合既有模块：床位/在院患者（listInpatients）、最新体征（observations）、
 * 出入量平衡（nursing_io_records）、待给药（med_administrations）、在院管路（tubes）、
 * 高危风险（nursing_risk_assessments）、未处理 hard CDS（order_cds_alerts）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { listInpatients } from './inpatientAggregator.js';
import { countUnresolvedHard, listByVisit as listCdsByVisit } from '../../db/repositories/orderCdsRepo.js';

export class NurseStationError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'NurseStationError';
  }
}
const forbidden = (m: string) => new NurseStationError(403, 'FORBIDDEN', m);
const notFound = (m: string) => new NurseStationError(404, 'NOT_FOUND', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

export interface WardRow {
  visitId: string;
  patientName: string;
  bedNo: string | null;
  department: string | null;
  latestVitals: { temperature: number | null; sbp: number | null; pulse: number | null; recordedAt: string | null };
  ioBalance24h: number | null;
  pendingMeds: number;
  activeTubes: number;
  riskLevel: string;
  unresolvedHardCds: number;
  outstanding: number;
}

/** 拉最新体征一行。 */
async function latestVitals(visitId: string): Promise<WardRow['latestVitals']> {
  const db = getDb();
  const rows = await db`
    SELECT vitals->>'temperature' AS temp, vitals->>'sbp' AS sbp, vitals->>'pulse' AS pulse, created_at
    FROM clinical.observations
    WHERE visit_id = ${visitId} ORDER BY created_at DESC LIMIT 1`;
  if (rows.length === 0) return { temperature: null, sbp: null, pulse: null, recordedAt: null };
  const r = rows[0] as Record<string, unknown>;
  return {
    temperature: r.temp ? Number(r.temp) : null,
    sbp: r.sbp ? Number(r.sbp) : null,
    pulse: r.pulse ? Number(r.pulse) : null,
    recordedAt: r.created_at ? String(r.created_at) : null,
  };
}

/** 24h 出入量净平衡（intake-output）。 */
async function ioBalance24h(visitId: string): Promise<number | null> {
  const db = getDb();
  const rows = await db`
    SELECT
      COALESCE(SUM(amount_ml) FILTER (WHERE direction='intake'),0)::numeric AS in_ml,
      COALESCE(SUM(amount_ml) FILTER (WHERE direction='output'),0)::numeric AS out_ml
    FROM clinical.nursing_io_records
    WHERE visit_id = ${visitId} AND record_time >= now() - interval '24 hours'`;
  const r = rows[0] as Record<string, unknown>;
  if (!Number(r.in_ml) && !Number(r.out_ml)) return null;
  return Number(r.in_ml) - Number(r.out_ml);
}

async function pendingMeds(visitId: string): Promise<number> {
  const db = getDb();
  const rows = await db`SELECT count(*)::int AS n FROM clinical.med_administrations WHERE visit_id = ${visitId} AND status IN ('planned','arrived')`;
  return Number((rows[0] as Record<string, unknown>).n);
}

async function activeTubes(visitId: string): Promise<number> {
  const db = getDb();
  const rows = await db`SELECT count(*)::int AS n FROM clinical.tubes WHERE visit_id = ${visitId} AND status='in_place'`;
  return Number((rows[0] as Record<string, unknown>).n);
}

/** 最新风险等级（压疮+跌倒取较高者）。 */
async function latestRisk(visitId: string): Promise<string> {
  const db = getDb();
  const rows = await db`
    SELECT level FROM clinical.nursing_risk_assessments
    WHERE visit_id = ${visitId} ORDER BY assessed_at DESC LIMIT 1`;
  return rows.length > 0 ? String((rows[0] as Record<string, unknown>).level) : 'none';
}

function scoreOutstanding(r: WardRow): number {
  return r.unresolvedHardCds * 10 + (r.riskLevel === 'high' ? 5 : 0) + r.pendingMeds + r.activeTubes;
}

/**
 * v5.0试点扩展（M188空数据修复）：DEMO_MODE 护士站在院一览确定性种子。
 * 固定 8 条在院患者（床号/姓名/诊断/护理等级/入科时间/最新体征/风险/CDS 齐全），
 * 另附 5 条待执行医嘱与 5 条护理任务；无随机、无 SQL，字段与真实 getWardBoard 一致。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
function buildDemoWardBoard(): {
  items: WardRow[];
  pendingOrders: Array<Record<string, unknown>>;
  nursingTasks: Array<Record<string, unknown>>;
} {
  const today = '2026-10-19';
  const base: Array<{
    visitId: string; patientName: string; bedNo: string; department: string;
    diagnosis: string; nursingLevel: string; admittedAt: string;
    temperature: number; sbp: number; pulse: number;
    ioBalance24h: number; pendingMeds: number; activeTubes: number;
    riskLevel: string; unresolvedHardCds: number;
  }> = [
    { visitId: 'demo-visit-01', patientName: '王*英', bedNo: '08床', department: '心血管内科', diagnosis: '冠心病 急性ST段抬高型心肌梗死', nursingLevel: '特级护理', admittedAt: '2026-10-17 09:30', temperature: 36.8, sbp: 128, pulse: 78, ioBalance24h: 350, pendingMeds: 3, activeTubes: 2, riskLevel: 'high', unresolvedHardCds: 1 },
    { visitId: 'demo-visit-02', patientName: '李*国', bedNo: '09床', department: '心血管内科', diagnosis: '高血压3级（很高危）', nursingLevel: '一级护理', admittedAt: '2026-10-18 14:05', temperature: 37.1, sbp: 158, pulse: 88, ioBalance24h: -120, pendingMeds: 2, activeTubes: 1, riskLevel: 'high', unresolvedHardCds: 0 },
    { visitId: 'demo-visit-03', patientName: '张*华', bedNo: '10床', department: '呼吸内科', diagnosis: '社区获得性肺炎', nursingLevel: '一级护理', admittedAt: '2026-10-18 20:40', temperature: 38.6, sbp: 118, pulse: 96, ioBalance24h: 200, pendingMeds: 2, activeTubes: 1, riskLevel: 'medium', unresolvedHardCds: 1 },
    { visitId: 'demo-visit-04', patientName: '刘*梅', bedNo: '11床', department: '消化内科', diagnosis: '2型糖尿病 糖尿病酮症', nursingLevel: '一级护理', admittedAt: '2026-10-19 02:15', temperature: 36.5, sbp: 110, pulse: 92, ioBalance24h: 520, pendingMeds: 4, activeTubes: 1, riskLevel: 'high', unresolvedHardCds: 0 },
    { visitId: 'demo-visit-05', patientName: '陈*强', bedNo: '12床', department: '普外科', diagnosis: '急性阑尾炎 阑尾切除术后', nursingLevel: '二级护理', admittedAt: '2026-10-19 08:00', temperature: 37.3, sbp: 122, pulse: 76, ioBalance24h: -80, pendingMeds: 1, activeTubes: 1, riskLevel: 'low', unresolvedHardCds: 0 },
    { visitId: 'demo-visit-06', patientName: '赵*珍', bedNo: '15床', department: '神经内科', diagnosis: '脑梗死（急性期）', nursingLevel: '特级护理', admittedAt: '2026-10-16 11:20', temperature: 36.6, sbp: 145, pulse: 70, ioBalance24h: 180, pendingMeds: 2, activeTubes: 3, riskLevel: 'high', unresolvedHardCds: 2 },
    { visitId: 'demo-visit-07', patientName: '孙*军', bedNo: '16床', department: '骨科', diagnosis: '右股骨颈骨折 人工髋关节置换术后', nursingLevel: '二级护理', admittedAt: '2026-10-19 10:10', temperature: 36.9, sbp: 130, pulse: 74, ioBalance24h: -60, pendingMeds: 1, activeTubes: 0, riskLevel: 'medium', unresolvedHardCds: 0 },
    { visitId: 'demo-visit-08', patientName: '周*芳', bedNo: '18床', department: '肿瘤科', diagnosis: '肺恶性肿瘤 化疗第3周期', nursingLevel: '一级护理', admittedAt: '2026-10-15 16:45', temperature: 37.8, sbp: 105, pulse: 82, ioBalance24h: 90, pendingMeds: 3, activeTubes: 1, riskLevel: 'medium', unresolvedHardCds: 1 },
  ];
  const items: WardRow[] = base.map((r) => {
    const row: WardRow & { diagnosis?: string; nursingLevel?: string; admittedAt?: string } = {
      visitId: r.visitId,
      patientName: r.patientName,
      bedNo: r.bedNo,
      department: r.department,
      latestVitals: {
        temperature: r.temperature, sbp: r.sbp, pulse: r.pulse,
        recordedAt: `${today} 06:00`,
      },
      ioBalance24h: r.ioBalance24h,
      pendingMeds: r.pendingMeds,
      activeTubes: r.activeTubes,
      riskLevel: r.riskLevel,
      unresolvedHardCds: r.unresolvedHardCds,
      outstanding: 0,
      diagnosis: r.diagnosis,
      nursingLevel: r.nursingLevel,
      admittedAt: r.admittedAt,
    };
    row.outstanding = scoreOutstanding(row);
    return row;
  });
  items.sort((a, b) => b.outstanding - a.outstanding);
  const pendingOrders = [
    { orderId: 'demo-ord-01', visitId: 'demo-visit-01', orderName: '阿司匹林肠溶片 100mg 口服 qd', route: '口服', status: 'planned', dueAt: '2026-10-19 18:00', prescriber: '李医生' },
    { orderId: 'demo-ord-02', visitId: 'demo-visit-04', orderName: '0.9%氯化钠注射液 250ml + 胰岛素 4U 静滴', route: '静脉输液', status: 'arrived', dueAt: '2026-10-19 17:30', prescriber: '陈医生' },
    { orderId: 'demo-ord-03', visitId: 'demo-visit-03', orderName: '注射用头孢呋辛 1.5g 静滴 q8h', route: '静脉输液', status: 'planned', dueAt: '2026-10-19 20:00', prescriber: '王医生' },
    { orderId: 'demo-ord-04', visitId: 'demo-visit-06', orderName: '丁苯酞氯化钠注射液 100ml 静滴 qd', route: '静脉输液', status: 'planned', dueAt: '2026-10-19 19:00', prescriber: '赵医生' },
    { orderId: 'demo-ord-05', visitId: 'demo-visit-08', orderName: '盐酸格拉司琼 3mg 静滴 qd（化疗止吐）', route: '静脉输液', status: 'arrived', dueAt: '2026-10-19 17:00', prescriber: '周医生' },
  ];
  const nursingTasks = [
    { taskId: 'demo-task-01', visitId: 'demo-visit-01', taskName: '心电监护 持续监测', type: '监护', status: 'doing', dueAt: '2026-10-19 18:00' },
    { taskId: 'demo-task-02', visitId: 'demo-visit-06', taskName: '压疮风险评估（Braden）', type: '评估', status: 'pending', dueAt: '2026-10-19 17:00' },
    { taskId: 'demo-task-03', visitId: 'demo-visit-02', taskName: '每小时测量血压并记录', type: '体征监测', status: 'doing', dueAt: '2026-10-19 18:00' },
    { taskId: 'demo-task-04', visitId: 'demo-visit-05', taskName: '术后切口换药', type: '护理操作', status: 'pending', dueAt: '2026-10-19 16:00' },
    { taskId: 'demo-task-05', visitId: 'demo-visit-03', taskName: '雾化吸入 tid', type: '护理操作', status: 'pending', dueAt: '2026-10-19 19:00' },
  ];
  return { items, pendingOrders, nursingTasks };
}

/** 护士站在院一览（按未处理项数倒序）。 */
export async function getWardBoard(auth: AuthView, perm: string): Promise<{
  items: WardRow[];
  pendingOrders?: Array<Record<string, unknown>>;
  nursingTasks?: Array<Record<string, unknown>>;
}> {
  assertPermission(auth, perm);
  // v5.0试点扩展（M188空数据修复）：DEMO_MODE 下直接返回确定性演示种子，
  // 不再依赖 PostgreSQL 当天在院数据（原为空导致页面在院患者 0 条）。
  if (process.env.DEMO_MODE === '1') {
    return buildDemoWardBoard();
  }
  const { items } = await listInpatients(auth, {});
  const rows: WardRow[] = [];
  for (const it of items) {
    const [vitals, balance, pending, tubes, risk, hardCds] = await Promise.all([
      latestVitals(it.visitId),
      ioBalance24h(it.visitId),
      pendingMeds(it.visitId),
      activeTubes(it.visitId),
      latestRisk(it.visitId),
      countUnresolvedHard(it.visitId),
    ]);
    rows.push({
      visitId: it.visitId,
      patientName: it.nameMasked,
      bedNo: it.bedNo ?? null,
      department: it.department ?? null,
      latestVitals: vitals,
      ioBalance24h: balance,
      pendingMeds: pending,
      activeTubes: tubes,
      riskLevel: risk,
      unresolvedHardCds: hardCds,
      outstanding: 0,
    });
  }
  for (const r of rows) r.outstanding = scoreOutstanding(r);
  rows.sort((a, b) => b.outstanding - a.outstanding);
  return { items: rows };
}

/** 单患者全量一览。 */
export async function getVisitWorkbench(auth: AuthView, perm: string, visitId: string) {
  assertPermission(auth, perm);
  if (!visitId) throw notFound('visitId 必填');
  const db = getDb();
  // 校验在院 + 数据范围（listInpatients 已带 auth 过滤，这里用其一找到 visit）
  const { items } = await listInpatients(auth, {});
  const mine = items.find((i) => i.visitId === visitId);
  if (!mine) throw forbidden('超出数据权限范围或就诊不在院');

  const [vitals, balance, cdsAlerts, tubesRows, ioRows, medRows, riskRows] = await Promise.all([
    latestVitals(visitId),
    ioBalance24h(visitId),
    listCdsByVisit(visitId),
    db`SELECT id, tube_type, site, status FROM clinical.tubes WHERE visit_id=${visitId} ORDER BY inserted_at DESC`,
    db`SELECT direction, category, amount_ml, record_time FROM clinical.nursing_io_records WHERE visit_id=${visitId} ORDER BY record_time DESC LIMIT 50`,
    db`SELECT med_name, dose, route, status, occurred_at FROM clinical.med_administrations WHERE visit_id=${visitId} ORDER BY occurred_at DESC LIMIT 50`,
    db`SELECT risk_type, level, assessed_at FROM clinical.nursing_risk_assessments WHERE visit_id=${visitId} ORDER BY assessed_at DESC LIMIT 10`,
  ]);
  return {
    visitId,
    patientName: mine.nameMasked,
    bedNo: mine.bedNo ?? null,
    latestVitals: vitals,
    ioBalance24h: balance,
    ioRows,
    medRows,
    tubesRows,
    riskRows,
    cdsAlerts,
    unresolvedHardCds: cdsAlerts.filter((a) => a.severity === 'hard' && !a.overrideBy).length,
  };
}
