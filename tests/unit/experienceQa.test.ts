/**
 * 健澜科技 jlmedaios - 智能经验问答纯函数单测（M118-B，依据宪法第七章）
 *
 * 覆盖：关键词匹配（问句切词、命中标题/正文、无命中兜底）、
 *       角色过滤（同角色来源加权排名靠前）、
 *       置信度计算（基线公式、角色/科室加权提升、0~1 区间兜底）。
 * 全部 mock 数据，不依赖数据库，不碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  askExperience,
  tokenizeQuery,
} from '../../src/bff/aggregators/experienceQaAggregator';
import type { HospitalKnowledgeEntry } from '../../src/bff/aggregators/hospitalKnowledgeAggregator';

/** 构造测试条目（最小字段） */
function makeEntry(partial: Partial<HospitalKnowledgeEntry> = {}): HospitalKnowledgeEntry {
  return {
    id: 'x',
    deptCode: 'cardio',
    tier: 'hospital',
    title: '默认标题',
    content: '默认正文',
    sourceRole: 'doctor',
    isLesson: false,
    priority: 2,
    successRate: 0.9,
    usageCount: 10,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('问句切词 tokenizeQuery', () => {
  it('去除疑问词「怎么」后切成关键词', () => {
    expect(tokenizeQuery('高警示药品怎么核对')).toEqual(['高警示药品', '核对']);
  });

  it('空 / 纯空白输入返回空数组', () => {
    expect(tokenizeQuery('')).toEqual([]);
    expect(tokenizeQuery('   ')).toEqual([]);
  });
});

describe('关键词匹配', () => {
  it('命中条目返回可读答案与来源', () => {
    const all = [
      makeEntry({
        id: 'a',
        title: '双人核对 SOP',
        content: '高警示药品一律双人核对双签。',
      }),
      makeEntry({ id: 'b', title: '无关标题', content: '正文完全不相关' }),
    ];
    const r = askExperience('高警示药品怎么核对', undefined, undefined, all);
    expect(r.matched).toBe(true);
    expect(r.sources).toHaveLength(1);
    expect(r.sources[0].id).toBe('a');
    expect(r.answer).toContain('双人核对 SOP');
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('无任何命中时兜底：matched=false、置信度为 0、来源为空', () => {
    const all = [makeEntry({ id: 'a', title: '双人核对 SOP', content: 'xxx' })];
    const r = askExperience('核磁共振怎么预约', undefined, undefined, all);
    expect(r.matched).toBe(false);
    expect(r.sources).toEqual([]);
    expect(r.confidence).toBe(0);
    expect(r.answer).toContain('暂未检索到');
  });

  it('空问句返回引导语而非臆造经验', () => {
    const r = askExperience('', undefined, undefined, [makeEntry()]);
    expect(r.matched).toBe(false);
    expect(r.confidence).toBe(0);
  });

  it('失败经验答案带「教训警示」前缀', () => {
    const all = [
      makeEntry({ id: 'l', title: '跌倒高危交班', content: 'Morse≥45 床头警示交班。', isLesson: true }),
    ];
    const r = askExperience('跌倒高危怎么交班', undefined, undefined, all);
    expect(r.matched).toBe(true);
    expect(r.answer.startsWith('【教训警示】')).toBe(true);
    expect(r.sources[0].isLesson).toBe(true);
  });
});

describe('角色 / 科室过滤（加权排名）', () => {
  it('同角色来源在并列命中时排到首位', () => {
    const all = [
      makeEntry({ id: 'n', title: '跌倒高危交班', content: 'morse 评分交班', sourceRole: 'nurse' }),
      makeEntry({ id: 'd', title: '跌倒高危交班制度', content: '跌倒高危患者交班流程', sourceRole: 'doctor' }),
    ];
    // 护士提问：护士来源条目应因角色加权排到第一
    const asNurse = askExperience('跌倒高危交班', 'nurse', undefined, all);
    expect(asNurse.sources[0].id).toBe('n');
    // 医生提问：医生来源条目应排到第一
    const asDoctor = askExperience('跌倒高危交班', 'doctor', undefined, all);
    expect(asDoctor.sources[0].id).toBe('d');
  });

  it('非法角色值不参与加权、不抛错', () => {
    const all = [makeEntry({ id: 'a', title: '双人核对', content: 'x', sourceRole: 'doctor' })];
    const r = askExperience('双人核对', 'wizard', undefined, all);
    expect(r.matched).toBe(true);
    expect(r.confidence).toBeGreaterThan(0);
  });
});

describe('置信度计算', () => {
  const e = makeEntry({
    id: 'e',
    title: '双人核对',
    content: '双人核对双签流程',
    sourceRole: 'doctor',
    deptCode: 'cardio',
    successRate: 0.9,
  });

  it('单关键词完整命中（coverage=1、successRate=0.9）基线为 0.69', () => {
    // 0.25 + 0.35*1 + 0.1*0.9 = 0.69
    const r = askExperience('双人核对', undefined, undefined, [e]);
    expect(r.confidence).toBe(0.69);
  });

  it('角色 + 科室双加权后置信度提升至 0.99', () => {
    // 0.69 + 0.15(role) + 0.15(dept) = 0.99
    const r = askExperience('双人核对', 'doctor', 'cardio', [e]);
    expect(r.confidence).toBe(0.99);
  });

  it('部分命中（coverage=0.5）置信度低于完整命中', () => {
    // 0.25 + 0.35*0.5 + 0.1*0.9 = 0.515 ≈ 0.52
    const partial = askExperience('双人核对 皮试', undefined, undefined, [e]);
    const full = askExperience('双人核对', undefined, undefined, [e]);
    expect(partial.confidence).toBeLessThan(full.confidence);
  });

  it('置信度始终落在 0~1 闭区间', () => {
    const r = askExperience('双人核对', 'doctor', 'cardio', [e]);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});
