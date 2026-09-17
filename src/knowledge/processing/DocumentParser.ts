/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 文档解析器。
 * 支持 Markdown / TXT / JSON 格式，提取正文与元数据，识别文档结构
 * （标题层级、段落、列表、表格），为结构化切分提供依据。
 * PDF 解析预留（生产环境接入）。
 */

/** 文档块类型 */
export type DocumentBlockType =
  | 'heading' // 标题
  | 'paragraph' // 段落
  | 'list' // 列表
  | 'table' // 表格
  | 'frontmatter'; // 元数据块

/** 解析后的文档块 */
export interface DocumentBlock {
  /** 块类型 */
  type: DocumentBlockType;
  /** 标题层级（heading 块，1-6） */
  level?: number;
  /** 块文本内容 */
  text: string;
  /** 块在原文中的起始字符偏移 */
  start: number;
  /** 块在原文中的结束字符偏移 */
  end: number;
}

/** 从文档中提取的元数据 */
export interface DocumentMetadata {
  /** 标题 */
  title?: string;
  /** 作者 */
  author?: string;
  /** 发布/生效日期（YYYY-MM-DD） */
  date?: string;
  /** 来源/发布机构 */
  source?: string;
  /** 科室 */
  department?: string;
  /** 版本 */
  version?: string;
}

/** 解析后的结构化文档 */
export interface ParsedDocument {
  /** 文档块列表 */
  blocks: DocumentBlock[];
  /** 提取的元数据 */
  metadata: DocumentMetadata;
  /** 全文纯文本 */
  fullText: string;
}

/**
 * 从 Markdown frontmatter / 首行元数据中提取元数据。
 *
 * 支持形如 "标题：xxx" / "发布机构：xxx" / "日期：2024-01-01" 的行内元数据，
 * 也兼容 YAML frontmatter（--- 包裹）。
 *
 * @param lines - 文档行数组
 * @returns 提取到的元数据
 */
function extractMetadata(lines: string[]): DocumentMetadata {
  const meta: DocumentMetadata = {};
  const keyMap: Record<string, keyof DocumentMetadata> = {
    标题: 'title',
    title: 'title',
    作者: 'author',
    author: 'author',
    发布机构: 'source',
    来源: 'source',
    source: 'source',
    发布日期: 'date',
    日期: 'date',
    date: 'date',
    科室: 'department',
    department: 'department',
    版本: 'version',
    version: 'version',
  };

  // 仅在前 12 行内查找元数据键值
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const line = lines[i].trim();
    const m = /^([A-Za-z\u4e00-\u9fff]+)\s*[:：]\s*(.+)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const mapped = keyMap[key] ?? keyMap[m[1]];
    if (mapped && !meta[mapped]) {
      meta[mapped] = m[2].trim();
    }
  }
  return meta;
}

/**
 * 判断一行是否为 Markdown 表格行。
 *
 * @param line - 文本行
 * @returns 是否为表格行
 */
function isTableLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|') && t.includes('|');
}

/**
 * 判断一行是否为 Markdown 列表项。
 *
 * @param line - 文本行
 * @returns 是否为列表行
 */
function isListLine(line: string): boolean {
  return /^\s*([-*+]|\d+[.)、])\s+/.test(line);
}

/**
 * Markdown / TXT 文档解析器。
 *
 * 将非结构化正文解析为带类型的块序列，并抽取元数据。
 * JSON 输入则按字符串字段作为正文块处理（PDF 解析预留）。
 */
export class DocumentParser {
  /**
   * 解析文档内容。
   *
   * @param content - 文档原始文本
   * @param format - 文档格式（markdown / txt / json），默认 markdown
   * @returns 解析后的结构化文档
   */
  parse(content: string, format: 'markdown' | 'txt' | 'json' = 'markdown'): ParsedDocument {
    if (format === 'json') {
      return this.parseJson(content);
    }
    return this.parseMarkdown(content);
  }

