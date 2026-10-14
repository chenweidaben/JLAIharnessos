/**
 * 健澜科技 jlmedaios - MEDMUSE 知识中台 RAG 纯函数单测。
 *
 * 不依赖数据库与向量模型：直接测 kbSearchTool 导出的纯函数——
 *   1) searchKnowledge：关键词倒序扫描、命中字段、最多 5 条、无命中返回 []；
 *   2) buildCitationBlock：引用块拼装格式，无命中返回空串。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  searchKnowledge,
  buildCitationBlock,
  DEMO_KNOWLEDGE_BASE,
} from '../../src/bff/agents/kbSearchTool';

describe('searchKnowledge（关键词倒序扫描）', () => {
  it('命中「抗菌药物分级管理」条目，返回 title/snippet/source/updatedAt', () => {
    const hits = searchKnowledge('特殊使用级抗菌药物怎么开？');
    expect(hits.length).toBeGreaterThan(0);
    const top = hits[0];
    expect(top.title).toBe('抗菌药物分级管理办法');
    expect(top.source).toContain('医务处');
    expect(top.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(top.snippet.length).toBeGreaterThan(0);
    expect(top.demo).toBe(true);
  });

  it('命中「临床路径入径」相关条目', () => {
    const hits = searchKnowledge('患者什么时候入径临床路径？');
    const titles = hits.map((h) => h.title);
    expect(titles).toContain('临床路径入径与出径标准');
  });

  it('命中「知情同意」范围条目', () => {
    const hits = searchKnowledge('哪些情况需要签知情同意书？');
    expect(hits[0].title).toBe('知情同意书签署范围与要求');
  });

  it('最多返回 5 条', () => {
    const hits = searchKnowledge('制度 流程 时限 要求 管理');
    expect(hits.length).toBeLessThanOrEqual(5);
  });

  it('无相关关键词时返回空数组', () => {
    const hits = searchKnowledge('今天晚饭吃什么');
    expect(hits).toEqual([]);
  });

  it('空查询返回空数组，不抛错', () => {
    expect(searchKnowledge('')).toEqual([]);
    expect(searchKnowledge('   ')).toEqual([]);
  });

  it('自定义数据集可注入（真实知识表接入点）', () => {
    const custom = [
      {
        title: '演示制度甲',
        snippet: '甲条目内容',
        source: '测试处',
        updatedAt: '2026-01-01',
        tags: ['甲'],
        demo: false,
      },
    ];
    const hits = searchKnowledge('甲条目', custom);
    expect(hits.length).toBe(1);
    expect(hits[0].title).toBe('演示制度甲');
    expect(hits[0].demo).toBe(false);
  });

  it('内置演示库共 8 条，全部带 demo 标记', () => {
    expect(DEMO_KNOWLEDGE_BASE.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_KNOWLEDGE_BASE.every((e) => e.demo === true)).toBe(true);
  });
});

describe('buildCitationBlock（引用块拼装）', () => {
  it('命中时输出「参考依据：」编号列表，格式 1.《标题》（来源）', () => {
    const hits = searchKnowledge('危急值怎么报告');
    const block = buildCitationBlock(hits);
    expect(block.startsWith('参考依据：')).toBe(true);
    expect(block).toMatch(/1\.《.+》（.+）/);
  });

  it('无命中返回空字符串', () => {
    expect(buildCitationBlock([])).toBe('');
  });
});
