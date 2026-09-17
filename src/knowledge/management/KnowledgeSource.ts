/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 知识来源（Knowledge Source）模型。
 * 描述一篇入库知识文档的来源、权威性、版本与可信度，
 * 是知识库管理与证据追溯的基础模型。
 */

import type { AuthorityStar, DocumentCategory, KnowledgeLevel, SourceType } from '../types';

/** 知识版本信息 */
export interface KnowledgeVersion {
  /** 当前版本号（语义化，如 v3.0.0） */
  currentVersion: string;
  /** 前一版本号 */
  previousVersion?: string;
  /** 生效日期（YYYY-MM-DD） */
  effectiveDate: string;
  /** 失效日期（YYYY-MM-DD，空表示长期有效） */
  expiryDate?: string;
  /** 版本历史记录 */
  history: { version: string; date: string; summary: string }[];
}

/**
 * 知识来源模型。
 *
 * 对应《数据模型与知识库设计》5.3.2 节知识元数据模型的核心字段，
 * 一篇 KnowledgeSource 入库后会被解析、切分、向量化为若干 Chunk。
 */
export interface KnowledgeSource {
  /** 知识源唯一 ID（如 KB-2026-CARDIO-001） */
  knowledgeId: string;
  /** 文档标题 */
  title: string;
  /** 知识层级 L1-L5 */
  level: KnowledgeLevel;
  /** 文档分类 */
  category: DocumentCategory;
  /** 子分类（如 心血管/高血压） */
  subcategory?: string;
  /** 来源类型 */
  sourceType: SourceType;
  /** 发布机构 */
  publisher: string;
  /** 发布日期（YYYY-MM-DD） */
  publishDate: string;
  /** 版本信息 */
  version: KnowledgeVersion;
  /** 证据等级（A/B/C/D 或 I/II/III） */
  evidenceLevel?: string;
  /** 权威性评分（1-5） */
  authorityScore: AuthorityStar;
  /** 关联科室（如 心内科） */
  department?: string;
  /** 标签 */
  tags: string[];
  /** 正文内容（Markdown 纯文本） */
  content: string;
  /** 是否有效（过期/作废为 false） */
  isActive: boolean;
  /** 来源可信度评分（0-1，用于低权威知识提示） */
  confidenceScore: number;
  /** 文档格式（默认 markdown） */
  format?: 'markdown' | 'txt' | 'json';
}

/**
 * 知识来源 Builder，便于构造入库知识。
 */
export class KnowledgeSourceBuilder {
  private data: KnowledgeSource;

  /**
   * @param knowledgeId - 知识源 ID
   * @param title - 标题
   * @param content - 正文（Markdown）
   */
  constructor(knowledgeId: string, title: string, content: string) {
    this.data = {
      knowledgeId,
      title,
      level: 'L2',
      category: '临床指南',
      sourceType: 'official_guideline',
      publisher: '健澜科技医学部',
      publishDate: new Date().toISOString().slice(0, 10),
      version: {
        currentVersion: 'v1.0.0',
        effectiveDate: new Date().toISOString().slice(0, 10),
        history: [],
      },
      authorityScore: 5,
      tags: [],
      content,
      isActive: true,
      confidenceScore: 0.9,
      format: 'markdown',
    };
  }

  /** 设置层级 */
  level(level: KnowledgeLevel): this {
    this.data.level = level;
    return this;
  }
  /** 设置分类 */
  category(category: DocumentCategory): this {
    this.data.category = category;
    return this;
  }
  /** 设置来源类型 */
  sourceType(sourceType: SourceType): this {
    this.data.sourceType = sourceType;
    return this;
  }
  /** 设置发布机构 */
  publisher(publisher: string): this {
    this.data.publisher = publisher;
    return this;
  }
  /** 设置发布日期 */
  publishDate(date: string): this {
    this.data.publishDate = date;
    return this;
  }
  /** 设置版本号 */
  version(version: string, effectiveDate?: string): this {
    this.data.version = {
      currentVersion: version,
      effectiveDate: effectiveDate ?? this.data.publishDate,
      history: [{ version, date: effectiveDate ?? this.data.publishDate, summary: '初始版本' }],
    };
    return this;
  }
  /** 设置证据等级 */
  evidenceLevel(level: string): this {
    this.data.evidenceLevel = level;
    return this;
  }
  /** 设置权威性 */
  authorityScore(score: AuthorityStar): this {
    this.data.authorityScore = score;
    return this;
  }
  /** 设置科室 */
  department(department: string): this {
    this.data.department = department;
    return this;
  }
  /** 设置标签 */
  tags(tags: string[]): this {
    this.data.tags = tags;
    return this;
  }
  /** 设置子分类 */
  subcategory(subcategory: string): this {
    this.data.subcategory = subcategory;
    return this;
  }
  /** 设置可信度 */
  confidenceScore(score: number): this {
    this.data.confidenceScore = score;
    return this;
  }
  /** 设置格式 */
  format(format: 'markdown' | 'txt' | 'json'): this {
    this.data.format = format;
    return this;
  }
  /** 构建 */
  build(): KnowledgeSource {
    return { ...this.data, version: { ...this.data.version } };
  }
}
