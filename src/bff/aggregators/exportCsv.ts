/**
 * 健澜科技 jlmedaios - 数据导出中心 CSV 纯函数
 *
 * 统一把质控报表 / DRG 结算 / 科室 KPI 三类业务行序列化为带 BOM 的 UTF-8 CSV：
 *  - toCsv：二维行 → CSV 字符串（RFC4180 转义 + ﻿ BOM，Excel 中文不乱码）；
 *  - buildQcReportCsv：全院病历质控单明细；
 *  - buildDrgReportCsv：DRG 分组结算结果明细；
 *  - buildDeptKpiCsv：科室当日 KPI（可多行多科室）。
 *
 * 设计原则：
 *  - 纯函数、零依赖、不引入 Excel 库（CSV 即交付格式）；
 *  - 字段含逗号 / 双引号 / 换行时整体用双引号包裹，内部双引号 doubling；
 *  - null/undefined 一律输出空单元格，不臆造 0；
 *  - BOM 只加一次，由 toCsv 统一负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** UTF-8 BOM 头：Excel 双击打开 .csv 时按 UTF-8 解码，避免中文乱码 */
export const CSV_BOM = '﻿';

/** 可写入单元格的原始值类型 */
export type CsvCell = string | number | boolean | null | undefined;

/**
 * RFC4180 单元格转义：
 *  - null/undefined → 空串；
 *  - 含逗号、双引号、回车或换行 → 双引号包裹，内部双引号 doubled（""）；
 *  - 其余原样输出。
 */
export function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = value as string;
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * 二维行 → CSV 字符串（统一前置 BOM，行间 CRLF 结尾）。
 *
 * @param rows 二维单元格数组；rows[0] 通常是表头。空数组时仅输出 BOM（空表）。
 * @returns 带 ﻿ 前缀、CRLF 换行的完整 CSV 文本。
 *
 * @example
 * toCsv([['姓名', '科室'], ['张三', '内科']]);
 * // ﻿姓名,内科\r\n张三,内科\r\n
 */
export function toCsv(rows: CsvCell[][]): string {
  const body = rows
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n');
  // 空表也保留 BOM，便于 Excel 识别编码
  return CSV_BOM + (body ? body + '\r\n' : '');
}

/* -------------------------------------------------------------------------- */
/* 质控报表                                                                    */
/* -------------------------------------------------------------------------- */

/** 质控报表导出行（与 medicalQcRepo.MedicalQc 对齐的扁平视图） */
export interface QcReportRecord {
  /** 质控单 ID */
  id: string;
  /** 就诊 ID */
  visitId: string;
  /** 质控类型（round 查房 / terminal 终末…） */
  qcType: string;
  /** 质控人 */
  checker: string;
  /** 检查日期（ISO 或 yyyy-mm-dd） */
  checkDate: string;
  /** 质控得分（0-100，可空） */
  score: number | null;
  /** 缺陷条数 */
  errorCount: number;
  /** 状态 pending/rectified/confirmed */
  status: string;
  /** 整改建议（可空） */
  suggestions: string | null;
}

/** 质控单状态 → 中文展示 */
const QC_STATUS_LABEL: Record<string, string> = {
  pending: '待整改',
  rectified: '已整改',
  confirmed: '已确认',
};

/** 病历质控单明细 → CSV */
export function buildQcReportCsv(records: QcReportRecord[]): string {
  const header = ['质控单ID', '就诊ID', '质控类型', '质控人', '检查日期', '得分', '缺陷数', '状态', '整改建议'];
  const rows = records.map((r) => [
    r.id,
    r.visitId,
    r.qcType,
    r.checker,
    r.checkDate,
    r.score ?? '',
    r.errorCount,
    QC_STATUS_LABEL[r.status] ?? r.status,
    r.suggestions ?? '',
  ]);
  return toCsv([header, ...rows]);
}

/* -------------------------------------------------------------------------- */
/* DRG 结算报表                                                                */
/* -------------------------------------------------------------------------- */

/** DRG 结算导出行（与 drgRepo.DrgResultListRow 对齐） */
export interface DrgExportRow {
  visitId: string;
  visitNo: string;
  patientName: string;
  department: string;
  primaryDxCode: string | null;
  groupCode: string;
  groupName: string | null;
  weight: string;
  estimatedPayment: string;
  totalFee: string | null;
  balance: string | null;
  status: string;
  updatedAt: string;
}

/** DRG 状态 → 中文展示 */
const DRG_STATUS_LABEL: Record<string, string> = {
  grouped: '已分组',
  confirmed: '已确认',
  rejected: '已退回',
};

/** DRG 分组结算结果明细 → CSV */
export function buildDrgReportCsv(rows: DrgExportRow[]): string {
  const header = [
    '就诊ID',
    '住院号',
    '患者姓名',
    '科室',
    '主诊断ICD',
    'DRG病组编码',
    '病组名称',
    '权重',
    '预估付费(元)',
    '实际费用(元)',
    '结余(元)',
    '状态',
    '更新时间',
  ];
  const body = rows.map((r) => [
    r.visitId,
    r.visitNo,
    r.patientName,
    r.department,
    r.primaryDxCode ?? '',
    r.groupCode,
    r.groupName ?? '',
    r.weight,
    r.estimatedPayment,
    r.totalFee ?? '',
    r.balance ?? '',
    DRG_STATUS_LABEL[r.status] ?? r.status,
    r.updatedAt,
  ]);
  return toCsv([header, ...body]);
}

/* -------------------------------------------------------------------------- */
/* 科室 KPI 报表                                                              */
/* -------------------------------------------------------------------------- */

/** 科室 KPI 导出行（与 deptCockpitAggregator.DeptKpis 对齐的扁平行，可多科室） */
export interface DeptKpiExportRow {
  /** 科室名称 */
  deptName: string;
  /** 统计日期 yyyy-mm-dd */
  date: string;
  /** true = 演示数据（repo 无真实聚合） */
  demo: boolean;
  /** 床位周转率（次/日），空表示无床位来源 */
  bedTurnoverRate: number | null;
  /** 平均住院日（天） */
  avgLod: number | null;
  /** 次均费用（元） */
  avgCost: number | null;
  /** 甲级病历率（0-1，导出为百分数字符串） */
  gradeARate: number | null;
}

/** 科室当日 KPI → CSV（支持多科室多行） */
export function buildDeptKpiCsv(rows: DeptKpiExportRow[]): string {
  const header = ['科室', '统计日期', '数据来源', '床位周转率(次/日)', '平均住院日(天)', '次均费用(元)', '甲级病历率'];
  const body = rows.map((r) => [
    r.deptName,
    r.date,
    r.demo ? '演示数据' : '真实数据',
    r.bedTurnoverRate ?? '',
    r.avgLod ?? '',
    r.avgCost ?? '',
    r.gradeARate == null ? '' : `${(r.gradeARate * 100).toFixed(0)}%`,
  ]);
  return toCsv([header, ...body]);
}
