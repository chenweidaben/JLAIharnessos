/**
 * 健澜科技 jlmedaios - 电子病历模板纯函数单测
 *
 * 覆盖：分类筛选（filterTemplatesByCategory）、分类分组（groupTemplatesByCategory）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  filterTemplatesByCategory,
  groupTemplatesByCategory,
  type EmrTemplate,
} from '../../src/bff/aggregators/emrTemplateAggregator';

function makeTemplate(partial: Partial<EmrTemplate> & { name: string }): EmrTemplate {
  return {
    id: partial.id ?? '00000000-0000-4000-8000-000000000001',
    name: partial.name,
    category: partial.category ?? '未分类',
    content: partial.content ?? '',
    created_by: partial.created_by ?? null,
    created_at: partial.created_at ?? '2026-01-01T00:00:00Z',
  };
}

const fixtures: EmrTemplate[] = [
  makeTemplate({ id: '1', name: '入院记录', category: '入院记录' }),
  makeTemplate({ id: '2', name: '首次病程', category: '病程记录' }),
  makeTemplate({ id: '3', name: '日常病程', category: '病程记录' }),
  makeTemplate({ id: '4', name: '出院小结', category: '出院小结' }),
  makeTemplate({ id: '5', name: '空白模板', category: '' }),
];

describe('filterTemplatesByCategory', () => {
  it('空分类应返回全量', () => {
    expect(filterTemplatesByCategory(fixtures)).toHaveLength(fixtures.length);
    expect(filterTemplatesByCategory(fixtures, '')).toHaveLength(fixtures.length);
    expect(filterTemplatesByCategory(fixtures, null)).toHaveLength(fixtures.length);
  });

  it('按分类精确筛选', () => {
    const res = filterTemplatesByCategory(fixtures, '病程记录');
    expect(res).toHaveLength(2);
    expect(res.map((t) => t.id).sort()).toEqual(['2', '3']);
  });

  it('无匹配分类返回空数组', () => {
    expect(filterTemplatesByCategory(fixtures, '不存在的分类')).toEqual([]);
  });
});

describe('groupTemplatesByCategory', () => {
  it('按分类分组并保持出现顺序', () => {
    const { groups, categories } = groupTemplatesByCategory(fixtures);
    expect(categories).toEqual(['入院记录', '病程记录', '出院小结', '未分类']);
    expect(groups['病程记录']).toHaveLength(2);
    expect(groups['入院记录']).toHaveLength(1);
    expect(groups['出院小结']).toHaveLength(1);
  });

  it('空分类归入“未分类”', () => {
    const { groups } = groupTemplatesByCategory(fixtures);
    expect(groups['未分类']).toHaveLength(1);
    expect(groups['未分类'][0].id).toBe('5');
  });

  it('空列表返回空分组', () => {
    const { groups, categories } = groupTemplatesByCategory([]);
    expect(categories).toEqual([]);
    expect(Object.keys(groups)).toHaveLength(0);
  });
});
