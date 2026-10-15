/**
 * 健澜科技 jlmedaios - 医疗设备管理聚合器（M139-B）【医院运营管理】
 *
 * 业务目标：设备维护提前提醒，不能坏了才知道。
 *   三个纯函数围绕「设备台账 + 预防性维护计划」展开：
 *     - registerEquipment(name, model, dept, purchaseDate, value)：登记一台新设备，默认「在用」；
 *     - scheduleMaintenance(equipmentId, nextDate)：为某台设备排定下次保养日，
 *       同时生成一条维护流水并回写设备的 nextMaintenanceDate；
 *     - getEquipmentStatusReport(now?)：汇总四态数量、资产原值，并抛出「即将到期 / 已逾期」
 *       的维护预警清单——这就是「提前提醒」的落点，默认提前 7 天预警。
 *
 * 设计说明：
 *   本模块为无库依赖的纯函数内核（与 hospitalDashboardAggregator 同思路），状态收敛在模块级
 *   内存台账中，id 由确定性计数器生成（eq_0001 / mt_0001 …），同一序列恒等输出，便于单测与重放；
 *   生产环境可在路由层把同名函数对接到 clinical.medical_equipment 表，函数内核口径保持不变。
 *   getEquipmentStatusReport 的 now 可注入以便测试，缺省取系统当天。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 设备状态：在用 / 维修中 / 停用 / 报废 */
export type EquipmentStatus = '在用' | '维修中' | '停用' | '报废';

/** 设备台账记录 */
export interface Equipment {
  id: string;
  name: string;
  model: string;
  dept: string;
  /** 购置日期（yyyy-mm-dd） */
  purchaseDate: string;
  /** 购置原值（元） */
  value: number;
  status: EquipmentStatus;
  /** 下次预防性维护日期（yyyy-mm-dd）；null = 尚未排程 */
  nextMaintenanceDate: string | null;
  createdAt: string;
}

/** 维护排程流水 */
export interface Maintenance {
  id: string;
  equipmentId: string;
  nextDate: string;
  scheduledAt: string;
}

/** 单条维护预警 */
export interface EquipmentAlert {
  equipmentId: string;
  name: string;
  dept: string;
  nextMaintenanceDate: string;
  /** 距今天数；< 0 表示已逾期 |天数| 天 */
  daysUntilDue: number;
  /** overdue 已逾期 / due-soon 即将到期（提前窗口内） */
  level: 'overdue' | 'due-soon';
}

/** 设备状态报告 */
export interface Report {
  total: number;
  byStatus: Record<EquipmentStatus, number>;
  /** 设备资产原值合计（元） */
  totalValue: number;
  /** 维护提前提醒清单（逾期在前，再按到期日升序） */
  maintenanceAlerts: EquipmentAlert[];
  /** 即将到期（提前窗口内、未逾期）台数 */
  upcomingCount: number;
  /** 已逾期台数 */
  overdueCount: number;
}

/** 提前预警窗口（天）：距下次保养 <= 7 天即提醒 */
export const MAINTENANCE_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

// ---- 模块级内存台账（纯函数内核的状态载体，可被 resetEquipmentStore 清空） ---------
const equipmentStore: Equipment[] = [];
const maintenanceStore: Maintenance[] = [];
let equipSeq = 0;
let maintSeq = 0;

/** 测试辅助：清空台账与计数器，保证用例之间互不污染（不对外暴露为业务 API） */
export function resetEquipmentStore(): void {
  equipmentStore.length = 0;
  maintenanceStore.length = 0;
  equipSeq = 0;
  maintSeq = 0;
}

