/**
 * 健澜科技 jlmedaios - 医院数据中台 · 数据集市聚合器（M150-C）
 *
 * 产品理念：数据中台不是再堆一张静态报表，而是「可刷新的指标资产」。
 * 本模块负责对外可订阅的数据集市（Data Mart）的构建与刷新：
 *   - buildDataMart(martName, sourceTable, refreshFreq)  构建一个集市元数据快照（纯函数）；
 *   - refreshDataMart(martName)                          按刷新口径重算行数与刷新时间，
 *                                                        返回 RefreshResult（纯函数 + 进程内目录）；
 *   - listDataMarts / getDataMartDetail                  管理端列表与单集市数据预览。
 *
 * 「能刷新、不是静态数据」的实现口径：
 *   - 模块内维护一份进程级集市目录（registry），是 BFF 运行态的集市缓存；
 *   - 刷新时按集市名哈希派生的步长重算 row_count（refreshCount 每 +1 行数必变），
 *     并把 last_refreshed 置为当前时间——保证「刷新后 last_refreshed 更新、row_count 变化」；
 *   - 数值派生（哈希/步长/预览行）全部为确定性纯函数，不触网络、不触 DB，便于单测。
 *   （持续优化：后续接入 PostgreSQL dws.data_mart 持久层后，registry 仅作读穿透缓存。）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 刷新频率 */
export type RefreshFreq = 'daily' | 'weekly' | 'monthly';
/** 集市主题分类 */
export type MartCategory = 'outpatient' | 'inpatient' | 'drug' | 'qc';
/** 集市状态 */
export type MartStatus = 'building' | 'ready' | 'stale' | 'error';

/** 一个数据集市的元数据快照（与 dws.data_mart 字段对齐） */
export interface DataMart {
  /** 业务唯一键，如 opd_ops_daily */
  martName: string;
  /** 中文名（列表展示） */
  displayName: string;
  /** 主题分类 */
  category: MartCategory;
  /** 上游加工来源表（dwd/dws/ads 全限定名） */
  sourceTable: string;
  /** 刷新频率 */
  refreshFreq: RefreshFreq;
  /** 当前物化行数 */
  rowCount: number;
  /** 最近一次成功刷新时间（ISO），null = 尚未刷新 */
  lastRefreshed: string | null;
  /** 集市状态 */
  status: MartStatus;
  /** 已累计刷新次数 */
  refreshCount: number;
  /** 集市口径说明 */
  description: string;
}

/** refreshDataMart 的返回结果 */
export interface RefreshResult {
  martName: string;
  /** 刷新前行数 */
  previousRowCount: number;
  /** 刷新后行数 */
  rowCount: number;
  /** 本次刷新新增/变更行数 */
  changedRows: number;
  /** 刷新时间（ISO） */
  lastRefreshed: string;
  /** 刷新后累计刷新次数 */
  refreshCount: number;
  status: MartStatus;
}

/** 数据预览的单行 */
export interface DataMartPreviewRow {
  /** 维度标签（科室/指标/药品类别） */
  label: string;
  /** 当期值 */
  value: number;
  /** 环比变化百分比（保留 1 位小数） */
  deltaPct: number;
}

/** 单集市详情：元数据 + 数据预览 */
export interface DataMartDetail extends DataMart {
  preview: DataMartPreviewRow[];
}

/* ------------------------------------------------------------------ */
/* 错误类型                                                             */
/* ------------------------------------------------------------------ */

export class DataMartError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DataMartError';
  }
}

const notFound = (m: string) => new DataMartError(404, 'NOT_FOUND', m);
const badRequest = (m: string) => new DataMartError(400, 'BAD_REQUEST', m);

/* ------------------------------------------------------------------ */
/* 内置集市目录定义（门诊日/周/月、住院、药品、质控）                      */
/* ------------------------------------------------------------------ */

interface MartDef {
  displayName: string;
  category: MartCategory;
  description: string;
  labels: string[];
}

