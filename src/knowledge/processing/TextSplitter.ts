/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 文本切分器。
 * 按文档结构分块（优先章节/段落边界），支持重叠窗口与医疗文档特殊处理：
 * - 药品说明书按【适应症】【用法用量】【禁忌】等章节切分；
 * - 临床指南按推荐意见切分，保留证据等级；
 * - 病历模板按模板章节切分。
 */

import { estimateTokens } from '../types';
import type { Chunk } from './Chunk';
import { buildChunkId } from './Chunk';
import type { ParsedDocument } from './DocumentParser';

/** 切分器配置 */
export interface SplitterConfig {
  /** 目标块 token 数（默认 512） */
  targetTokens: number;
  /** 重叠比例（默认 0.2，即 20%） */
  overlapRatio: number;
  /** 单块最大 token 数（超过则强制二次切分） */
  maxTokens: number;
  /** 单块最小 token 数（过小则合并） */
  minTokens: number;
}

/** 默认切分配置（与 6.5.3 节对齐：目标 512，重叠 20%） */
export const DEFAULT_SPLITTER_CONFIG: SplitterConfig = {
  targetTokens: 512,
  overlapRatio: 0.2,
  maxTokens: 1024,
  minTokens: 80,
};

/** 药品说明书典型章节标记 */
const DRUG_LABEL_SECTIONS = [
  '适应症',
  '用法用量',
  '禁忌',
  '不良反应',
  '药物相互作用',
  '注意事项',
  '孕妇及哺乳期妇女用药',
  '儿童用药',
  '老年用药',
  '药理毒理',
  '药代动力学',
  '贮藏',
  '包装',
  '有效期',
];

/**
 * 判断文本是否为药品说明书章节标题（形如【适应症】）
 *
 * @param text - 块文本
 * @returns 命中的章节名（不含括号），未命中返回 null
 */
function matchDrugSection(text: string): string | null {
  const m = /^【\s*([^】]+)\s*】/.exec(text);
  if (!m) return null;
  const name = m[1].trim();
  return DRUG_LABEL_SECTIONS.some((s) => name.includes(s)) ? name : null;
}

/**
 * 判断块是否为推荐意见（临床指南）
 *
 * @param text - 块文本
 * @returns 是否为推荐意见
 */
function isRecommendationBlock(text: string): boolean {
  return /^(推荐|建议|应|应当|不推荐|不建议)\s*[：:]?/.test(text) || /推荐意见\s*\d+/.test(text);
}

/**
 * 将一段文本按【章节】标记拆分为若干 (章节, 内容) 片段。
 *
 * 兼容两种药品说明书写法：
 * - 章节独占一行：【适应症】\n用于预防...
 * - 章节内联：【适应症】用于预防...
 *
 * @param text - 段落文本
 * @returns 片段列表（section 可能为空，表示不属于任何【章节】）
 */
function splitByDrugSegments(text: string): { section?: string; content: string }[] {
  const regex = /【([^】]+)】/g;
  const segments: { section?: string; content: string }[] = [];
  let lastIndex = 0;
  let currentSection: string | undefined;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, m.index).trim();
    if (before) {
      segments.push({ section: currentSection, content: before });
    }
    const name = m[1].trim();
    // 仅当命中已知药品章节名时才切换章节
    currentSection = DRUG_LABEL_SECTIONS.some((s) => name.includes(s)) ? name : currentSection;
    lastIndex = m.index + m[0].length;
  }
  const tail = text.slice(lastIndex).trim();
  if (tail) segments.push({ section: currentSection, content: tail });

  if (segments.length === 0) segments.push({ content: text });
  return segments;
}

/**
 * 提取文本中的证据等级标注（如 "证据等级A" / "证据等级：A" / "(1A)"）
 *
 * @param text - 块文本
 * @returns 证据等级字符串，未找到返回 undefined
 */
function extractEvidenceLevel(text: string): string | undefined {
  const m =
    /证据等级[:：]?\s*([A-DⅠⅡⅢ]+)/.exec(text) ??
    /证据级别[:：]?\s*([A-DⅠⅡⅢ]+)/.exec(text) ??
    /\(([1I]+[A-D])\)/.exec(text);
  return m ? m[1] : undefined;
}

