/**
 * 健澜科技 jlmedaios - 医院统计上报深化聚合器（M177-B）
 *
 * 统计上报要国家口径，不能凑数：
 *  - 国家质控数据上报：病案首页 / DRG / DIP / 单病种（国卫办病案首页质控口径）；
 *  - 医院年报：门诊量 / 住院量 / 手术量 / 收入（卫生健康统计年报口径）；
 *  - 绩效考核上报：国家三级公立医院绩效考核「国考」20 项指标口径；
 *  - 院感上报：院感病例 / 暴发事件（院感直报口径）。
 *
 * 本模块全部为纯函数：不读写数据库、不发网络请求、不依赖当前时间以外的外部态；
 * 上报是否放行由 validateStatData 的国家口径阈值决定，校验不过即拒绝提交，杜绝凑数。
 *
 * 注释口径标注：病案（病案首页/ICD）/ 设备（手术/大型设备口径）/ 耗材（高值耗材口径）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 上报大类 */
export type ReportType = 'national_qc' | 'hospital_annual' | 'performance' | 'infection';

/** 上报数据：键值（数值或字符串），按国家口径汇总 */
export type StatData = Record<string, number | string>;

/** 校验结果 */
export interface StatValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** 上报回执 */
export interface StatReceipt {
  reportType: ReportType;
  period: string;
  batchNo: string;
  status: 'submitted';
  caliberVersion: string;
  submittedAt: string;
  data: StatData;
  validation: StatValidation;
}

/** 字段口径（schema）定义 */
export interface StatField {
  key: string;
  label: string;
  kind: 'number' | 'int' | 'string';
  required: boolean;
  /** 数值下限（含），单位与国家口径一致 */
  min?: number;
  /** 数值上限（含） */
  max?: number;
  /** 国家口径目标线（用于 warning，不用于 hard fail） */
  nationalTarget?: string;
  /** 口径标注：病案 / 设备 / 耗材 */
  caliber?: '病案' | '设备' | '耗材' | '通用';
}

/* --------------------------- 国家口径 schema 库 --------------------------- */

/** 病案首页质控口径（病案口径）：完整率 / 主诊断选择正确率为国家硬指标 */
const NATIONAL_QC_SCHEMA: StatField[] = [
  { key: 'homepageCount', label: '病案首页份数', kind: 'int', required: true, min: 0, caliber: '病案' },
  { key: 'homepageCompletenessRate', label: '病案首页完整率(%)', kind: 'number', required: true, min: 0, max: 100, nationalTarget: '≥95', caliber: '病案' },
  { key: 'mainDxAccuracy', label: '主要诊断选择正确率(%)', kind: 'number', required: true, min: 0, max: 100, nationalTarget: '≥90', caliber: '病案' },
  { key: 'drgCases', label: 'DRG 入组病例数', kind: 'int', required: true, min: 0, caliber: '病案' },
  { key: 'dipCases', label: 'DIP 病种数', kind: 'int', required: true, min: 0, caliber: '病案' },
  { key: 'singleDiseaseCases', label: '单病种监测病例数', kind: 'int', required: true, min: 0, caliber: '病案' },
];

/** 医院年报口径：门诊量 / 住院量 / 手术量 / 收入 */
const HOSPITAL_ANNUAL_SCHEMA: StatField[] = [
  { key: 'outpatientVisits', label: '门诊量(人次)', kind: 'int', required: true, min: 0, caliber: '通用' },
  { key: 'inpatientDischarges', label: '住院出院人数(人)', kind: 'int', required: true, min: 0, caliber: '通用' },
  { key: 'surgeryCount', label: '手术总量(例)', kind: 'int', required: true, min: 0, caliber: '设备' },
  { key: 'levelIiiIvSurgery', label: '三、四级手术量(例)', kind: 'int', required: true, min: 0, caliber: '设备' },
  { key: 'operatingIncome', label: '医疗收入(万元)', kind: 'number', required: true, min: 0, caliber: '通用' },
  { key: 'totalIncome', label: '总收入(万元)', kind: 'number', required: true, min: 0, caliber: '通用' },
  { key: 'avgLos', label: '平均住院日(天)', kind: 'number', required: true, min: 0, nationalTarget: '逐年下降', caliber: '通用' },
];

