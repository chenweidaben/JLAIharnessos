/**
 * 健澜科技 jlmedaios - MEDMUSE 多模态扩展纯函数单测。
 *
 * 不依赖数据库 / 文件系统 / OCR 引擎：直接测 agents/multimodality 导出的纯函数——
 *   1) parseLabReport：返回结构化结果（项目/参考值/结果/异常 flag）；
 *   2) summarizeOcrResult：把原始 OCR 文本压缩为 agent 可读摘要。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  parseLabReport,
  summarizeOcrResult,
  OCR_SUMMARY_MAX_LINES,
} from '../../src/bff/agents/multimodality';

describe('parseLabReport（DEMO 结构化结果）', () => {
  it('透传 fileName / mime 且模式为 demo', () => {
    const r = parseLabReport('血常规.pdf', 'application/pdf');
    expect(r.fileName).toBe('血常规.pdf');
    expect(r.mime).toBe('application/pdf');
    expect(r.mode).toBe('demo');
  });

  it('返回结构化项目，含 项目/参考值/结果/异常 flag', () => {
    const r = parseLabReport('lab.jpg', 'image/jpeg');
    expect(r.itemCount).toBe(r.items.length);
    expect(r.items.length).toBeGreaterThan(0);
    for (const it of r.items) {
      expect(typeof it.name).toBe('string');
      expect(it.name.length).toBeGreaterThan(0);
      expect(typeof it.refRange).toBe('string');
      expect(typeof it.result).toBe('string');
      expect(['H', 'L', 'N']).toContain(it.flag);
    }
  });

  it('异常项目被正确标记并在 summary 中汇总', () => {
    const r = parseLabReport('x.pdf', 'application/pdf');
    const abnormal = r.items.filter((i) => i.flag !== 'N');
    expect(abnormal.length).toBeGreaterThan(0);
    expect(r.summary).toContain(`异常 ${abnormal.length} 项`);
  });
});

describe('summarizeOcrResult（OCR 文本压缩）', () => {
  it('空文本返回固定提示', () => {
    expect(summarizeOcrResult('')).toContain('OCR 文本为空');
    expect(summarizeOcrResult('   \n  ')).toContain('OCR 文本为空');
  });

  it('压缩后明显短于原始文本，并保留异常要点', () => {
    const ocr = [
      '医院检验报告单',
      '姓名 张三  性别 男  年龄 45',
      '白细胞计数 WBC        11.2   3.5-9.5 ×10^9/L   ↑',
      '血红蛋白 HGB          108    115-150 g/L        ↓',
      '备注：本报告仅对本次送检标本负责',
      '检验科 签章',
    ].join('\n');
    const summary = summarizeOcrResult(ocr);
    expect(summary.length).toBeLessThan(ocr.length);
    expect(summary).toContain('OCR 摘要');
    // 异常标记被保留
    expect(summary).toContain('↑');
    expect(summary).toContain('↓');
  });

  it('超长数据行被截断到 OCR_SUMMARY_MAX_LINES', () => {
    const ocr = Array.from({ length: 50 }, (_, i) => `项目${i + 1} 结果${i + 1} 参考范围`).join('\n');
    const summary = summarizeOcrResult(ocr);
    // 每行作为一个要点，竖线分隔后要点数不超过上限
    const points = summary.split('｜').length;
    expect(points).toBeLessThanOrEqual(OCR_SUMMARY_MAX_LINES);
  });
});
