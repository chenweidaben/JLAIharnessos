/**
 * 健澜科技 jlmedaios - M138-D 数据报表导出聚合器单测
 *
 * 覆盖：四类报表生成、CSV 格式（BOM / 表头 / 转义）、筛选条件（科室）、分页切片、
 *       非法类型/格式报错、Excel 格式产出。全部使用确定性演示数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  CSV_BOM,
  escapeCsvCell,
  exportReport,
  generateCsv,
  REPORT_TYPES,
} from '../../src/bff/aggregators/reportExportAggregator';

describe('generateCsv', () => {
  it('输出带 BOM 的表头与数据行（CRLF 换行）', () => {
    const csv = generateCsv([{ dept: '内科', n: 12 }], [
      { key: 'dept', title: '科室' },
      { key: 'n', title: '人次' },
    ]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('科室,人次');
    expect(csv).toContain('内科,12');
    expect(csv).toContain('\r\n');
  });

  it('字段含逗号/双引号时按 RFC4180 转义', () => {
    const csv = generateCsv([{ note: '张医生,李"复核"' }], [{ key: 'note', title: '备注' }]);
    expect(csv).toContain('"张医生,李""复核"""');
  });

  it('null/undefined 输出空单元格，不臆造 0', () => {
    const csv = generateCsv([{ a: 1, b: null }], [
      { key: 'a', title: '甲' },
      { key: 'b', title: '乙' },
    ]);
    expect(csv.split('\r\n')[1]).toBe('1,');
  });

  it('空数据行时仍输出表头与 BOM', () => {
    const csv = generateCsv([], [{ key: 'a', title: '甲' }]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toContain('甲');
  });
});

describe('exportReport', () => {
  it('四类报表均可生成，且携带中文名 / 文件名 / CSV BOM', () => {
    for (const t of REPORT_TYPES) {
      const r = exportReport(t, { startDate: '2026-10-01' }, 'csv');
      expect(r.reportType).toBe(t);
      expect(r.contentType).toBe('text/csv; charset=utf-8');
      expect(r.filename.endsWith('.csv')).toBe(true);
      expect(r.content.startsWith(CSV_BOM)).toBe(true);
      expect(r.demo).toBe(true);
      expect(r.totalRows).toBeGreaterThan(0);
      expect(r.rowCount).toBeGreaterThan(0);
    }
  });

  it('门诊日报表头与住院日报表头正确', () => {
    const opd = exportReport('opd_daily', { startDate: '2026-10-01' }, 'csv');
    expect(opd.reportName).toBe('门诊日报');
    expect(opd.content).toContain('日期,科室,接诊人次,急诊人次,平均候诊(分),次均费用(元)');

    const inp = exportReport('inp_daily', { startDate: '2026-10-01' }, 'csv');
    expect(inp.reportName).toBe('住院日报');
    expect(inp.content).toContain('日期,科室,在院人数,新入院,出院,占用床位,平均住院日(天)');
  });

  it('科室筛选后 totalRows 小于全量且行内科室一致', () => {
    const all = exportReport('opd_daily', { startDate: '2026-10-01', pageSize: 5000 }, 'csv');
    const one = exportReport(
      'opd_daily',
      { startDate: '2026-10-01', department: '内科', pageSize: 5000 },
      'csv',
    );
    expect(one.totalRows).toBeLessThan(all.totalRows);
    // 筛内科时导出内容不应出现其它科室名（抽查关键词）
    expect(one.content).not.toContain('心内科');
  });

  it('分页切片：pageSize 决定当前页行数，page 偏移不重叠', () => {
    const p1 = exportReport('opd_daily', { startDate: '2026-10-01', page: 1, pageSize: 500 }, 'csv');
    const p2 = exportReport('opd_daily', { startDate: '2026-10-01', page: 2, pageSize: 500 }, 'csv');
    expect(p1.page).toBe(1);
    expect(p1.pageSize).toBe(500);
    expect(p1.rowCount).toBe(500);
    expect(p2.page).toBe(2);
    // 总页数对齐：p2 仍有数据（total=2400）
    expect(p2.rowCount).toBe(500);
    expect(p1.totalRows).toBe(p2.totalRows);
  });

  it('越界页返回 0 行但 totalRows 不变（大数据量安全）', () => {
    const r = exportReport('opd_daily', { startDate: '2026-10-01', page: 99, pageSize: 500 }, 'csv');
    expect(r.totalRows).toBeGreaterThan(0);
    expect(r.rowCount).toBe(0);
  });

  it('pageSize 超过上限时被收敛到 MAX_PAGE_SIZE', () => {
    const r = exportReport('opd_daily', { startDate: '2026-10-01', pageSize: 999999 }, 'csv');
    expect(r.pageSize).toBeLessThanOrEqual(5000);
  });

  it('Excel 格式产出 .xls / application/vnd.ms-excel 内容', () => {
    const r = exportReport('qc_monthly', { startDate: '2026-10-01' }, 'excel');
    expect(r.format).toBe('excel');
    expect(r.filename.endsWith('.xls')).toBe(true);
    expect(r.contentType).toBe('application/vnd.ms-excel; charset=utf-8');
    expect(r.content).toContain('<table');
    expect(r.content).toContain('月份');
  });

  it('未知报表类型抛错', () => {
    expect(() => exportReport('not_exist', {}, 'csv')).toThrow(/不支持的报表类型/);
  });

  it('未知导出格式抛错', () => {
    expect(() => exportReport('opd_daily', {}, 'pdf' as 'csv')).toThrow(/不支持的导出格式/);
  });
});
