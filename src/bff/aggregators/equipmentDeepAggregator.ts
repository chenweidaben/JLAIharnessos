/**
 * 健澜科技 jlmedaios - 医疗设备管理深化聚合器（M177-C）【病案设备耗材】
 *
 * 业务目标：设备管理要真实，不能台账和实物对不上。
 *   在 equipmentAggregator（台账 + 预防性维护）之上，把设备管理深化为四个可对账维度：
 *
 *     - buildDeepEquipmentMgmt(now?)          深度设备管理总览：台账五段 + 维保 + 计量 + 折旧 一口汇总；
 *     - trackEquipmentLifecycle(id, now?)    单台设备全生命周期跟踪：采购→验收→入账→使用→报废 时间轴；
 *     - scheduleEquipmentMaintenance(id, now?) 维保计划：按保养周期推算下次保养日，逾期/即将到期预警；
 *     - calculateEquipmentDepreciation(id, asOf?) 折旧计算：年限平均/双倍余额递减/年数总和，产出净值。
 *
 * 设计说明：
 *   - 无库依赖纯函数内核，模块级内存台账预置一组「账实一致」的演示设备（asset_no 与实物对码、
 *     生命周期日期时序一致、维保/计量/折旧口径互相打通），生产可在路由层对接 clinical.medical_equipment；
 *   - now / asOf 均可注入以便单测，缺省取系统当天；resetDeepEquipmentStore() 供用例间隔离。
 *   - 不触碰 WebSocket；不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** 折旧方法：年限平均法 / 双倍余额递减法 / 年数总和法 */
export type DepreciationMethod = 'straight_line' | 'double_declining' | 'sum_of_years';

/** 台账五段生命周期 */
export type LifecycleStage = 'purchase' | 'acceptance' | 'capitalization' | 'in_use' | 'scrapped';

export const STAGE_LABEL: Record<LifecycleStage, string> = {
  purchase: '采购',
  acceptance: '验收',
  capitalization: '入账',
  in_use: '使用',
  scrapped: '报废',
};

/** 维修记录（故障跟踪：resolved=false 即带病运行） */
export interface RepairRecord {
  id: string;
  faultDate: string;
  faultDesc: string;
  cost: number;
  downtimeDays: number;
  resolved: boolean;
  resolvedDate: string | null;
  vendor: string;
}

/** 保养计划：按周期排程，lastDoneDate 起推下次保养日 */
export interface MaintenancePlan {
  cycleMonths: number;
  lastDoneDate: string;
  planType: string;
}

/** 单台深度设备台账（四维齐备） */
export interface DeepEquipment {
  id: string;
  /** 资产编号：与实物标签/固定资产卡对码，杜绝账实不符 */
  assetNo: string;
  name: string;
  model: string;
  manufacturer: string;
  dept: string;
  /* 维度①台账五段 */
  purchaseDate: string;
  acceptanceDate: string | null;
  capitalizationDate: string | null;
  putIntoUseDate: string | null;
  scrapDate: string | null;
  /* 资产原值 */
  originalValue: number;
  residualRate: number;
  /* 维度②维保 */
  maintenance: MaintenancePlan;
  repairs: RepairRecord[];
  /* 维度③计量（强检） */
  mandatoryInspection: boolean;
  inspectionCycleMonths: number;
  lastInspectionDate: string | null;
  inspectionCertificateNo: string | null;
  /* 维度④折旧 */
  depreciationMethod: DepreciationMethod;
  usefulLifeYears: number;
}

/** 生命周期单段状态 */
export interface LifecycleStageNode {
  stage: LifecycleStage;
  label: string;
  date: string | null;
  status: 'done' | 'current' | 'pending';
}

/** trackEquipmentLifecycle 返回 */
export interface LifecycleTrack {
  equipmentId: string;
  assetNo: string;
  name: string;
  stages: LifecycleStageNode[];
  currentStage: LifecycleStage;
  currentLabel: string;
  /** 投入使用至今天数；未投入使用为 null；已报废为报废前累计天数 */
  inUseDays: number | null;
  scrapped: boolean;
}

