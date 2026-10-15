/**
 * 健澜科技 jlmedaios - M148-D 报表中心导出聚合器单测（产品化收尾）
 *
 * 覆盖：
 *   - exportToPdf：打印模板完整性（医院抬头 / 深海蓝 VI / 水印 / 页脚版权 / @page A4 分页规则）；
 *   - exportToExcel：.xls 产物、工作表名、表头与数据行；
 *   - generateReport：四类报表数据、默认格式路由（门诊日报/科室绩效/质控报告→PDF，住院月报→Excel）、
 *     科室筛选、非法类型报错。
 *
 * 全部使用确定性演示数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  CENTER_REPORT_TYPES,
  exportToExcel,
  exportToPdf,
  generateReport,
} from '../../src/bff/aggregators/exportReportAggregator';

describe('exportToPdf（打印模板）', () => {
  it('产出完整 HTML 文档，contentType 为 text/html', () => {
    const r = exportToPdf('<h1>正文</h1>', 'test-report');
    expect(r.content.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(r.content).toContain('<html lang="zh-CN">');
    expect(r.contentType).toBe('text/html; charset=utf-8');
    expect(r.format).toBe('pdf');
  });

  it('文件名自动补 .html 后缀', () => {
    const r = exportToPdf('<p>x</p>', 'opd_daily-20261016');
    expect(r.filename).toBe('opd_daily-20261016.html');
  });

  it('包含医院抬头、深海蓝 VI、斜向水印、页脚版权', () => {
    const r = exportToPdf('<table/>', 't');
    // 医院抬头
    expect(r.content).toContain('健澜示范医院');
    // 深海蓝 VI 色值
    expect(r.content).toContain('#0a2540');
    expect(r.content).toContain('#123a5e');
    // 斜向水印
    expect(r.content).toContain('健澜科技 JLAN MEDAI');
    // 页脚版权
    expect(r.content).toContain('©');
    expect(r.content).toContain('杭州健澜科技有限公司');
    // 正文被正确嵌入
    expect(r.content).toContain('<table/>');
  });

  it('包含 A4 分页规则与打印分页控制类', () => {
    const r = exportToPdf('<div/>', 't');
    expect(r.content).toContain('@page');
    expect(r.content).toContain('A4');
    expect(r.content).toContain('page-break-after');
    expect(r.content).toContain('page-break-inside');
  });
});

describe('exportToExcel（零依赖 .xls）', () => {
  const headers = [
    { key: 'month', title: '月份' },
    { key: 'dept', title: '科室' },
    { key: 'n', title: '出院例数' },
  ];

  it('产出 .xls / application/vnd.ms-excel，包含工作表名标题行', () => {
    const r = exportToExcel([{ month: '2026-10', dept: '内科', n: 120 }], headers, '住院月报');
    expect(r.format).toBe('excel');
    expect(r.filename).toBe('住院月报.xls');
    expect(r.contentType).toBe('application/vnd.ms-excel; charset=utf-8');
    expect(r.content).toContain('住院月报');
    expect(r.rowCount).toBe(1);
  });

  it('表头与数据列按 headers 顺序渲染，HTML 特殊字符被转义', () => {
    const r = exportToExcel(
      [{ month: '2026-10', dept: '外科<骨科>', n: 5 }],
      headers,
      '绩效表',
    );
    expect(r.content).toContain('<th>月份</th>');
    expect(r.content).toContain('<th>科室</th>');
    expect(r.content).toContain('<th>出院例数</th>');
    expect(r.content).toContain('外科&lt;骨科&gt;');
  });

  it('null/undefined 渲染为空单元格，不臆造 0', () => {
    const r = exportToExcel([{ month: '2026-10', dept: null, n: undefined }], headers, '空表');
    expect(r.content).toContain('<td></td>');
  });
});

describe('generateReport（报表主入口）', () => {
  it('四类报表类型均已注册', () => {
    expect(CENTER_REPORT_TYPES.length).toBe(4);
    expect(CENTER_REPORT_TYPES).toContain('opd_daily');
    expect(CENTER_REPORT_TYPES).toContain('inp_monthly');
    expect(CENTER_REPORT_TYPES).toContain('dept_perf');
    expect(CENTER_REPORT_TYPES).toContain('qc_report');
  });

  it('门诊日报/科室绩效/质控报告默认产出 PDF 打印模板', () => {
    for (const t of ['opd_daily', 'dept_perf', 'qc_report'] as const) {
      const r = generateReport(t, '', { date: '2026-10-16' });
      expect(r.format).toBe('pdf');
      expect(r.filename.endsWith('.pdf')).toBe(true);
      expect(r.contentType).toBe('text/html; charset=utf-8');
      expect(r.content).toContain('@page');
      expect(r.rowCount).toBeGreaterThan(0);
      expect(r.demo).toBe(true);
    }
  });

  it('住院月报默认产出 Excel 且文件名 .xls', () => {
    const r = generateReport('inp_monthly', '', { date: '2026-10-16' });
    expect(r.format).toBe('excel');
    expect(r.reportName).toBe('住院月报');
    expect(r.filename).toBe('inp_monthly-20261016.xls');
    expect(r.contentType).toBe('application/vnd.ms-excel; charset=utf-8');
    expect(r.rowCount).toBeGreaterThan(0);
  });

  it('PDF 报表正文含 KPI 摘要与明细表格', () => {
    const r = generateReport('opd_daily', 'pdf', { date: '2026-10-16' });
    expect(r.content).toContain('门诊日报');
    expect(r.content).toContain('kpi-row');
    expect(r.content).toContain('<table class="report">');
    expect(r.content).toContain('接诊人次');
  });

  it('科室绩效按综合得分降序，首行排名为 1', () => {
    const r = generateReport('dept_perf', 'pdf', { date: '2026-10-16' });
    // 正文表格中应出现「1」排名且对应最高分科室
    expect(r.content).toContain('<td>1</td>');
    expect(r.content).toContain('综合得分');
  });

  it('科室筛选后仅保留该科室数据', () => {
    const all = generateReport('opd_daily', 'pdf', { date: '2026-10-16' });
    const one = generateReport('opd_daily', 'pdf', { date: '2026-10-16', department: '内科' });
    expect(one.rowCount).toBe(1);
    expect(one.rowCount).toBeLessThan(all.rowCount);
    expect(one.content).not.toContain('外科');
  });

  it('显式 format=excel 可强制把任意报表导出为 Excel', () => {
    const r = generateReport('qc_report', 'excel', { date: '2026-10-16' });
    expect(r.format).toBe('excel');
    expect(r.filename.endsWith('.xls')).toBe(true);
    expect(r.content).toContain('质控报告');
  });

  it('未知报表类型抛错', () => {
    expect(() => generateReport('not_exist', 'pdf', {})).toThrow(/不支持的报表类型/);
  });
});
