/**
 * 健澜科技 jlmedaios - 数据报表导出聚合器（M138-D 新业务场景）
 *
 * 统一对外提供「报表中心」导出能力：
 *   - exportReport(reportType, filters, format)：按报表类型 + 筛选条件产出导出结果（纯函数）；
 *   - generateCsv(data, headers)：通用「对象数组 + 表头定义」→ 带 BOM 的 UTF-8 CSV（纯函数）。
 *
 * 报表类型：门诊日报 / 住院日报 / 处方统计 / 质控月报。
 * 导出格式：CSV（text/csv）/ Excel（零依赖，产出 Excel 可直接打开的 .xls 表格）。
 *
 * 性能（大数据量不卡死）：
 *   - 全量结果先在内存中按页切片（page / pageSize），导出只渲染「当前页」数据，
 *     避免一次性把整张大表序列化进响应；真实落地时此处替换为分页 SQL（LIMIT/OFFSET）即可。
 *   - 本聚合器不访问数据库，输出 demo:true 的确定性演示数据，便于单测与前端预览。
 *
 * 设计原则：纯函数、零新增依赖；null/undefined 一律空单元格，不臆造 0；
 * CSV 遵循 RFC4180 转义并前置 ﻿ BOM，保证 Excel 打开中文不乱码。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* -------------------------------------------------------------------------- */
/* 类型定义                                                                    */
/* -------------------------------------------------------------------------- */

/** 报表类型枚举（与前端 type=xxx 对齐） */
export type ReportType = 'opd_daily' | 'inp_daily' | 'rx_stat' | 'qc_monthly';

/** 导出格式枚举 */
export type ExportFormat = 'csv' | 'excel';

/** 表头定义：key 对应数据对象字段，title 为导出列中文名 */
export interface ReportHeader {
  key: string;
  title: string;
}

/** 导出筛选条件（全部可选，宽松筛选——非法值忽略而非报错） */
export interface ReportFilters {
  /** 起始日期 yyyy-mm-dd（演示数据仅用于稳定派生） */
  startDate?: string;
  /** 截止日期 yyyy-mm-dd */
  endDate?: string;
  /** 科室名（精确包含匹配，空=全部科室） */
  department?: string;
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页行数，默认 500，上限 5000 */
  pageSize?: number;
}

