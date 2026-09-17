/**
 * 健澜科技杠OS — 知识加工流水线
 *
 * 阶段：parse → clean → split → normalize → entity → relation → embed → ingest
 * 纯函数/可注入设计：解析器按文件格式分派，实体/关系抽取默认采用「医学词典 + 规则」的离线实现，
 * 生产可替换为 NER/RE 模型；向量化默认 HashingEncoder，可替换为真实 Embedding。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type KnowledgeChunk,
  type PipelineReport,
  type RawDocument,
  type ChunkOptions,
} from '../types';
import { type Encoder, estimateTokens, shortId, tokenize } from '../util';

// ----------------------------------------------------------------------------
// 1. 解析：将不同格式归一化为纯文本 + 章节结构（二进制格式给出降级文本提取）
// ----------------------------------------------------------------------------

export interface ParsedDocument {
  title: string;
  text: string;
  sections: Array<{ heading: string; level: number; start: number }>;
}

/** 从文本中识别标题层级（支持 markdown、中文"第X章/一、"、数字编号） */
export function detectHeadings(text: string): ParsedDocument['sections'] {
  const lines = text.split(/\r?\n/);
  const sections: ParsedDocument['sections'] = [];
  let offset = 0;
  const patterns: Array<[RegExp, number]> = [
    [/^#{1,3}\s+.+/, 0], // markdown，层级另行计算
    [/^第[一二三四五六七八九十百0-9]+[章节部分].*/, 1],
    [/^[一二三四五六七八九十]+[、.].*/, 2],
    [/^\d+(\.\d+){0,2}[\s、].+/, 3],
  ];
  for (const line of lines) {
    const md = /^#{1,3}\s+(.+)/.exec(line);
    if (md) {
      sections.push({ heading: md[1].trim(), level: (line.match(/^#+/)?.[0].length ?? 1), start: offset });
    } else {
      for (const [re, level] of patterns.slice(1)) {
        if (re.test(line.trim())) {
          sections.push({ heading: line.trim().replace(/^#+\s*/, ''), level, start: offset });
          break;
        }
      }
    }
    offset += line.length + 1;
  }
  return sections;
}

/** 极简文档解析：txt/md/html/json 直接抽取；pdf/docx/xlsx 由上层传入抽取后文本或降级占位 */
export function parseDocument(doc: RawDocument): ParsedDocument {
  let text = doc.content ?? '';
  switch (doc.format) {
    case 'html':
      text = text
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      break;
    case 'json':
      try {
        const obj = JSON.parse(text) as unknown;
        text = flattenJsonToText(obj);
      } catch {
        /* 保留原文 */
      }
      break;
    case 'csv':
      text = text.replace(/,/g, '，').replace(/"/g, '');
      break;
    case 'pdf':
    case 'docx':
    case 'xlsx':
      // 离线环境不内置重型二进制解析；若 content 为占位路径，调用方应先用解析适配器抽取文本。
      if (!text || text.startsWith('binary:')) text = `【${doc.title}】（${doc.format} 文档，请在导入时启用对应解析适配器抽取正文）`;
      break;
    default:
      break;
  }
  text = text.replace(/\r\n/g, '\n');
  return { title: doc.title, text, sections: detectHeadings(text) };
}

function flattenJsonToText(obj: unknown, prefix = ''): string {
  if (obj == null) return '';
  if (typeof obj !== 'object') return `${prefix} ${String(obj)}`.trim();
  if (Array.isArray(obj)) {
    return obj.slice(0, 200).map((it) => flattenJsonToText(it, prefix)).filter(Boolean).join('\n');
  }
  return Object.entries(obj as Record<string, unknown>)
    .map(([k, v]) => flattenJsonToText(v, prefix ? `${prefix}·${k}` : k))
    .filter(Boolean)
    .join('\n');
}

// ----------------------------------------------------------------------------
// 2. 清洗
// ----------------------------------------------------------------------------

export function cleanText(text: string): string {
  return text
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[�]{2,}/g, '')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
}

// ----------------------------------------------------------------------------
// 3. 切分
// ----------------------------------------------------------------------------

export function chunkText(text: string, sections: ParsedDocument['sections'], opts: ChunkOptions): Array<{ content: string; sectionPath?: string; index: number }> {
  const size = opts.chunkSize ?? 800;
  const overlap = opts.overlap ?? 80;

  if (opts.strategy === 'section' && sections.length > 1) {
    return splitBySections(text, sections);
  }
  if (opts.strategy === 'sentence') {
    return splitBySentence(text, size, overlap);
  }
  // fixed / structure 兜底：滑窗
  return slidingWindow(text, size, overlap);
}

function sectionPathAt(sections: ParsedDocument['sections'], offset: number): string | undefined {
  let current: string | undefined;
  for (const s of sections) {
    if (s.start <= offset) current = s.heading;
    else break;
  }
  return current;
}

function splitBySections(text: string, sections: ParsedDocument['sections']): Array<{ content: string; sectionPath?: string; index: number }> {
  const bounds = sections.map((s) => s.start).concat([text.length]);
  const out: Array<{ content: string; sectionPath?: string; index: number }> = [];
  for (let i = 0; i < sections.length; i++) {
    const seg = text.slice(bounds[i], bounds[i + 1]).trim();
    if (seg) out.push({ content: seg, sectionPath: sections[i].heading, index: out.length });
  }
  if (out.length === 0) return [{ content: text, index: 0 }];
  return out;
}

function splitBySentence(text: string, size: number, overlap: number): Array<{ content: string; sectionPath?: string; index: number }> {
  const sentences = text.split(/(?<=[。！？!?；;\n])/);
  const out: Array<{ content: string; index: number }> = [];
  let buf = '';
  for (const s of sentences) {
    if ((buf + s).length > size && buf) {
      out.push({ content: buf.trim(), index: out.length });
      buf = buf.slice(Math.max(0, buf.length - overlap)) + s;
    } else {
      buf += s;
    }
  }
  if (buf.trim()) out.push({ content: buf.trim(), index: out.length });
  return out.length ? out : [{ content: text, index: 0 }];
}

function slidingWindow(text: string, size: number, overlap: number): Array<{ content: string; sectionPath?: string; index: number }> {
  const out: Array<{ content: string; index: number }> = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    const piece = text.slice(start, end).trim();
    if (piece) out.push({ content: piece, index: out.length });
    if (end >= text.length) break;
    start += size - overlap;
  }
  return out.length ? out : [{ content: text, index: 0 }];
}

// ----------------------------------------------------------------------------
// 4. 标准化（医学书写归一）
// ----------------------------------------------------------------------------

const NORMALIZE_RULES: Array<[RegExp, string]> = [
  [/[\u3000\s]+/g, ''],
  [/Ⅱ/g, 'II'],
  [/Ⅲ/g, 'III'],
  [/Ⅳ/g, 'IV'],
  [/Ⅰ/g, 'I'],
  [/（/g, '('],
  [/）/g, ')'],
  [/，/g, ','],
];

export function normalizeTerm(raw: string): string {
  let t = raw.trim();
  for (const [re, rep] of NORMALIZE_RULES) t = t.replace(re, rep);
  return t;
}

// ----------------------------------------------------------------------------
// 5. 实体 / 关系抽取（词典 + 规则，离线可跑；可被 NER 模型替换）
// ----------------------------------------------------------------------------

export interface ExtractionResult {
  entities: Array<{ name: string; type: string }>;
  relations: Array<{ from: string; to: string; type: string }>;
}

/** 内置高置信医学线索词（用于离线演示，生产由知识图谱实体词典驱动） */
const LEXICON: Array<[RegExp, string]> = [
  [/[一-鿿]{2,8}(综合征|症|炎|瘤|癌|病|结石|梗阻|衰竭|骨折|损伤)/g, 'disease'],
  [/[一-鿿]{1,8}(疼痛|发热|咳嗽|水肿|头晕|恶心|呕吐|腹泻|便秘|黄疸|心悸|呼吸困难|乏力)/g, 'symptom'],
  [/[一-鿿]{2,12}(片|胶囊|注射液|颗粒|口服液|滴丸|软膏|喷雾剂|糖浆|混悬液)/g, 'drug'],
  [/(血常规|尿常规|肝功能|肾功能|电解质|血糖|CT|MRI|超声|心电图|胸片|凝血功能)/g, 'examination'],
  [/(切除术|吻合术|造影术|支架植入术|引流术|缝合术)/g, 'procedure'],
];

const RELATION_PATTERNS: Array<[RegExp, string]> = [
  [/([一-鿿]{2,10}(?:片|胶囊|注射液|颗粒))[^。；]*(?:治疗|用于|改善)([一-鿿]{2,12}(?:综合征|症|炎|病|瘤|癌))/g, 'treats'],
  [/([一-鿿]{2,10}(?:综合征|症|炎|病))[^。；]*(?:表现为|出现|伴)([一-鿿]{1,8}(?:疼痛|发热|咳嗽|水肿))/g, 'has_symptom'],
  [/([一-鿿]{2,10}(?:片|胶囊))[^。；]*(?:禁忌|禁用|不宜)([一-鿿]{2,10})/g, 'contraindicates'],
];

export class RuleBasedExtractor {
  extract(text: string): ExtractionResult {
    const found = new Map<string, string>();
    for (const [re, type] of LEXICON) {
      const matches = text.match(re) ?? [];
      for (const m of matches.slice(0, 50)) {
        const name = m.trim();
        if (name && !found.has(name)) found.set(name, type);
      }
    }
    const entities = [...found.entries()].map(([name, type]) => {
      return { name, type };
    });
    const relations: ExtractionResult['relations'] = [];
    for (const [re, type] of RELATION_PATTERNS) {
      for (const m of text.matchAll(re)) {
        if (m[1] && m[2]) relations.push({ from: m[1], to: m[2], type });
      }
    }
    return { entities, relations };
  }
}

// ----------------------------------------------------------------------------
// 6. 流水线编排
// ----------------------------------------------------------------------------

export interface IngestDeps {
  encoder: Encoder;
  extractor?: RuleBasedExtractor;
}

export function buildChunks(doc: RawDocument, opts: ChunkOptions, deps: IngestDeps): { chunks: KnowledgeChunk[]; report: PipelineReport; extraction: ExtractionResult } {
  const startedAt = new Date().toISOString();
  const report: PipelineReport = { documentId: doc.id, startedAt, stages: {}, chunks: 0, entities: 0, relations: 0, qualityScore: 0 };
  const mark = (stage: keyof PipelineReport['stages'], t0: number, ok = true, message?: string) => {
    report.stages[stage] = { ms: Date.now() - t0, ok, message };
  };

  let t0 = Date.now();
  const parsed = parseDocument(doc);
  mark('parse', t0);

  t0 = Date.now();
  const cleaned = cleanText(parsed.text);
  mark('clean', t0);

  t0 = Date.now();
  const pieces = chunkText(cleaned, parsed.sections, opts);
  mark('split', t0);

  t0 = Date.now();
  const normalized = pieces.map((p) => ({ ...p, content: p.content }));
  mark('normalize', t0);

  t0 = Date.now();
  const extractor = deps.extractor ?? new RuleBasedExtractor();
  const extraction = extractor.extract(cleaned);
  mark('entity', t0);
  report.entities = extraction.entities.length;
  report.relations = extraction.relations.length;

  t0 = Date.now();
  const chunks: KnowledgeChunk[] = normalized.map((p) => {
    const vector = deps.encoder.embed(p.content);
    return {
      id: shortId('chk'),
      documentId: doc.id,
      knowledgeBaseId: doc.knowledgeBaseId,
      content: p.content,
      sectionPath: p.sectionPath,
      chunkIndex: p.index,
      tokens: estimateTokens(p.content),
      vector,
      entities: extraction.entities.map((e) => e.name),
      metadata: { title: doc.title, tags: doc.tags, ...doc.provenance },
      provenance: doc.provenance,
      tenantId: doc.tenantId,
    };
  });
  mark('embed', t0);

  report.chunks = chunks.length;
  report.finishedAt = new Date().toISOString();
  report.qualityScore = scoreQuality(cleaned, chunks, extraction);
  return { chunks, report, extraction };
}

function scoreQuality(text: string, chunks: KnowledgeChunk[], extraction: ExtractionResult): number {
  let score = 0.4;
  if (text.length > 200) score += 0.2;
  if (chunks.length > 0 && chunks.every((c) => c.content.length > 30)) score += 0.2;
  if (extraction.entities.length > 0) score += 0.1;
  if (new Set(tokenize(text)).size > 20) score += 0.1;
  return Math.min(1, Number(score.toFixed(2)));
}