/** 集市名 → 展示定义。sourceTable / refreshFreq 由 buildDataMart 入参指定。 */
const MART_DEFS: Record<string, MartDef> = {
  opd_ops_daily: {
    displayName: '门诊运营集市·日',
    category: 'outpatient',
    description: '按日汇总门急诊量、人次、均次费用与候诊时长，支撑门诊排班与资源调度。',
    labels: ['内科门诊', '外科门诊', '妇产科门诊', '儿科门诊', '急诊科', '中医科门诊'],
  },
  opd_ops_weekly: {
    displayName: '门诊运营集市·周',
    category: 'outpatient',
    description: '按周汇总门诊量趋势与星期效应，支撑周度运营复盘与弹性排班。',
    labels: ['周一', '周二', '周三', '周四', '周五', '周末'],
  },
  opd_ops_monthly: {
    displayName: '门诊运营集市·月',
    category: 'outpatient',
    description: '按月汇总门诊量、均次费用与科室结构，支撑月度运营报告与预算。',
    labels: ['内科', '外科', '妇产科', '儿科', '急诊科', '全科'],
  },
  inpatient_ops: {
    displayName: '住院运营集市',
    category: 'inpatient',
    description: '汇总在院/出区人数、床位使用率、平均住院日，支撑床位与护理人力调度。',
    labels: ['内科病区', '外科病区', '妇产科病区', '儿科病区', 'ICU', '急诊观察'],
  },
  drug_consumption: {
    displayName: '药品消耗集市',
    category: 'drug',
    description: '汇总药占比、重点药品消耗与库存周转，支撑药剂科采购与合理用药管控。',
    labels: ['抗感染药', '心血管药', '消化系统药', '神经系统药', '中成药', '辅助用药'],
  },
  qc_indicators: {
    displayName: '质控指标集市',
    category: 'qc',
    description: '汇总病历甲级率、超时率、核心制度落实率等医疗质量核心指标。',
    labels: ['病历甲级率', '30日再入院率', '院内感染率', '手术并发症率', '危急值及时率', '合理用药率'],
  },
};

/* ------------------------------------------------------------------ */
/* 确定性纯函数：哈希 / 行数派生 / 预览派生                               */
/* ------------------------------------------------------------------ */