  /**
   * 解析 Markdown / TXT 文本
   *
   * @param content - 原始文本
   * @returns 结构化文档
   */
  private parseMarkdown(content: string): ParsedDocument {
    const lines = content.split(/\r?\n/);
    const metadata = extractMetadata(lines);
    const blocks: DocumentBlock[] = [];

    // 跟踪字符偏移
    let offset = 0;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const lineStart = offset;
      const lineEnd = offset + line.length;
      offset = lineEnd + 1; // +1 for newline

      const trimmed = line.trim();

      // 空行跳过
      if (trimmed === '') {
        i++;
        continue;
      }

      // 标题
      const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
      if (headingMatch) {
        blocks.push({
          type: 'heading',
          level: headingMatch[1].length,
          text: headingMatch[2].trim(),
          start: lineStart,
          end: lineEnd,
        });
        i++;
        continue;
      }

      // 表格：合并连续表格行
      if (isTableLine(trimmed)) {
        const tableLines: string[] = [trimmed];
        const tableStart = lineStart;
        let tableEnd = lineEnd;
        i++;
        while (i < lines.length) {
          const next = lines[i].trim();
          if (next === '') break;
          if (isTableLine(next)) {
            const ns = offset;
            const ne = offset + lines[i].length;
            tableLines.push(next);
            tableEnd = ne;
            offset = ne + 1;
            i++;
          } else {
            break;
          }
        }
        blocks.push({
          type: 'table',
          text: tableLines.join('\n'),
          start: tableStart,
          end: tableEnd,
        });
        continue;
      }

      // 列表：合并连续列表行
      if (isListLine(trimmed)) {
        const listLines: string[] = [trimmed];
        const listStart = lineStart;
        let listEnd = lineEnd;
        i++;
        while (i < lines.length) {
          const next = lines[i].trim();
          if (next === '') break;
          if (isListLine(next)) {
            const ne = offset + lines[i].length;
            listLines.push(next);
            listEnd = ne;
            offset = ne + 1;
            i++;
          } else {
            break;
          }
        }
        blocks.push({
          type: 'list',
          text: listLines.join('\n'),
          start: listStart,
          end: listEnd,
        });
        continue;
      }

      // 普通段落：合并连续非空、非特殊行
      const paraLines: string[] = [trimmed];
      const paraStart = lineStart;
      let paraEnd = lineEnd;
      i++;
      while (i < lines.length) {
        const next = lines[i];
        const nextTrimmed = next.trim();
        if (nextTrimmed === '') break;
        if (/^(#{1,6})\s+/.test(nextTrimmed)) break;
        if (isTableLine(nextTrimmed)) break;
        if (isListLine(nextTrimmed)) break;
        const ne = offset + next.length;
        paraLines.push(nextTrimmed);
        paraEnd = ne;
        offset = ne + 1;
        i++;
      }
      blocks.push({
        type: 'paragraph',
        text: paraLines.join(' '),
        start: paraStart,
        end: paraEnd,
      });
    }

    return {
      blocks,
      metadata,
      fullText: content,
    };
  }

  /**
   * 解析 JSON 文档（提取字符串字段作为正文）
   *
   * @param content - JSON 文本
   * @returns 结构化文档
   */
  private parseJson(content: string): ParsedDocument {
    const blocks: DocumentBlock[] = [];
    const metadata: DocumentMetadata = {};
    try {
      const obj = JSON.parse(content) as Record<string, unknown>;
      if (typeof obj.title === 'string') metadata.title = obj.title;
      if (typeof obj.author === 'string') metadata.author = obj.author;
      if (typeof obj.date === 'string') metadata.date = obj.date;
      if (typeof obj.source === 'string') metadata.source = obj.source;
      if (typeof obj.department === 'string') metadata.department = obj.department;
      if (typeof obj.version === 'string') metadata.version = obj.version;

      // 正文字段
      const body =
        (typeof obj.content === 'string' && obj.content) ||
        (typeof obj.text === 'string' && obj.text) ||
        content;
      // 复用 Markdown 解析正文
      const inner = this.parseMarkdown(body);
      blocks.push(...inner.blocks);
      return { blocks, metadata, fullText: body };
    } catch {
      // JSON 解析失败：退化为纯文本
      return this.parseMarkdown(content);
    }
  }
}
