/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - CDS 医学知识检索工具（searchMedicalKnowledge / getDrugInformation）
 */

import { describe, it, expect } from 'bun:test';
import { searchMedicalKnowledgeTool } from '@medical/cds/searchMedicalKnowledge';
import { getDrugInformationTool } from '@medical/cds/getDrugInformation';

/** 工具自包含（只读），无需完整上下文，传占位对象即可 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stubContext = {} as any;

describe('search_medical_knowledge 工具', () => {
  it('工具元数据符合 CDS 工具规范', () => {
    expect(searchMedicalKnowledgeTool.name).toBe('search_medical_knowledge');
    expect(searchMedicalKnowledgeTool.riskLevel).toBe('low');
    expect(searchMedicalKnowledgeTool.isReadOnly()).toBe(true);
  });

  it('执行检索返回相关医学知识与来源', async () => {
    const out = await searchMedicalKnowledgeTool.execute(
      { query: '高血压诊断标准和治疗目标', topK: 3 },
      stubContext,
    );
    expect(out.success).toBe(true);
    const data = out.data as { total: number; results: Array<{ docTitle: string; publisher: string }> };
    expect(data.total).toBeGreaterThan(0);
    expect(data.results[0].docTitle).toContain('高血压');
    expect(data.results[0].publisher).toBeTruthy();
  });

  it('支持按文档类型过滤', async () => {
    const out = await searchMedicalKnowledgeTool.execute(
      { query: '阿司匹林', documentType: '药品说明书', topK: 2 },
      stubContext,
    );
    const data = out.data as { results: Array<{ category: string }> };
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.every((r) => r.category === '药品说明书')).toBe(true);
  });

  it('空查询应被 schema 拒绝（zod 抛错，由工具框架统一捕获）', async () => {
    await expect(
      searchMedicalKnowledgeTool.execute({ query: '' }, stubContext),
    ).rejects.toThrow();
  });
});

describe('get_drug_information 工具', () => {
  it('工具元数据符合 CDS 工具规范', () => {
    expect(getDrugInformationTool.name).toBe('get_drug_information');
    expect(getDrugInformationTool.riskLevel).toBe('low');
  });

  it('查询阿司匹林返回分章节说明书', async () => {
    const out = await getDrugInformationTool.execute(
      { drugName: '阿司匹林' },
      stubContext,
    );
    expect(out.success).toBe(true);
    const data = out.data as {
      found: boolean;
      drugName: string;
      sections: Record<string, string>;
    };
    expect(data.found).toBe(true);
    expect(data.drugName).toBe('阿司匹林');
    expect(data.sections.适应症).toBeTruthy();
    expect(data.sections.禁忌).toBeTruthy();
  });

  it('按章节查询仅返回该章节', async () => {
    const out = await getDrugInformationTool.execute(
      { drugName: '阿托伐他汀', infoType: '禁忌' },
      stubContext,
    );
    const data = out.data as { sections: Record<string, string> };
    expect(data.sections.禁忌).toBeTruthy();
    expect(data.sections.适应症).toBeUndefined();
  });

  it('商品名模糊匹配（倍他乐克→美托洛尔）', async () => {
    const out = await getDrugInformationTool.execute(
      { drugName: '倍他乐克' },
      stubContext,
    );
    const data = out.data as { drugName: string; found: boolean };
    expect(data.found).toBe(true);
    expect(data.drugName).toBe('美托洛尔');
  });

  it('未知药品返回 found=false 并提示', async () => {
    const out = await getDrugInformationTool.execute(
      { drugName: '不存在的药XYZ' },
      stubContext,
    );
    const data = out.data as { found: boolean; note?: string };
    expect(data.found).toBe(false);
    expect(data.note).toContain('未在药品知识库');
  });
});