/** exportReport 的返回结果 */
export interface ExportResult {
  /** 报表类型 */
  reportType: ReportType;
  /** 报表中文名 */
  reportName: string;
  /** 导出格式 */
  format: ExportFormat;
  /** 建议下载文件名 */
  filename: string;
  /** HTTP Content-Type */
  contentType: string;
  /** 导出正文（CSV 文本 或 Excel .xls 表格文本） */
  content: string;
  /** 当前页数据行数 */
  rowCount: number;
  /** 满足筛选条件的总行数（分页依据） */
  totalRows: number;
  /** 当前页码 */
  page: number;
  /** 每页行数 */
  pageSize: number;
  /** 是否演示数据 */
  demo: boolean;
  /** 生成时间（ISO） */
  generatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* 报表元数据                                                                  */
/* -------------------------------------------------------------------------- */

/** 各报表类型 → 中文名 + 表头定义 */
const REPORT_META: Record<ReportType, { name: string; headers: ReportHeader[] }> = {
  // 新业务场景：门诊日报
  opd_daily: {
    name: '门诊日报',
    headers: [
      { key: 'date', title: '日期' },
      { key: 'department', title: '科室' },
      { key: 'visitCount', title: '接诊人次' },
      { key: 'erCount', title: '急诊人次' },
      { key: 'avgWaitMin', title: '平均候诊(分)' },
      { key: 'avgFee', title: '次均费用(元)' },
    ],
  },
  // 新业务场景：住院日报
  inp_daily: {
    name: '住院日报',
    headers: [
      { key: 'date', title: '日期' },
      { key: 'department', title: '科室' },
      { key: 'inHospital', title: '在院人数' },
      { key: 'newAdmit', title: '新入院' },
      { key: 'discharged', title: '出院' },
      { key: 'occupiedBeds', title: '占用床位' },
      { key: 'avgLodDays', title: '平均住院日(天)' },
    ],
  },
  // 新业务场景：处方统计
  rx_stat: {
    name: '处方统计',
    headers: [
      { key: 'month', title: '月份' },
      { key: 'department', title: '科室' },
      { key: 'rxCount', title: '处方数' },
      { key: 'antibioticPct', title: '抗菌药占比(%)' },
      { key: 'injectionPct', title: '注射剂占比(%)' },
      { key: 'essentialDrugPct', title: '基本药物占比(%)' },
    ],
  },
  // 新业务场景：质控月报
  qc_monthly: {
    name: '质控月报',
    headers: [
      { key: 'month', title: '月份' },
      { key: 'department', title: '科室' },
      { key: 'sampledRecords', title: '抽查病历' },
      { key: 'gradeARatePct', title: '甲级率(%)' },
      { key: 'defectCount', title: '缺陷条数' },
      { key: 'rectifyPct', title: '整改率(%)' },
    ],
  },
};

/** 支持的报表类型（供路由校验与前端枚举） */
export const REPORT_TYPES: ReportType[] = Object.keys(REPORT_META) as ReportType[];

/** 合成科室池 */
const DEPARTMENTS = ['内科', '外科', '妇产科', '儿科', '心内科', '骨科', '急诊科', '神经内科'];

/** 每页行数默认值与上限（大数据量分页保护） */
export const DEFAULT_PAGE_SIZE = 500;
export const MAX_PAGE_SIZE = 5000;

/* -------------------------------------------------------------------------- */
/* 确定性伪随机（纯函数，保证同一输入输出稳定，便于单测）                        */
/* -------------------------------------------------------------------------- */

/** mulberry32：由整数种子产生确定性伪随机序列 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 由字符串（报表类型+日期）派生一个稳定整数种子 */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* -------------------------------------------------------------------------- */
/* CSV 序列化（generateCsv）                                                   */
/* -------------------------------------------------------------------------- */

/** UTF-8 BOM：Excel 双击打开 .csv 时按 UTF-8 解码，避免中文乱码 */
export const CSV_BOM = '﻿';

/**
 * RFC4180 单元格转义：
 *  - null/undefined → 空串；
 *  - 含逗号 / 双引号 / 换行 → 双引号包裹，内部双引号 doubling（""）；
 *  - 其余原样输出。
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * 纯函数：通用「对象数组 + 表头定义」→ 带 BOM 的 UTF-8 CSV 字符串。
 *
 * @param data   数据行数组（对象）；按 headers.key 逐列取值。
 * @param headers 表头定义，决定列顺序与列名；空数组时仅输出 BOM。
 * @returns 前置 ﻿、CRLF 换行的完整 CSV 文本。
 *
 * @example
 * generateCsv([{ dept: '内科', n: 12 }], [{ key: 'dept', title: '科室' }, { key: 'n', title: '人次' }]);
 * // ﻿科室,人次\r\n内科,12\r\n
 */
export function generateCsv(data: Record<string, unknown>[], headers: ReportHeader[]): string {
  const headerRow = headers.map((h) => escapeCsvCell(h.title)).join(',');
  const bodyRows = data.map((row) =>
    headers
      .map((h) => escapeCsvCell(row[h.key] as string | number | boolean | null | undefined))
      .join(','),
  );
  const lines = [headerRow, ...bodyRows].filter((l) => l.length > 0);
  // 空表头也保留 BOM，便于 Excel 识别编码
  return CSV_BOM + (lines.length ? lines.join('\r\n') + '\r\n' : '');
}

/* -------------------------------------------------------------------------- */
/* Excel（.xls，零依赖）序列化                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 纯函数：对象数组 → Excel 可直接打开的 .xls（HTML 表格）文本。
 * 不引入任何 Excel 库；以 application/vnd.ms-excel 下发，Excel/WPS 均可正常打开。
 */
function buildExcelTable(data: Record<string, unknown>[], headers: ReportHeader[]): string {
  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const th = headers.map((h) => `<th>${esc(h.title)}</th>`).join('');
  const trs = data
    .map((row) => {
      const tds = headers
        .map((h) => `<td>${esc(row[h.key] == null ? '' : String(row[h.key]))}</td>`)
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');
  return (
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
    `<head><meta charset="UTF-8"/></head><body><table border="1">` +
    `<thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`
  );
}

/* -------------------------------------------------------------------------- */
/* 演示数据生成（确定性，按报表类型）                                          */
/* -------------------------------------------------------------------------- */

/** 生成某报表类型的「全量」演示行（未分页、未筛选）。 */
function buildDemoDataset(type: ReportType, startDate: string, endDate: string): Record<string, unknown>[] {
  const seed = hashSeed(`${type}|${startDate}|${endDate}`);
  const rand = mulberry32(seed);
  // 合成足够多的行以演示分页（真实场景由数据库分页替代）
  const total = 2400;
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < total; i++) {
    const dept = DEPARTMENTS[Math.floor(rand() * DEPARTMENTS.length)];
    // 日期：在 startDate 基础上按行偏移，确定性分布
    const dayOffset = i % 30;
    const date = shiftDate(startDate, dayOffset);

    switch (type) {
      case 'opd_daily': {
        const visit = 80 + Math.floor(rand() * 420);
        rows.push({
          date,
          department: dept,
          visitCount: visit,
          erCount: Math.floor(rand() * 40),
          avgWaitMin: Math.round(8 + rand() * 22),
          avgFee: Math.round(60 + rand() * 380),
        });
        break;
      }
      case 'inp_daily': {
        const inHospital = 20 + Math.floor(rand() * 120);
        rows.push({
          date,
          department: dept,
          inHospital,
          newAdmit: Math.floor(rand() * 12),
          discharged: Math.floor(rand() * 12),
          occupiedBeds: inHospital + Math.floor(rand() * 10),
          avgLodDays: Math.round((3 + rand() * 9) * 10) / 10,
        });
        break;
      }
      case 'rx_stat': {
        rows.push({
          month: startDate.slice(0, 7) || '2026-10',
          department: dept,
          rxCount: 300 + Math.floor(rand() * 2600),
          antibioticPct: Math.round(rand() * 40 * 10) / 10,
          injectionPct: Math.round(rand() * 30 * 10) / 10,
          essentialDrugPct: Math.round((40 + rand() * 55) * 10) / 10,
        });
        break;
      }
      case 'qc_monthly': {
        rows.push({
          month: startDate.slice(0, 7) || '2026-10',
          department: dept,
          sampledRecords: 20 + Math.floor(rand() * 120),
          gradeARatePct: Math.round((70 + rand() * 30) * 10) / 10,
          defectCount: Math.floor(rand() * 30),
          rectifyPct: Math.round((60 + rand() * 40) * 10) / 10,
        });
        break;
      }
    }
  }
  return rows;
}

/** 在 yyyy-mm-dd 上叠加天数（纯函数，越界自动进位/借位） */
function shiftDate(base: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(base);
  if (!m) return base || '-';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/* -------------------------------------------------------------------------- */
/* 主入口：exportReport                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 纯函数：按报表类型 + 筛选条件生成导出结果（CSV / Excel）。
 *
 * @param reportType 报表类型；未知类型抛 Error（由路由转 400）。
 * @param filters    筛选条件（日期区间 / 科室 / 分页）。
 * @param format     导出格式，默认 csv。
 * @returns ExportResult（含正文、文件名、Content-Type、分页统计）。
 */
export function exportReport(
  reportType: string,
  filters: ReportFilters = {},
  format: ExportFormat = 'csv',
): ExportResult {
  if (!REPORT_TYPES.includes(reportType as ReportType)) {
    throw new Error(`不支持的报表类型: ${reportType}`);
  }
  const type = reportType as ReportType;
  if (format !== 'csv' && format !== 'excel') {
    throw new Error(`不支持的导出格式: ${format}`);
  }
  const meta = REPORT_META[type];

  // 规范化筛选条件
  const startDate = filters.startDate || '2026-10-01';
  const endDate = filters.endDate || startDate;
  const department = filters.department?.trim() || '';
  const page = Number.isFinite(filters.page) && (filters.page as number) > 0 ? Math.floor(filters.page as number) : 1;
  const rawSize =
    Number.isFinite(filters.pageSize) && (filters.pageSize as number) > 0
      ? Math.floor(filters.pageSize as number)
      : DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(rawSize, 1), MAX_PAGE_SIZE);

  // 1) 全量演示数据 → 2) 科室筛选（真实场景下推到 SQL WHERE）
  const all = buildDemoDataset(type, startDate, endDate);
  const filtered = department ? all.filter((r) => r['department'] === department) : all;
  const totalRows = filtered.length;

  // 3) 分页切片：大数据量只序列化当前页，避免一次性卡死
  const startIdx = (page - 1) * pageSize;
  const pageData = filtered.slice(startIdx, startIdx + pageSize);

  // 4) 按格式序列化
  const content = format === 'csv' ? generateCsv(pageData, meta.headers) : buildExcelTable(pageData, meta.headers);
  const stamp = startDate.replace(/-/g, '');
  const ext = format === 'csv' ? 'csv' : 'xls';

  return {
    reportType: type,
    reportName: meta.name,
    format,
    filename: `${type}-${stamp}.${ext}`,
    contentType: format === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.ms-excel; charset=utf-8',
    content,
    rowCount: pageData.length,
    totalRows,
    page,
    pageSize,
    demo: true,
    generatedAt: new Date().toISOString(),
  };
}