/** scheduleEquipmentMaintenance 返回 */
export interface MaintenanceSchedule {
  equipmentId: string;
  assetNo: string;
  name: string;
  planType: string;
  cycleMonths: number;
  lastDoneDate: string;
  nextDueDate: string;
  daysUntilDue: number;
  status: 'overdue' | 'due-soon' | 'on-track';
  overdueDays: number;
  suggestedAction: string;
}

/** calculateEquipmentDepreciation 返回 */
export interface DepreciationResult {
  equipmentId: string;
  assetNo: string;
  name: string;
  method: DepreciationMethod;
  methodLabel: string;
  originalValue: number;
  residualValue: number;
  usefulLifeYears: number;
  /** 首年折旧额（元） */
  annualDepreciation: number;
  /** 月折旧额（元，年限平均法口径） */
  monthlyDepreciation: number;
  /** 已计提月数（入账日起，封顶为折旧年限×12） */
  monthsElapsed: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  /** 年折旧率 */
  depreciationRate: number;
}

/* ============================== 常量与内存台账 ============================== */

/** 维保提前预警窗口（天）：距下次保养 <= 30 天即提醒 */
export const MAINTENANCE_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const STAGE_ORDER: LifecycleStage[] = ['purchase', 'acceptance', 'capitalization', 'in_use', 'scrapped'];

const deepEquipmentStore: DeepEquipment[] = [];

/* ------------------------------ 演示种子（账实一致） ------------------------------ */
function seedDemoFleet(): void {
  const fleet: DeepEquipment[] = [
    {
      id: 'eq_0001', assetNo: 'SB-2021-0001', name: '1.5T 磁共振成像系统', model: 'uMR560',
      manufacturer: '联影医疗', dept: '放射科',
      purchaseDate: '2021-03-10', acceptanceDate: '2021-03-25', capitalizationDate: '2021-04-01',
      putIntoUseDate: '2021-04-15', scrapDate: null,
      originalValue: 12_000_000, residualRate: 0.05,
      maintenance: { cycleMonths: 6, lastDoneDate: '2026-06-01', planType: '二级保养' },
      repairs: [
        { id: 'rp_0001', faultDate: '2025-11-12', faultDesc: '冷头噪声增大', cost: 38_000, downtimeDays: 2, resolved: true, resolvedDate: '2025-11-14', vendor: '联影维保' },
      ],
      mandatoryInspection: true, inspectionCycleMonths: 12, lastInspectionDate: '2025-09-10',
      inspectionCertificateNo: 'JL-2025-0888',
      depreciationMethod: 'straight_line', usefulLifeYears: 8,
    },
    {
      id: 'eq_0002', assetNo: 'SB-2021-0002', name: '64 排螺旋 CT', model: 'Revolution ACT',
      manufacturer: 'GE 医疗', dept: '放射科',
      purchaseDate: '2021-05-08', acceptanceDate: '2021-05-22', capitalizationDate: '2021-06-01',
      putIntoUseDate: '2021-06-10', scrapDate: null,
      originalValue: 8_500_000, residualRate: 0.05,
      maintenance: { cycleMonths: 6, lastDoneDate: '2026-01-15', planType: '二级保养' },
      repairs: [
        { id: 'rp_0002', faultDate: '2026-08-20', faultDesc: '球管散热报警', cost: 0, downtimeDays: 0, resolved: false, resolvedDate: null, vendor: 'GE 驻场' },
      ],
      mandatoryInspection: true, inspectionCycleMonths: 12, lastInspectionDate: '2025-06-20',
      inspectionCertificateNo: 'JL-2025-0451',
      depreciationMethod: 'straight_line', usefulLifeYears: 6,
    },
    {
      id: 'eq_0003', assetNo: 'SB-2022-0005', name: '全自动生化分析仪', model: 'cobas 8000',
      manufacturer: '罗氏诊断', dept: '检验科',
      purchaseDate: '2022-09-01', acceptanceDate: '2022-09-18', capitalizationDate: '2022-10-01',
      putIntoUseDate: '2022-10-08', scrapDate: null,
      originalValue: 1_200_000, residualRate: 0.05,
      maintenance: { cycleMonths: 3, lastDoneDate: '2026-07-01', planType: '一级保养' },
      repairs: [],
      mandatoryInspection: true, inspectionCycleMonths: 12, lastInspectionDate: '2025-10-15',
      inspectionCertificateNo: 'JL-2025-1120',
      depreciationMethod: 'double_declining', usefulLifeYears: 6,
    },
    {
      id: 'eq_0004', assetNo: 'SB-2020-0010', name: '彩色多普勒超声诊断仪', model: 'Resona 7',
      manufacturer: '迈瑞医疗', dept: '超声科',
      purchaseDate: '2020-04-20', acceptanceDate: '2020-05-06', capitalizationDate: '2020-05-15',
      putIntoUseDate: '2020-05-20', scrapDate: null,
      originalValue: 980_000, residualRate: 0.05,
      maintenance: { cycleMonths: 6, lastDoneDate: '2026-04-10', planType: '一级保养' },
      repairs: [
        { id: 'rp_0003', faultDate: '2025-12-02', faultDesc: '探头图像偶发条纹', cost: 12_000, downtimeDays: 1, resolved: true, resolvedDate: '2025-12-03', vendor: '迈瑞售后' },
      ],
      mandatoryInspection: true, inspectionCycleMonths: 12, lastInspectionDate: '2025-05-30',
      inspectionCertificateNo: 'JL-2025-0330',
      depreciationMethod: 'sum_of_years', usefulLifeYears: 8,
    },
    {
      id: 'eq_0005', assetNo: 'SB-2018-0211', name: '床旁多参数监护仪', model: 'BeneVision N12',
      manufacturer: '迈瑞医疗', dept: '急诊医学科',
      purchaseDate: '2018-06-01', acceptanceDate: '2018-06-20', capitalizationDate: '2018-07-01',
      putIntoUseDate: '2018-07-05', scrapDate: '2025-12-31',
      originalValue: 45_000, residualRate: 0.05,
      maintenance: { cycleMonths: 6, lastDoneDate: '2025-06-01', planType: '一级保养' },
      repairs: [
        { id: 'rp_0004', faultDate: '2025-03-11', faultDesc: 'SpO2 模块漂移', cost: 2_000, downtimeDays: 0, resolved: true, resolvedDate: '2025-03-11', vendor: '院内工程' },
      ],
      mandatoryInspection: false, inspectionCycleMonths: 12, lastInspectionDate: '2025-03-01',
      inspectionCertificateNo: null,
      depreciationMethod: 'straight_line', usefulLifeYears: 6,
    },
  ];
  deepEquipmentStore.push(...fleet);
}
seedDemoFleet();