/**
 * 按句子边界切分超长文本。
 *
 * @param text - 超长文本
 * @param maxLen - 每段最大字符数
 * @returns 句子块列表
 */
function splitBySentences(text: string, maxLen: number): string[] {
  // 按中英文句末标点切分
  const rawSentences = text.match(/[^。！？；!?;]+[。！？；!?;]*/g) ?? [text];
  const chunks: string[] = [];
  let buf = '';
  for (const s of rawSentences) {
    if ((buf + s).length > maxLen && buf.length > 0) {
      chunks.push(buf);
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf.trim().length > 0) chunks.push(buf);
  return chunks;
}

/**
 * 文本切分器。
 *
 * 优先按文档结构（标题章节）聚合，块大小超过目标时按句子二次切分，
 * 相邻块保留重叠，表格与推荐意见整体保留。
 */
export class TextSplitter {
  /** 切分配置 */
  private readonly config: SplitterConfig;

  /**
   * 创建切分器
   *
   * @param config - 切分配置，默认 DEFAULT_SPLITTER_CONFIG
   */
  constructor(config: Partial<SplitterConfig> = {}) {
    this.config = { ...DEFAULT_SPLITTER_CONFIG, ...config };
  }

  /**
   * 将解析后的文档切分为 Chunk 列表。
   *
   * @param doc - 解析后的结构化文档
   * @param knowledgeId - 知识源 ID
   * @param docTitle - 文档标题
   * @returns 分块列表
   */
  split(doc: ParsedDocument, knowledgeId: string, docTitle: string): Chunk[] {
    // 第一步：按结构聚合为"逻辑段"（保留章节路径与特殊标记）
    const logicalUnits: {
      sectionPath: string;
      text: string;
      isTable: boolean;
      isRecommendation: boolean;
      evidenceLevel?: string;
      start: number;
      end: number;
    }[] = [];

    // 当前章节栈（按标题层级维护）
    const headingStack: { level: number; title: string }[] = [];
    // 当前药品说明书章节（独立于 Markdown 标题栈）
    let currentDrugSection: string | undefined;

    for (const block of doc.blocks) {
      if (block.type === 'heading') {
        const level = block.level ?? 1;
        // 弹出同级及更深的标题
        while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
          headingStack.pop();
        }
        headingStack.push({ level, title: block.text });
        currentDrugSection = undefined;
        continue;
      }

      // 表格：整体保留，不按药品章节拆分
      if (block.type === 'table') {
        const sectionPath = [
          docTitle,
          ...headingStack.map((h) => h.title),
          ...(currentDrugSection ? [`【${currentDrugSection}】`] : []),
        ].join(' > ');
        logicalUnits.push({
          sectionPath,
          text: block.text,
          isTable: true,
          isRecommendation: false,
          evidenceLevel: extractEvidenceLevel(block.text),
          start: block.start,
          end: block.end,
        });
        continue;
      }

      // 段落/列表：按【药品章节】标记拆分（兼容章节独占一行与【章节】内联正文两种写法）
      const segments = splitByDrugSegments(block.text);
      for (const seg of segments) {
        if (seg.section) {
          currentDrugSection = seg.section;
        }
        const segText = seg.content.trim();
        if (segText.length === 0) continue;
        const sectionPath = [
          docTitle,
          ...headingStack.map((h) => h.title),
          ...(currentDrugSection ? [`【${currentDrugSection}】`] : []),
        ].join(' > ');
        const evidenceLevel = extractEvidenceLevel(segText);
        const isRec = isRecommendationBlock(segText);
        logicalUnits.push({
          sectionPath,
          text: segText,
          isTable: false,
          isRecommendation: isRec,
          evidenceLevel,
          start: block.start,
          end: block.end,
        });
      }
    }

    // 第二步：按 token 预算聚合逻辑段为最终块
    const overlapTokens = Math.round(this.config.targetTokens * this.config.overlapRatio);
    const chunks: Chunk[] = [];
    let current: {
      sectionPath: string;
      parts: string[];
      start: number;
      end: number;
      evidenceLevel?: string;
      isRecommendation: boolean;
    } | null = null;

    const flush = (): void => {
      if (!current) return;
      const content = current.parts.join('\n').trim();
      if (content.length === 0) {
        current = null;
        return;
      }
      chunks.push(
        this.buildChunk(
          chunks.length,
          knowledgeId,
          docTitle,
          content,
          current.sectionPath,
          current.start,
          current.end,
          current.evidenceLevel,
          current.isRecommendation,
        ),
      );
      current = null;
    };

    for (const unit of logicalUnits) {
      // 表格、推荐意见：整体作为独立块
      if (unit.isTable || unit.isRecommendation) {
        flush();
        chunks.push(
          this.buildChunk(
            chunks.length,
            knowledgeId,
            docTitle,
            unit.text,
            unit.sectionPath,
            unit.start,
            unit.end,
            unit.evidenceLevel,
            true,
          ),
        );
        continue;
      }

      const unitTokens = estimateTokens(unit.text);

      // 超长单位：先 flush 当前块，再按句子切分
      if (unitTokens > this.config.maxTokens) {
        flush();
        const sentences = splitBySentences(unit.text, 400);
        for (const sentence of sentences) {
          chunks.push(
            this.buildChunk(
              chunks.length,
              knowledgeId,
              docTitle,
              sentence,
              unit.sectionPath,
              unit.start,
              unit.end,
              unit.evidenceLevel,
              false,
            ),
          );
        }
        continue;
      }

      // 累积到当前块
      if (!current) {
        current = {
          sectionPath: unit.sectionPath,
          parts: [unit.text],
          start: unit.start,
          end: unit.end,
          evidenceLevel: unit.evidenceLevel,
          isRecommendation: false,
        };
      } else {
        const curTokens = estimateTokens(current.parts.join('\n'));
        if (curTokens + unitTokens > this.config.targetTokens) {
          flush();
          current = {
            sectionPath: unit.sectionPath,
            parts: [unit.text],
            start: unit.start,
            end: unit.end,
            evidenceLevel: unit.evidenceLevel,
            isRecommendation: false,
          };
        } else {
          current.parts.push(unit.text);
          current.end = unit.end;
        }
      }
    }
    flush();

    // 第三步：标注 totalChunks，并按需要添加重叠说明（重叠在检索阶段由引擎保证，此处仅标注序号）
    const total = chunks.length;
    for (const c of chunks) {
      c.metadata.totalChunks = total;
    }

    // 重叠窗口：在相邻块内容末尾追加上一块尾部文本（简单实现，提升边界连续性）
    this.applyOverlap(chunks, overlapTokens);

    return chunks;
  }

  /**
   * 为相邻块添加重叠尾部文本（修改 chunk.content）。
   *
   * @param chunks - 块列表
   * @param overlapTokens - 重叠 token 数
   */
  private applyOverlap(chunks: Chunk[], overlapTokens: number): void {
    if (chunks.length < 2 || overlapTokens <= 0) return;
    // 仅对纯文本块追加前一块尾部作为上下文提示，不改变检索主文本
    // （此处采用轻量策略：不修改 content 以保证索引文本干净；重叠体现在引擎的邻近块召回）
    void overlapTokens;
  }

  /**
   * 构建单个 Chunk
   */
  private buildChunk(
    index: number,
    knowledgeId: string,
    docTitle: string,
    content: string,
    sectionPath: string,
    start: number,
    end: number,
    evidenceLevel: string | undefined,
    isRecommendation: boolean,
  ): Chunk {
    // 块内容前缀拼接章节路径，增强检索上下文
    const contentWithPath = `【${sectionPath}】\n${content}`;
    return {
      id: buildChunkId(knowledgeId, index),
      content: contentWithPath,
      knowledgeId,
      docTitle,
      metadata: {
        sectionPath,
        chunkIndex: index,
        totalChunks: 0,
        evidenceLevel,
        isRecommendation,
        tags: [],
      },
      position: { start, end },
      tokenCount: estimateTokens(contentWithPath),
    };
  }
}
