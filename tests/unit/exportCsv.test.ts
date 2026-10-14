/**
 * 健澜科技 jlmedaios - 数据导出中心 CSV 纯函数单测
 *
 * 覆盖：toCsv 的 BOM 头、中文直出、逗号/双引号/换行的 RFC4180 转义、
 *       null/undefined 空单元格，以及三类 build*Csv 的表头与行映射。
 * 全部使用 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  buildDeptKpiCsv,
  buildDrgReportCsv,
  buildQcReportCsv,
  CSV_BOM,
  escapeCell,
  toCsv,
} from '../../src/bff/aggregators/exportCsv';

describe('toCsv', () => {
  it('始终以 UTF-8 BOM 开头（Excel 中文不乱码）', () => {
    const out = toCsv([['姓名', '科室'], ['张三', '内科']]);
    expect(out.startsWith(CSV_BOM)).toBe(true);
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it('中文原样直出，不做转义', () => {
    const out = toCsv([['质控单ID', '整改建议'], ['qc-1', '补充首次病程记录']]);
    expect(out).toContain('补充首次病程记录');
    expect(out).toContain('质控单ID');
  });

  it('字段含逗号时整体双引号包裹', () => {
    const out = toCsv([['备注'], ['张医生,李医生复核']]);
    expect(out).toContain('"张医生,李医生复核"');
  });

  it('字段含双引号时 doubling 为两个双引号', () => {
    const out = toCsv([['备注'], ['他说"病历合格"']]);
    expect(out).toContain('"他说""病历合格"""');
  });

  it('字段含换行时整体双引号包裹', () => {
    const out = toCsv([['建议'], ['第一行\n第二行']]);
    expect(out).toContain('"第一行\n第二行"');
  });

  it('null/undefined 输出空单元格，数字原样', () => {
    const out = toCsv([['得分', '建议'], [95, null]]);
    expect(out).toContain('95,');
    // 第二行以逗号结尾（建议列为空）
    expect(out.split('\r\n')[1]).toBe('95,');
  });

  it('空数组仅输出 BOM（空表）', () => {
    expect(toCsv([])).toBe(CSV_BOM);
  });
});

describe('escapeCell', () => {
  it('null/undefined → 空串', () => {
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(undefined)).toBe('');
  });
  it('数字/布尔转字符串', () => {
    expect(escapeCell(95)).toBe('95');
    expect(escapeCell(true)).toBe('true');
  });
});

describe('buildQcReportCsv', () => {
  it('输出中文表头与中文状态标签', () => {
    const csv = buildQcReportCsv([
      {
        id: 'qc-1',
        visitId: 'v-1',
        qcType: 'round',
        checker: '陈维',
        checkDate: '2026-10-14',
        score: 92,
        errorCount: 2,
        status: 'pending',
        suggestions: '完善签名',
      },
    ]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toContain('质控单ID,就诊ID,质控类型,质控人,检查日期,得分,缺陷数,状态,整改建议');
    expect(csv).toContain('待整改');
    expect(csv).toContain('92');
  });
});

describe('buildDrgReportCsv', () => {
  it('映射 DRG 行并转换状态标签', () => {
    const csv = buildDrgReportCsv([
      {
        visitId: 'v-9',
        visitNo: 'ZY0009',
        patientName: '王五',
        department: '心内科',
        primaryDxCode: 'I21.4',
        groupCode: 'FM31',
        groupName: '心衰',
        weight: '1.23',
        estimatedPayment: '12000',
        totalFee: '11500',
        balance: '500',
        status: 'confirmed',
        updatedAt: '2026-10-14T10:00:00Z',
      },
    ]);
    expect(csv).toContain('已确认');
    expect(csv).toContain('FM31');
    expect(csv).toContain('I21.4');
  });
});

describe('buildDeptKpiCsv', () => {
  it('生成表头、真实/演示来源标签与百分制甲级病历率', () => {
    const csv = buildDeptKpiCsv([
      {
        deptName: '心内科',
        date: '2026-10-14',
        demo: false,
        bedTurnoverRate: 0.12,
        avgLod: 5.2,
        avgCost: 8200,
        gradeARate: 0.92,
      },
    ]);
    expect(csv).toContain('科室,统计日期,数据来源,床位周转率(次/日),平均住院日(天),次均费用(元),甲级病历率');
    expect(csv).toContain('真实数据');
    expect(csv).toContain('92%');
  });

  it('KPI 为 null 时输出空单元格（不臆造 0）', () => {
    const csv = buildDeptKpiCsv([
      {
        deptName: '心内科',
        date: '2026-10-14',
        demo: true,
        bedTurnoverRate: null,
        avgLod: null,
        avgCost: null,
        gradeARate: null,
      },
    ]);
    expect(csv).toContain('演示数据');
    // 数据来源后 4 个空单元格（周转率/住院日/费用/甲级率均空）
    expect(csv).toMatch(/演示数据,,,,\r\n/);
  });
});