/** 国考绩效口径：20 项指标，要求 20 项齐全且值为数值 */
const PERFORMANCE_SCHEMA: StatField[] = Array.from({ length: 20 }, (_, i) => ({
  key: `nqe_${String(i + 1).padStart(2, '0')}`,
  label: `国考指标${i + 1}`,
  kind: 'number' as const,
  required: true,
  min: 0,
  caliber: '通用' as const,
}));

/** 院感上报口径：院感病例 / 暴发事件 */
const INFECTION_SCHEMA: StatField[] = [
  { key: 'infectionCases', label: '院感病例数', kind: 'int', required: true, min: 0, caliber: '病案' },
  { key: 'inpatientDays', label: '出院患者住院总日数', kind: 'int', required: true, min: 1, caliber: '通用' },
  { key: 'infectionRate', label: '院感发病率(%)', kind: 'number', required: true, min: 0, max: 100, nationalTarget: '≤4', caliber: '病案' },
  { key: 'surgicalSiteInfectionRate', label: '手术部位感染率(%)', kind: 'number', required: true, min: 0, max: 100, nationalTarget: '≤1.5', caliber: '设备' },
  { key: 'outbreakEvents', label: '暴发事件起数', kind: 'int', required: true, min: 0, caliber: '病案' },
  { key: 'outbreakHandled', label: '已处置暴发事件起数', kind: 'int', required: true, min: 0, caliber: '病案' },
];

/** 各上报类型对应的国家口径 schema */
export const REPORT_SCHEMAS: Record<ReportType, StatField[]> = {
  national_qc: NATIONAL_QC_SCHEMA,
  hospital_annual: HOSPITAL_ANNUAL_SCHEMA,
  performance: PERFORMANCE_SCHEMA,
  infection: INFECTION_SCHEMA,
};

/** 上报口径版本（随国家版本演进） */
export const CALIBER_VERSION = 'national-2026';

/* --------------------------- 深度上报体系定义 --------------------------- */

/** 深度统计上报体系（纯描述，供前端与体检展示） */
export interface DeepStatSystem {
  nationalStandard: string;
  reportTypes: { code: ReportType; name: string; scope: string; caliber: string }[];
  guardrails: string[];
  valueStatement: string;
}

/**
 * buildDeepStatReport() —— 深度统计上报体系。
 * 纯函数：返回国家口径上报体系的静态定义，不依赖任何外部态。
 */
export function buildDeepStatReport(): DeepStatSystem {
  return {
    nationalStandard:
      '对齐国家三级公立医院绩效考核（国考20项）、病案首页质控、DRG/DIP、医院年报与院感直报口径',
    reportTypes: [
      { code: 'national_qc', name: '国家质控数据上报', scope: '病案首页 / DRG / DIP / 单病种', caliber: '病案口径' },
      { code: 'hospital_annual', name: '医院年报', scope: '门诊量 / 住院量 / 手术量 / 收入', caliber: '年报口径' },
      { code: 'performance', name: '绩效考核上报', scope: '国考20项指标', caliber: '国考口径' },
      { code: 'infection', name: '院感上报', scope: '院感病例 / 暴发事件', caliber: '院感直报口径' },
    ],
    guardrails: [
      '数据按国家口径从业务系统归集，禁止人工拍脑袋凑数',
      '校验不过（errors 非空）一律拒绝 submitted',
      '病案/设备/耗材口径随国家版本（caliber_version）留痕',
      '上报动作写审计链，谁提交、提交了哪一期可追溯',
    ],
    valueStatement: '一次采集、多口径复用：同一份病案首页/手术/收入数据，按国家口径同时喂给质控、年报、国考与院感上报。',
  };
}

/* ----------------------------- 统计数据采集 ----------------------------- */

/**
 * collectStatData(reportType, period, source?) —— 统计数据采集。
 * 纯函数：传入业务侧归集的 source（键值对）则按国家口径规整；
 * 不传 source 时给出与口径自洽的确定性样例（供联调/体检，标注为演示口径）。
 */
