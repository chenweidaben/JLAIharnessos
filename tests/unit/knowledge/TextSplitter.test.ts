/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - 文本切分器（TextSplitter）与文档解析器（DocumentParser）
 */

import { describe, it, expect } from 'bun:test';
import { DocumentParser } from '@knowledge/processing/DocumentParser';
import { TextSplitter, DEFAULT_SPLITTER_CONFIG } from '@knowledge/processing/TextSplitter';

describe('DocumentParser', () => {
  const parser = new DocumentParser();

  it('识别 Markdown 标题层级', () => {
    const doc = parser.parse('# 标题一\n## 子标题\n正文段落。', 'markdown');
    const headings = doc.blocks.filter((b) => b.type === 'heading');
    expect(headings.length).toBe(2);
    expect(headings[0].level).toBe(1);
    expect(headings[1].level).toBe(2);
  });

  it('识别表格块', () => {
    const md = '## 用药表\n| 药物 | 剂量 |\n| --- | --- |\n| 阿司匹林 | 100mg |';
    const doc = parser.parse(md, 'markdown');
    expect(doc.blocks.some((b) => b.type === 'table')).toBe(true);
  });

  it('识别列表块', () => {
    const md = '## 注意事项\n- 戒烟\n- 限盐\n- 运动';
    const doc = parser.parse(md, 'markdown');
    expect(doc.blocks.some((b) => b.type === 'list')).toBe(true);
  });

  it('提取元数据', () => {
    const md = '标题：测试指南\n发布机构：中华医学会\n日期：2024-01-01\n\n## 正文\n内容。';
    const doc = parser.parse(md, 'markdown');
    expect(doc.metadata.title).toBe('测试指南');
    expect(doc.metadata.source).toBe('中华医学会');
  });
});

describe('TextSplitter', () => {
  it('按章节切分并携带 sectionPath', () => {
    const parser = new DocumentParser();
    const splitter = new TextSplitter();
    const md = `## 诊断标准
高血压诊断为收缩压≥140 mmHg 和/或舒张压≥90 mmHg。
## 治疗目标
一般患者血压降至 140/90 mmHg 以下。`;
    const doc = parser.parse(md, 'markdown');
    const chunks = splitter.split(doc, 'KB-1', '高血压指南');
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].metadata.sectionPath).toContain('高血压指南');
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });

  it('药品说明书按【章节】切分', () => {
    const parser = new DocumentParser();
    // 极小目标块，使各说明书章节独立成块
    const splitter = new TextSplitter({ targetTokens: 5, maxTokens: 200 });
    const md = `【适应症】用于预防血栓形成。
【用法用量】每日 100 mg。
【禁忌】活动性溃疡禁用。`;
    const doc = parser.parse(md, 'markdown');
    const chunks = splitter.split(doc, 'KB-PHARM', '阿司匹林说明书');
    // 三个说明书章节应分别成块
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    const joined = chunks.map((c) => c.content).join('\n');
    expect(joined).toContain('适应症');
    expect(joined).toContain('禁忌');
    // 章节路径应体现【适应症】/【禁忌】
    expect(chunks.some((c) => c.metadata.sectionPath.includes('【适应症】'))).toBe(true);
    expect(chunks.some((c) => c.metadata.sectionPath.includes('【禁忌】'))).toBe(true);
  });

  it('推荐意见作为独立块并标注', () => {
    const parser = new DocumentParser();
    const splitter = new TextSplitter();
    const md = `推荐：高血压患者应低盐饮食（证据等级A）。
这是一段普通正文描述，用于说明高血压管理的一般原则。`;
    const doc = parser.parse(md, 'markdown');
    const chunks = splitter.split(doc, 'KB-G', '指南');
    const rec = chunks.find((c) => c.metadata.isRecommendation);
    expect(rec).toBeDefined();
    expect(rec?.metadata.evidenceLevel).toBe('A');
  });

  it('超长段落按句子二次切分', () => {
    const parser = new DocumentParser();
    const splitter = new TextSplitter({ targetTokens: 50, maxTokens: 120 });
    const longPara =
      '第一句诊断标准内容。'.repeat(60) + '第二句治疗内容。'.repeat(60);
    const md = `## 章节\n${longPara}`;
    const doc = parser.parse(md, 'markdown');
    const chunks = splitter.split(doc, 'KB-L', '长文档');
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('totalChunks 与 chunkIndex 连续', () => {
    const parser = new DocumentParser();
    const splitter = new TextSplitter({ targetTokens: 40, maxTokens: 120 });
    // 每个章节内容足够长，使章节间不合并成单块
    const md = `## A
${'段落 A 用于描述诊断标准与评估方法，包含血压测量、危险因素分层等内容。'.repeat(4)}
## B
${'段落 B 用于描述治疗策略与药物选择，包括降压药物与生活方式干预。'.repeat(4)}
## C
${'段落 C 用于描述随访管理与并发症防治，包括定期监测与健康教育。'.repeat(4)}`;
    const doc = parser.parse(md, 'markdown');
    const chunks = splitter.split(doc, 'KB-X', '文档');
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    chunks.forEach((c, i) => {
      expect(c.metadata.chunkIndex).toBe(i);
      expect(c.metadata.totalChunks).toBe(chunks.length);
    });
  });

  it('默认配置字段合理', () => {
    expect(DEFAULT_SPLITTER_CONFIG.targetTokens).toBe(512);
    expect(DEFAULT_SPLITTER_CONFIG.overlapRatio).toBe(0.2);
  });
});