/** 测试辅助：重置台账与种子（不对外暴露为业务 API） */
export function resetDeepEquipmentStore(): void {
  deepEquipmentStore.length = 0;
  seedDemoFleet();
}

/* ============================== 内部工具 ============================== */

function todayIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function parseAsOf(asOf?: string | Date): Date {
  if (!asOf) return new Date();
  if (asOf instanceof Date) return asOf;
  return isoToDate(asOf);
}

/** 日期加 n 个月，日号按目标月天数截断 */
function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + n, 1);
  const yyyy = dt.getFullYear();
  const mm = dt.getMonth();
  const dim = new Date(yyyy, mm + 1, 0).getDate();
  const dd = Math.min(d, dim);
  return `${yyyy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/** 两个 yyyy-mm-dd 之间的整月数（忽略日号），结果 >= 0 */
function monthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm] = fromIso.split('-').map(Number);
  const [ty, tm] = toIso.split('-').map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm));
}

/** 两个 yyyy-mm-dd 之间的整天数 */
function daysBetween(fromIso: string, toIso: string): number {
  const a = isoToDate(fromIso).getTime();
  const b = isoToDate(toIso).getTime();
  return Math.round((b - a) / DAY_MS);
}

function requireEquipment(equipmentId: string): DeepEquipment {
  const eq = deepEquipmentStore.find((e) => e.id === equipmentId);
  if (!eq) throw new Error(`设备不存在：${equipmentId}`);
  return eq;
}

/* ============================== 四个纯函数 ============================== */

/**
 * 单台设备全生命周期跟踪（纯函数）。
 * 按 采购→验收→入账→使用→报废 五段输出时间轴，已发生段标 done，最远一段为 current，
 * 其后段 pending；已报废设备当前段收敛到 scrapped。
 */
export function trackEquipmentLifecycle(equipmentId: string, now: Date = new Date()): LifecycleTrack {
  const eq = requireEquipment(equipmentId);
  const today = todayIso(now);

  const dateOf = (stage: LifecycleStage): string | null => {
    switch (stage) {
      case 'purchase': return eq.purchaseDate;
      case 'acceptance': return eq.acceptanceDate;
      case 'capitalization': return eq.capitalizationDate;
      case 'in_use': return eq.putIntoUseDate;
      case 'scrapped': return eq.scrapDate;
    }
  };

  // 已发生段：该段日期存在且不晚于今天
  const stages: LifecycleStageNode[] = STAGE_ORDER.map((stage) => {
    const date = dateOf(stage);
    const done = !!date && date <= today;
    return { stage, label: STAGE_LABEL[stage], date, status: done ? 'done' : 'pending' };
  });

  // 已报废：当前段直接是 scrapped；否则当前段为最后一个 done 段
  let currentStage: LifecycleStage = 'purchase';
  if (eq.scrapDate && eq.scrapDate <= today) {
    currentStage = 'scrapped';
  } else {
    for (const s of stages) if (s.status === 'done') currentStage = s.stage;
  }
  for (const s of stages) s.status = s.stage === currentStage && s.status === 'done'
    ? 'current'
    : s.status;

  // 投入使用天数：从 putIntoUse 到今天（未投入使用 null）；已报废则计到报废日
  let inUseDays: number | null = null;
  if (eq.putIntoUseDate) {
    const end = eq.scrapDate && eq.scrapDate <= today ? eq.scrapDate : today;
    inUseDays = daysBetween(eq.putIntoUseDate, end);
  }

  return {
    equipmentId: eq.id,
    assetNo: eq.assetNo,
    name: eq.name,
    stages,
    currentStage,
    currentLabel: STAGE_LABEL[currentStage],
    inUseDays,
    scrapped: currentStage === 'scrapped',
  };
}

/**
 * 维保计划排程（纯函数）。
 * 以最近一次保养日 + 保养周期推算下次保养日；已逾期标 overdue，提前窗口内 due-soon，其余 on-track。
 */
export function scheduleEquipmentMaintenance(equipmentId: string, now: Date = new Date()): MaintenanceSchedule {
  const eq = requireEquipment(equipmentId);
  const today = todayIso(now);
  const nextDue = addMonths(eq.maintenance.lastDoneDate, eq.maintenance.cycleMonths);
  const daysUntilDue = daysBetween(today, nextDue);

  let status: MaintenanceSchedule['status'];
  let overdueDays = 0;
  if (daysUntilDue < 0) {
    status = 'overdue';
    overdueDays = -daysUntilDue;
  } else if (daysUntilDue <= MAINTENANCE_WINDOW_DAYS) {
    status = 'due-soon';
  } else {
    status = 'on-track';
  }

  const openFaults = eq.repairs.filter((r) => !r.resolved).length;
  let suggestedAction: string;
  if (status === 'overdue') suggestedAction = `已逾期 ${overdueDays} 天，立即安排${eq.maintenance.planType}`;
  else if (status === 'due-soon') suggestedAction = `${daysUntilDue} 天内到期，提前预约${eq.maintenance.planType}`;
  else suggestedAction = `按计划于 ${nextDue} 执行${eq.maintenance.planType}`;
  if (openFaults > 0) suggestedAction += `；注意尚有 ${openFaults} 条未结故障，维保一并排查`;

  return {
    equipmentId: eq.id,
    assetNo: eq.assetNo,
    name: eq.name,
    planType: eq.maintenance.planType,
    cycleMonths: eq.maintenance.cycleMonths,
    lastDoneDate: eq.maintenance.lastDoneDate,
    nextDueDate: nextDue,
    daysUntilDue,
    status,
    overdueDays,
    suggestedAction,
  };
}

/**
 * 折旧计算（纯函数）。支持年限平均 / 双倍余额递减 / 年数总和三种方法，
 * 从入账日起计提，返回累计折旧与账面净值（不低于残值）。
 */
export function calculateEquipmentDepreciation(equipmentId: string, asOf?: string | Date): DepreciationResult {
  const eq = requireEquipment(equipmentId);
  const ref = parseAsOf(asOf);
  const today = todayIso(ref);

  const residualValue = round2(eq.originalValue * eq.residualRate);
  const depreciableBase = eq.originalValue - residualValue;
  const life = eq.usefulLifeYears;

  // 已计提月数：从入账日起，封顶为折旧年限×12；未入账按 0
  let monthsElapsed = 0;
  if (eq.capitalizationDate) {
    monthsElapsed = Math.min(monthsBetween(eq.capitalizationDate, today), life * 12);
  }

  let accumulated: number;
  let annualFirst: number;

  if (eq.depreciationMethod === 'straight_line') {
    annualFirst = depreciableBase / life;
    accumulated = (annualFirst / 12) * monthsElapsed;
  } else if (eq.depreciationMethod === 'double_declining') {
    const rate = 2 / life;
    let book = eq.originalValue;
    annualFirst = book * rate; // 首年折旧
    const fullYears = Math.floor(monthsElapsed / 12);
    for (let y = 0; y < life; y++) {
      if (y < fullYears) {
        // 最后一年直线拉到残值
        if (y === life - 1) {
          book = residualValue;
        } else {
          book = Math.max(residualValue, book - book * rate);
        }
      }
    }
    // 当年剩余月份
    const remMonths = monthsElapsed - fullYears * 12;
    let thisYearDep = book * rate * (remMonths / 12);
    book = Math.max(residualValue, book - thisYearDep);
    accumulated = eq.originalValue - book;
  } else {
    // sum_of_years 年数总和法
    const sumDigits = (life * (life + 1)) / 2;
    let book = eq.originalValue;
    annualFirst = depreciableBase * (life / sumDigits);
    const fullYears = Math.floor(monthsElapsed / 12);
    for (let y = 0; y < life; y++) {
      if (y < fullYears) {
        const digit = (life - y) / sumDigits;
        book -= depreciableBase * digit;
      }
    }
    const remMonths = monthsElapsed - fullYears * 12;
    const currentDigit = (life - fullYears) / sumDigits;
    book -= depreciableBase * currentDigit * (remMonths / 12);
    book = Math.max(residualValue, book);
    accumulated = eq.originalValue - book;
  }

  accumulated = round2(accumulated);
  const netBookValue = round2(Math.max(residualValue, eq.originalValue - accumulated));
  const monthly = eq.depreciationMethod === 'straight_line' ? round2((depreciableBase / life) / 12) : 0;

  return {
    equipmentId: eq.id,
    assetNo: eq.assetNo,
    name: eq.name,
    method: eq.depreciationMethod,
    methodLabel: eq.depreciationMethod === 'straight_line'
      ? '年限平均法'
      : eq.depreciationMethod === 'double_declining' ? '双倍余额递减法' : '年数总和法',
    originalValue: eq.originalValue,
    residualValue,
    usefulLifeYears: life,
    annualDepreciation: round2(annualFirst),
    monthlyDepreciation: monthly,
    monthsElapsed,
    accumulatedDepreciation: accumulated,
    netBookValue,
    depreciationRate: eq.depreciationMethod === 'straight_line'
      ? round2((1 - eq.residualRate) / life)
      : eq.depreciationMethod === 'double_declining' ? round2(2 / life) : round2((life + 1) / ((life * (life + 1)) / 2)),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 深度设备管理总览（纯函数）。
 * 一口汇总台账五段分布、维保预警/未结故障、计量证书到期、折旧净值，
 * 并对每台设备带出四个维度的即时结论——这就是「账实一致」的看板落点。
 */
export function buildDeepEquipmentMgmt(now: Date = new Date()): Record<string, unknown> {
  const today = todayIso(now);

  const byStage: Record<LifecycleStage, number> = {
    purchase: 0, acceptance: 0, capitalization: 0, in_use: 0, scrapped: 0,
  };
  let totalOriginal = 0;
  let totalAccumulated = 0;
  let openFaultCount = 0;
  let openFaultCost = 0;

  const maintenanceAlerts: MaintenanceSchedule[] = [];
  const expiredCerts: Array<{ equipmentId: string; assetNo: string; name: string; validUntil: string; overdueDays: number }> = [];
  const devices: Array<Record<string, unknown>> = [];

  for (const eq of deepEquipmentStore) {
    // 台账五段
    const life = trackEquipmentLifecycle(eq.id, now);
    byStage[life.currentStage] += 1;

    // 维保
    const sched = scheduleEquipmentMaintenance(eq.id, now);
    if (sched.status !== 'on-track') maintenanceAlerts.push(sched);
    for (const r of eq.repairs) if (!r.resolved) { openFaultCount += 1; openFaultCost += r.cost; }

    // 计量：上次检定日 + 周期 = 证书到期日
    if (eq.mandatoryInspection && eq.lastInspectionDate) {
      const validUntil = addMonths(eq.lastInspectionDate, eq.inspectionCycleMonths);
      const certOverdue = daysBetween(validUntil, today);
      if (certOverdue > 0) {
        expiredCerts.push({
          equipmentId: eq.id, assetNo: eq.assetNo, name: eq.name,
          validUntil, overdueDays: certOverdue,
        });
      }
    }

    // 折旧
    const dep = calculateEquipmentDepreciation(eq.id, today);
    totalOriginal += eq.originalValue;
    totalAccumulated += dep.accumulatedDepreciation;

    devices.push({
      equipmentId: eq.id,
      assetNo: eq.assetNo,
      name: eq.name,
      dept: eq.dept,
      manufacturer: eq.manufacturer,
      currentStage: life.currentStage,
      currentStageLabel: life.currentLabel,
      scrapped: life.scrapped,
      maintenance: {
        status: sched.status,
        nextDueDate: sched.nextDueDate,
        daysUntilDue: sched.daysUntilDue,
        openFaults: eq.repairs.filter((r) => !r.resolved).length,
      },
      metrology: {
        mandatory: eq.mandatoryInspection,
        certificateNo: eq.inspectionCertificateNo,
        lastInspectionDate: eq.lastInspectionDate,
      },
      depreciation: {
        method: dep.methodLabel,
        originalValue: dep.originalValue,
        accumulated: dep.accumulatedDepreciation,
        netBookValue: dep.netBookValue,
      },
    });
  }

  maintenanceAlerts.sort((a, b) => {
    const w = { overdue: 0, 'due-soon': 1, 'on-track': 2 };
    if (w[a.status] !== w[b.status]) return w[a.status] - w[b.status];
    return a.nextDueDate.localeCompare(b.nextDueDate);
  });

  return {
    generatedAt: new Date().toISOString(),
    ledger: {
      total: deepEquipmentStore.length,
      byStage,
      scrappedCount: byStage.scrapped,
      totalOriginalValue: round2(totalOriginal),
    },
    maintenance: {
      alerts: maintenanceAlerts,
      overdueCount: maintenanceAlerts.filter((a) => a.status === 'overdue').length,
      dueSoonCount: maintenanceAlerts.filter((a) => a.status === 'due-soon').length,
      openFaultCount,
      openFaultCost: round2(openFaultCost),
    },
    metrology: {
      mandatoryCount: deepEquipmentStore.filter((e) => e.mandatoryInspection).length,
      expiredCertCount: expiredCerts.length,
      expiredCerts,
    },
    depreciation: {
      totalOriginalValue: round2(totalOriginal),
      totalAccumulated: round2(totalAccumulated),
      totalNetBookValue: round2(totalOriginal - totalAccumulated),
    },
    devices,
    notice: '设备台账与实物按资产编号一一对应；未结故障与强检证书到期不隐藏，须闭环处置后方可销账。',
  };
}