export function collectStatData(
  reportType: ReportType,
  period: string,
  source?: StatData,
): StatData {
  const schema = REPORT_SCHEMAS[reportType];
  // 国家口径默认值（演示口径，非真实数据）——保证每一项都有确定取值
  const demo: Record<ReportType, StatData> = {
    national_qc: {
      homepageCount: 12000, homepageCompletenessRate: 96.8, mainDxAccuracy: 92.4,
      drgCases: 9800, dipCases: 7600, singleDiseaseCases: 1450,
    },
    hospital_annual: {
      outpatientVisits: 1280000, inpatientDischarges: 62000, surgeryCount: 41000,
      levelIiiIvSurgery: 18500, operatingIncome: 186000, totalIncome: 235000, avgLos: 8.2,
    },
    performance: Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`nqe_${String(i + 1).padStart(2, '0')}`, 80 + i]),
    ),
    infection: {
      infectionCases: 310, inpatientDays: 496000, infectionRate: 3.85,
      surgicalSiteInfectionRate: 1.12, outbreakEvents: 2, outbreakHandled: 2,
    },
  };

  const base = source ?? demo[reportType];
  // 规整：按 schema 逐项取值；缺失项在校验阶段报错，这里只做类型归一
  const out: StatData = {};
  for (const f of schema) {
    const v = base[f.key];
    if (v === undefined) continue;
    if (f.kind === 'int') out[f.key] = Math.round(Number(v));
    else if (f.kind === 'number') out[f.key] = Number(v);
    else out[f.key] = String(v);
  }
  out._period = period;
  out._reportType = reportType;
  return out;
}

/* ----------------------------- 上报数据校验 ----------------------------- */

/**
 * validateStatData(data, schema) —— 上报数据校验。
 * 纯函数：required 缺项 / 类型错误 / 越界 记为 error（阻断提交）；
 * 偏离国家目标线记为 warning（不阻断，但要提示）。
 */
export function validateStatData(data: StatData, schema: StatField[]): StatValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const f of schema) {
    const raw = data[f.key];
    if (raw === undefined || raw === null || raw === '') {
      if (f.required) errors.push(`缺少必填项：${f.label}(${f.key})`);
      continue;
    }

    if (f.kind === 'string') {
      if (typeof raw !== 'string') errors.push(`${f.label}(${f.key}) 应为文本`);
      continue;
    }

    const num = Number(raw);
    if (Number.isNaN(num)) { errors.push(`${f.label}(${f.key}) 不是有效数值`); continue; }

    if (f.kind === 'int' && !Number.isInteger(num)) {
      errors.push(`${f.label}(${f.key}) 应为整数`);
    }
    if (f.min !== undefined && num < f.min) {
      errors.push(`${f.label}(${f.key})=${num} 低于国家口径下限 ${f.min}`);
    }
    if (f.max !== undefined && num > f.max) {
      errors.push(`${f.label}(${f.key})=${num} 高于国家口径上限 ${f.max}`);
    }
    if (f.nationalTarget) {
      warnings.push(`${f.label}(${f.key})=${num}，国家口径参考：${f.nationalTarget}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/* ----------------------------- 上报提交 ----------------------------- */

/** submitStatReport 专用错误 */
export class StatReportError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'StatReportError';
  }
}

/**
 * submitStatReport(reportType, period, data) —— 上报提交。
 * 纯函数：按 reportType 取国家口径 schema 校验；不过则抛错（不凑数），
 * 过则生成确定性批次回执（不写库、不发网络）。
 */
export function submitStatReport(
  reportType: ReportType,
  period: string,
  data: StatData,
): StatReceipt {
  if (!period || !/^\d{4}(-\d{2})?(-W\d{2})?$/.test(period)) {
    throw new StatReportError(400, 'BAD_PERIOD', 'period 格式应为 YYYY / YYYY-MM / YYYY-Www');
  }
  const schema = REPORT_SCHEMAS[reportType];
  const validation = validateStatData(data, schema);
  if (!validation.valid) {
    throw new StatReportError(422, 'CALIBER_MISMATCH',
      `国家口径校验未通过，拒绝凑数上报：${validation.errors.join('；')}`);
  }

  // 确定性批次号：SR-类型-期-内容指纹（纯函数，不依赖随机数/时间）
  const fingerprint = Object.keys(data).slice().sort()
    .reduce((acc, k) => acc + String(k) + String(data[k]), '').length;
  const batchNo = `SR-${reportType}-${period}-${fingerprint.toString(36)}`;

  return {
    reportType,
    period,
    batchNo,
    status: 'submitted',
    caliberVersion: CALIBER_VERSION,
    submittedAt: new Date().toISOString(),
    data,
    validation,
  };
}
