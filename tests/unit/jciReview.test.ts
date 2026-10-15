/**
 * 健澜科技 jlmedaios - 三甲评审准备系统纯函数单测（质量与安全 M141-A）
 *
 * 覆盖：检查清单七大类完整性与编号唯一性、三态合法性、证据留痕状态机
 * （unmet→improving→met）、纯函数不修改入参、未知条款抛错、差距分析
 * 计数自洽 / 排序 / 整体灯。全部使用内存数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildReviewChecklist,
  CATEGORY_NAMES,
  generateReviewGapReport,
  REVIEW_CATEGORIES,
  trackReviewEvidence,
  type Criterion,
} from '../../src/bff/aggregators/jciReviewAggregator';

describe('buildReviewChecklist 检查清单', () => {
  it('七大类别全部覆盖，不漏项', () => {
    const list = buildReviewChecklist();
    const cats = new Set(list.map((c) => c.category));
    expect(REVIEW_CATEGORIES.map((c) => c.key)).toEqual([
      'hospital_function',
      'medical_quality',
      'nursing_quality',
      'pharmacy',
      'infection_control',
      'medical_records',
      'hospital_admin',
    ]);
    for (const key of Object.keys(CATEGORY_NAMES)) {
      expect(cats.has(key as Criterion['category'])).toBe(true);
    }
  });

  it('共 37 条核心条款，编号全局唯一', () => {
    const list = buildReviewChecklist();
    expect(list.length).toBe(37);
    const ids = list.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('状态仅三态：已达标 22 / 待改进 11 / 未达标 4', () => {
    const list = buildReviewChecklist();
    const counts = { met: 0, improving: 0, unmet: 0 };
    for (const c of list) counts[c.status] += 1;
    expect(counts).toEqual({ met: 22, improving: 11, unmet: 4 });
  });

  it('每条条款都有标题、责任科室与证据链数组', () => {
    for (const c of buildReviewChecklist()) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.ownerDept.length).toBeGreaterThan(0);
      expect(Array.isArray(c.evidence)).toBe(true);
    }
  });
});

describe('trackReviewEvidence 证据跟踪状态机', () => {
  it('未达标条款留痕第 1 条证据 → 自动转待改进', () => {
    const r = trackReviewEvidence('MQ-06', 'document', '制度-ZL-2026-012《不良事件非惩罚性上报办法》');
    expect(r.status).toBe('improving');
    expect(r.evidence.length).toBe(1);
    expect(r.evidence[0]).toEqual({ type: 'document', ref: '制度-ZL-2026-012《不良事件非惩罚性上报办法》' });
  });

  it('待改进条款累计第 2 条证据 → 自动转已达标', () => {
    const first = trackReviewEvidence('NQ-03', 'audit', '内审-HL-2026-10 不良事件闭环核查');
    expect(first.status).toBe('met');
    expect(first.evidence.length).toBe(2);
  });

  it('已达标条款仅追加证据，状态保持已达标', () => {
    const r = trackReviewEvidence('HF-01', 'data', '台账-YW-2026-Q3 公益性考核数据');
    expect(r.status).toBe('met');
    expect(r.evidence.length).toBe(2);
  });

  it('纯函数：传入的清单不被修改', () => {
    const cl = buildReviewChecklist();
    const before = cl.find((c) => c.id === 'MQ-06')!;
    expect(before.status).toBe('unmet');
    expect(before.evidence.length).toBe(0);

    const r = trackReviewEvidence('MQ-06', 'data', '台账-ZL-2026-Q4', cl);
    expect(r.status).toBe('improving');
    // 原清单原样返回
    const after = cl.find((c) => c.id === 'MQ-06')!;
    expect(after.status).toBe('unmet');
    expect(after.evidence.length).toBe(0);
  });

  it('未知条款编号抛错（路由映射 400）', () => {
    expect(() => trackReviewEvidence('NOPE-99', 'document', 'x')).toThrow(/评审条款不存在/);
  });
});

describe('generateReviewGapReport 差距分析', () => {
  it('计数自洽：三态合计 = 总数，已达标率 = 22/37 = 59.5%', () => {
    const r = generateReviewGapReport();
    const { counts, totalCriteria } = r;
    expect(counts.met + counts.improving + counts.unmet).toBe(totalCriteria);
    expect(totalCriteria).toBe(37);
    expect(counts).toEqual({ met: 22, improving: 11, unmet: 4 });
    expect(r.passRate).toBe(59.5);
  });

  it('存在未达标条款 → 整体灯为红；差距项只含未达标 + 待改进', () => {
    const r = generateReviewGapReport();
    expect(r.overall).toBe('red');
    expect(r.gaps.length).toBe(15);
    for (const g of r.gaps) {
      expect(g.status === 'unmet' || g.status === 'improving').toBe(true);
      expect(g).toHaveProperty('recommendation');
      expect(g).toHaveProperty('ownerDept');
    }
  });

  it('差距项排序：未达标优先，同状态按编号', () => {
    const r = generateReviewGapReport();
    expect(r.gaps[0].status).toBe('unmet');
    expect(r.gaps[0].criterionId).toBe('HA-04'); // unmet 高优先中编号最小
    // 所有未达标排在待改进之前
    const firstImprovingIdx = r.gaps.findIndex((g) => g.status === 'improving');
    for (const g of r.gaps.slice(0, firstImprovingIdx)) {
      expect(g.status).toBe('unmet');
    }
  });

  it('按类别统计覆盖七大类，各类计数合计 = 总数', () => {
    const r = generateReviewGapReport();
    expect(r.byCategory.length).toBe(7);
    const sum = r.byCategory.reduce((s, c) => s + c.total, 0);
    expect(sum).toBe(r.totalCriteria);
    for (const c of r.byCategory) {
      expect(c.met + c.improving + c.unmet).toBe(c.total);
    }
  });

  it('未达标全部留痕整改后：整体灯由红转黄', () => {
    let cl = buildReviewChecklist();
    for (const id of ['MQ-06', 'NQ-05', 'IC-05', 'HA-04']) {
      cl = cl.map((c) => (c.id === id ? trackReviewEvidence(id, 'data', `台账-${id}-整改`) : c));
    }
    const r = generateReviewGapReport(cl);
    expect(r.counts.unmet).toBe(0);
    expect(r.overall).toBe('yellow');
    expect(r.gaps.every((g) => g.status === 'improving')).toBe(true);
  });
});
