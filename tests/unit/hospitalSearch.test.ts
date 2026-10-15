/**
 * 健澜科技 jlmedaios - 全院知识检索纯函数单测（M115-D，依据宪法第七章）
 *
 * 覆盖：关键词匹配（标题/正文命中、多词 AND、空词浏览兜底）、
 *       筛选组合（角色过滤、科室过滤、角色+科室叠加）、
 *       教训置顶排序（失败经验排在常规知识之前）、
 *       空结果兜底（无命中返回空数组、非法角色/科室不抛错）。
 * 全部 mock 数据，不依赖数据库，不碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildDefaultHospitalKnowledge,
  searchHospitalKnowledge,
} from '../../src/bff/aggregators/hospitalSearchAggregator';
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

describe('关键词匹配', () => {
  it('命中标题的条目得分高于仅命中正文', () => {
    const all = [
      makeEntry({ id: 'a', title: '双人核对 SOP', content: '正文无关' }),
      makeEntry({ id: 'b', title: '无关标题', content: '正文提到双人核对流程' }),
    ];
    const out = searchHospitalKnowledge('双人核对', undefined, undefined, all);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('a'); // 标题命中 score=5 在前
    expect(out[1].id).toBe('b'); // 正文命中 score=2 在后
    expect(out[0].score).toBe(5);
    expect(out[1].score).toBe(2);
  });

  it('多关键词 AND：必须全部命中才保留', () => {
    const all = [
      makeEntry({ id: 'a', title: '皮试 阳性 闭环', content: 'x' }),
      makeEntry({ id: 'b', title: '皮试 登记', content: '仅登记时间，无皮试结论字样' }),
    ];
    const out = searchHospitalKnowledge('皮试 阳性', undefined, undefined, all);
    expect(out.map((r) => r.id)).toEqual(['a']);
  });

  it('关键词大小写不敏感', () => {
    const all = [makeEntry({ id: 'a', title: 'CAP Pathway', content: 'x' })];
    const out = searchHospitalKnowledge('cap', undefined, undefined, all);
    expect(out).toHaveLength(1);
  });

  it('空 query 返回全部条目（浏览态兜底）', () => {
    const all = buildDefaultHospitalKnowledge();
    const out = searchHospitalKnowledge('', undefined, undefined, all);
    expect(out).toHaveLength(all.length);
    expect(out[0].score).toBe(0);
  });
});

describe('角色 / 科室筛选组合', () => {
  it('role=doctor 仅保留医生来源条目', () => {
    const all = buildDefaultHospitalKnowledge();
    const out = searchHospitalKnowledge(undefined, 'doctor', undefined, all);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.sourceRole === 'doctor')).toBe(true);
  });

  it('dept=cardio 仅保留心内科条目（忽略大小写）', () => {
    const all = buildDefaultHospitalKnowledge();
    const out = searchHospitalKnowledge(undefined, undefined, 'CARDIO', all);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.deptCode === 'cardio')).toBe(true);
  });

  it('role + dept 叠加：同时满足才保留', () => {
    const all = buildDefaultHospitalKnowledge();
    const out = searchHospitalKnowledge(undefined, 'nurse', 'nursing', all);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.sourceRole === 'nurse' && r.deptCode === 'nursing')).toBe(true);
  });

  it('非法 role 值忽略过滤，不抛错', () => {
    const all = buildDefaultHospitalKnowledge();
    const out = searchHospitalKnowledge(undefined, 'unknown-role', undefined, all);
    expect(out.length).toBe(all.length);
  });
});

describe('教训置顶排序（依据宪法第七章）', () => {
  it('失败经验（教训）排在常规知识之前', () => {
    const all = [
      makeEntry({ id: 'std', title: '常规知识', content: '双人核对 常规', isLesson: false }),
      makeEntry({ id: 'lsn', title: '教训', content: '双人核对 教训', isLesson: true }),
    ];
    const out = searchHospitalKnowledge('双人核对', undefined, undefined, all);
    expect(out[0].id).toBe('lsn');
    expect(out[0].isLesson).toBe(true);
  });
});

describe('空结果兜底', () => {
  it('无命中时返回空数组，不抛错', () => {
    const all = buildDefaultHospitalKnowledge();
    const out = searchHospitalKnowledge('不存在的关键词 xyzzy', undefined, undefined, all);
    expect(out).toEqual([]);
  });

  it('角色 + 科室组合无命中时返回空数组', () => {
    const all = buildDefaultHospitalKnowledge();
    const out = searchHospitalKnowledge(undefined, 'doctor', 'pharma', all);
    expect(out).toEqual([]);
  });

  it('空知识库入参不抛错，返回空数组', () => {
    const out = searchHospitalKnowledge('任意', 'doctor', 'cardio', []);
    expect(out).toEqual([]);
  });

  it('纯函数：不修改入参数组', () => {
    const all = buildDefaultHospitalKnowledge();
    const snapshot = all.length;
    searchHospitalKnowledge('核对', undefined, undefined, all);
    expect(all.length).toBe(snapshot);
  });
});