function todayIso(d: Date): string {
  // 取本地日期的 yyyy-mm-dd，避免 UTC 偏移导致跨天
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

/**
 * 登记一台新设备（纯函数）。
 * 新设备默认「在用」、尚未排程维护；id 由计数器确定性生成。
 */
export function registerEquipment(
  name: string,
  model: string,
  dept: string,
  purchaseDate: string,
  value: number,
): Equipment {
  const trimmedName = (name ?? '').trim();
  if (!trimmedName) throw new Error('设备名称不能为空');
  if (!isValidDateStr(purchaseDate)) throw new Error(`购置日期格式非法：${purchaseDate}（应为 yyyy-mm-dd）`);
  const numValue = Number(value);
  if (!Number.isFinite(numValue) || numValue < 0) throw new Error('设备原值必须为非负数字');

  equipSeq += 1;
  const eq: Equipment = {
    id: `eq_${String(equipSeq).padStart(4, '0')}`,
    name: trimmedName,
    model: (model ?? '').trim(),
    dept: (dept ?? '').trim(),
    purchaseDate,
    value: numValue,
    status: '在用',
    nextMaintenanceDate: null,
    createdAt: new Date().toISOString(),
  };
  equipmentStore.push(eq);
  return eq;
}

/**
 * 为某台设备排定下次预防性维护（纯函数）。
 * 生成一条维护流水，并把 nextMaintenanceDate 回写到设备台账。
 */
export function scheduleMaintenance(equipmentId: string, nextDate: string): Maintenance {
  const eq = equipmentStore.find((e) => e.id === equipmentId);
  if (!eq) throw new Error(`设备不存在：${equipmentId}`);
  if (!isValidDateStr(nextDate)) throw new Error(`下次维护日期格式非法：${nextDate}（应为 yyyy-mm-dd）`);

  maintSeq += 1;
  const rec: Maintenance = {
    id: `mt_${String(maintSeq).padStart(4, '0')}`,
    equipmentId,
    nextDate,
    scheduledAt: new Date().toISOString(),
  };
  maintenanceStore.push(rec);
  eq.nextMaintenanceDate = nextDate;
  return rec;
}

/** 只读视图：当前台账列表（供 GET 路由返回，不暴露内部可变引用） */
export function listEquipment(): Equipment[] {
  return equipmentStore.map((e) => ({ ...e }));
}

/**
 * 汇总设备状态报告（纯函数）。
 * 核心：把「已逾期 / 即将到期」的维护计划抛成预警清单，实现提前提醒。
 * @param now 参考时间，测试可注入；缺省取系统当天
 */
export function getEquipmentStatusReport(now: Date = new Date()): Report {
  const byStatus: Record<EquipmentStatus, number> = {
    在用: 0,
    维修中: 0,
    停用: 0,
    报废: 0,
  };
  let totalValue = 0;
  const alerts: EquipmentAlert[] = [];
  const today = todayIso(now);
  const todayMs = new Date(`${today}T00:00:00`).getTime();

  for (const e of equipmentStore) {
    byStatus[e.status] += 1;
    totalValue += e.value;

    // 提前提醒只关心「在用且已排程」的设备；报废/停用/维修中的不在主动保养窗口
    if (e.status !== '在用' || !e.nextMaintenanceDate) continue;
    const nextMs = new Date(`${e.nextMaintenanceDate}T00:00:00`).getTime();
    const daysUntilDue = Math.round((nextMs - todayMs) / DAY_MS);

    if (daysUntilDue < 0) {
      alerts.push({
        equipmentId: e.id, name: e.name, dept: e.dept,
        nextMaintenanceDate: e.nextMaintenanceDate, daysUntilDue, level: 'overdue',
      });
    } else if (daysUntilDue <= MAINTENANCE_WINDOW_DAYS) {
      alerts.push({
        equipmentId: e.id, name: e.name, dept: e.dept,
        nextMaintenanceDate: e.nextMaintenanceDate, daysUntilDue, level: 'due-soon',
      });
    }
  }

  // 逾期在前，再按到期日升序，设备科优先处理最急的
  alerts.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'overdue' ? -1 : 1;
    return a.nextMaintenanceDate.localeCompare(b.nextMaintenanceDate);
  });

  return {
    total: equipmentStore.length,
    byStatus,
    totalValue,
    maintenanceAlerts: alerts,
    upcomingCount: alerts.filter((a) => a.level === 'due-soon').length,
    overdueCount: alerts.filter((a) => a.level === 'overdue').length,
  };
}