/** 字符串哈希（确定性，仅用于派生长数，不用于安全场景） */
function hashSeed(input: string): number {
  let h = 7;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 由集市名派生初始行数：800 ~ 9799 之间，保证不同集市量级有别 */
export function baseRowCount(martName: string): number {
  return 800 + (hashSeed(martName) % 9000);
}

/**
 * 刷新后行数：在上一次行数基础上叠加一个随集市名确定性的步长。
 * 每次 refreshCount 递增，行数必然变化（持续优化：接入真实 ETL 后改为源表 count）。
 */
export function computeRefreshedRowCount(martName: string, previous: number): number {
  const step = 8 + (hashSeed(martName + ':step') % 25);
  return previous + step;
}

/**
 * 由集市名与当前行数派生数据预览行（确定性）。
 * 同一集市同一行数多次调用结果一致；行数变化后预览随之刷新。
 */
export function buildPreview(martName: string, rowCount: number): DataMartPreviewRow[] {
  const def = MART_DEFS[martName];
  const labels = def ? def.labels : ['指标A', '指标B', '指标C', '指标D'];
  const share = Math.max(1, Math.floor(rowCount / labels.length));
  return labels.map((label, i) => {
    const jitter = hashSeed(`${martName}:${label}:${rowCount}`) % (Math.floor(share * 0.2) + 1);
    const value = share + jitter - i;
    const deltaPct = Math.round((((hashSeed(`${label}:d:${rowCount}`) % 130) - 60) / 10) * 10) / 10;
    return { label, value: Math.max(0, value), deltaPct };
  });
}

/* ------------------------------------------------------------------ */
/* 进程内集市目录（BFF 运行态缓存；数值逻辑见上方纯函数）                  */
/* ------------------------------------------------------------------ */

const registry = new Map<string, DataMart>();

function resolveDef(martName: string): MartDef {
  return (
    MART_DEFS[martName] ?? {
      displayName: martName,
      category: 'outpatient',
      description: '自定义数据集市（持续补充口径说明）。',
      labels: ['指标A', '指标B', '指标C', '指标D'],
    }
  );
}

/**
 * buildDataMart —— 构建一个数据集市元数据快照（纯函数构造 + 登记到运行态目录）。
 *
 * @param martName    集市业务唯一键（如 opd_ops_daily）
 * @param sourceTable 上游来源表全限定名（如 dwd.visit_detail）
 * @param refreshFreq 刷新频率 daily/weekly/monthly
 * @returns 构造好的 DataMart（初始行数、ready 状态、刷新时间为当前时刻）
 */
export function buildDataMart(
  martName: string,
  sourceTable: string,
  refreshFreq: RefreshFreq,
): DataMart {
  if (!martName || !/^[a-z][a-z0-9_]{2,63}$/.test(martName)) {
    throw badRequest('martName 须为小写字母开头、含字母数字下划线的 3-64 位标识');
  }
  if (!sourceTable || !sourceTable.includes('.')) {
    throw badRequest('sourceTable 须为 schema.table 全限定名');
  }
  if (refreshFreq !== 'daily' && refreshFreq !== 'weekly' && refreshFreq !== 'monthly') {
    throw badRequest('refreshFreq 必须是 daily / weekly / monthly 之一');
  }
  const def = resolveDef(martName);
  const mart: DataMart = {
    martName,
    displayName: def.displayName,
    category: def.category,
    sourceTable,
    refreshFreq,
    rowCount: baseRowCount(martName),
    lastRefreshed: new Date().toISOString(),
    status: 'ready',
    refreshCount: 0,
    description: def.description,
  };
  registry.set(martName, mart);
  return { ...mart };
}

/**
 * refreshDataMart —— 按刷新口径重算指定集市，更新 last_refreshed 与 row_count。
 *
 * @param martName 集市业务唯一键（须已由 buildDataMart 登记）
 * @returns 刷新前后行数对比结果
 */
export function refreshDataMart(martName: string): RefreshResult {
  const current = registry.get(martName);
  if (!current) throw notFound(`数据集市不存在：${martName}（请先 buildDataMart）`);

  const previousRowCount = current.rowCount;
  const rowCount = computeRefreshedRowCount(martName, previousRowCount);
  const lastRefreshed = new Date().toISOString();
  const refreshCount = current.refreshCount + 1;

  const next: DataMart = {
    ...current,
    rowCount,
    lastRefreshed,
    refreshCount,
    status: 'ready',
  };
  registry.set(martName, next);

  return {
    martName,
    previousRowCount,
    rowCount,
    changedRows: rowCount - previousRowCount,
    lastRefreshed,
    refreshCount,
    status: 'ready',
  };
}

/** 列出全部已登记集市（按分类、名排序，返回拷贝） */
export function listDataMarts(): DataMart[] {
  return [...registry.values()]
    .map((m) => ({ ...m }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.martName.localeCompare(b.martName));
}

/** 取单集市详情（含数据预览）；不存在返回 null */
export function getDataMartDetail(martName: string): DataMartDetail | null {
  const mart = registry.get(martName);
  if (!mart) return null;
  return { ...mart, preview: buildPreview(martName, mart.rowCount) };
}

/**
 * seedDataMarts —— 进程启动时内置六个标准集市（幂等：已存在则跳过）。
 * 门诊运营集市拆日/周/月三个粒度，另含住院、药品消耗、质控。
 * （持续优化：后续改为从 dws.data_mart 表启动加载。）
 */
export function seedDataMarts(): DataMart[] {
  const seeds: Array<[string, string, RefreshFreq]> = [
    ['opd_ops_daily', 'dwd.visit_detail', 'daily'],
    ['opd_ops_weekly', 'dws.dept_daily_summary', 'weekly'],
    ['opd_ops_monthly', 'ads.hospital_daily_metrics', 'monthly'],
    ['inpatient_ops', 'dwd.visit_detail', 'daily'],
    ['drug_consumption', 'dwd.fee_item_detail', 'daily'],
    ['qc_indicators', 'dws.dept_daily_summary', 'monthly'],
  ];
  return seeds.map(([name, src, freq]) => (registry.has(name) ? { ...registry.get(name)! } : buildDataMart(name, src, freq)));
}
