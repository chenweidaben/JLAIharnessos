/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 查询理解（Query Understanding）。
 * 负责查询改写（同义词扩展、医学术语标准化）、意图识别、关键词提取，
 * 并生成检索过滤器（科室、文档类型、时间范围）。
 */

import type {
  DocumentCategory,
  MetadataFilter,
  QueryIntent,
  QueryUnderstandingResult,
} from '../types';

/** 医学术语同义词表（口语/缩写 → 规范术语） */
const SYNONYMS: readonly { aliases: string[]; canonical: string }[] = [
  { aliases: ['心梗', '心肌梗死', '心肌梗塞'], canonical: '心肌梗死' },
  { aliases: ['心衰', '心力衰竭'], canonical: '心力衰竭' },
  { aliases: ['脑梗', '脑梗死', '中风'], canonical: '脑梗死' },
  { aliases: ['高血压病', '血压高', '高压'], canonical: '高血压' },
  { aliases: ['糖尿病', 'DM'], canonical: '2型糖尿病' },
  { aliases: ['冠心病', 'CAD'], canonical: '冠状动脉粥样硬化性心脏病' },
  { aliases: ['慢阻肺', 'COPD'], canonical: '慢性阻塞性肺疾病' },
  { aliases: ['阿司匹林', '拜阿司匹林'], canonical: '阿司匹林' },
  { aliases: ['阿托伐他汀', '立普妥'], canonical: '阿托伐他汀' },
  { aliases: ['美托洛尔', '倍他乐克'], canonical: '美托洛尔' },
  { aliases: ['氯吡格雷', '波立维'], canonical: '氯吡格雷' },
  { aliases: ['左氧氟沙星', '左克'], canonical: '左氧氟沙星' },
  { aliases: ['胸痛', '胸口痛', '胸闷'], canonical: '胸痛' },
];

/** 意图关键词 → 意图映射 */
const INTENT_KEYWORDS: readonly { intent: QueryIntent; keywords: string[] }[] = [
  { intent: 'diagnosis', keywords: ['诊断', '鉴别', '病因', '症状', '临床表现', '是什么', '确诊'] },
  { intent: 'treatment', keywords: ['治疗', '方案', '处理', '怎么治', '干预', '管理', '目标'] },
  {
    intent: 'medication',
    keywords: ['用药', '药物', '剂量', '不良反应', '禁忌', '相互作用', '说明书', 'mg', '毫克'],
  },
  {
    intent: 'examination',
    keywords: ['检查', '检验', '指标', '化验', '影像', 'CT', '心电图', '实验室'],
  },
  { intent: 'procedure', keywords: ['操作', '手术', '穿刺', '介入', '流程', '步骤'] },
  {
    intent: 'management',
    keywords: ['制度', '规程', '查房', '讨论', '职责', '管理', '首诊', '流程'],
  },
];

/** 意图 → 倾向的文档分类 */
const INTENT_CATEGORY_HINT: Partial<Record<QueryIntent, DocumentCategory[]>> = {
  medication: ['药品说明书', '临床指南'],
  management: ['医院制度', '临床路径'],
  diagnosis: ['临床指南', '教材'],
  treatment: ['临床指南', '临床路径'],
};

/**
 * 查询理解器。
 *
 * 将医生的自然语言问题转化为结构化检索请求：
 * 意图识别 → 术语标准化/同义词扩展 → 关键词提取 → 过滤器生成。
 */
export class QueryUnderstanding {
  /**
   * 解析查询。
   *
   * @param query - 原始自然语言查询
   * @param baseFilter - 外部传入的基础过滤器（如指定科室、文档类型）
   * @returns 查询理解结果
   */
  understand(query: string, baseFilter?: MetadataFilter): QueryUnderstandingResult {
    const originalQuery = query.trim();

    // 1. 术语标准化：把别名替换为规范术语，并追加规范术语到查询
    let rewritten = originalQuery;
    const canonicalTerms: string[] = [];
    for (const syn of SYNONYMS) {
      for (const alias of syn.aliases) {
        if (originalQuery.includes(alias) && !rewritten.includes(syn.canonical)) {
          rewritten += ` ${syn.canonical}`;
          canonicalTerms.push(syn.canonical);
          break;
        }
      }
    }

    // 2. 意图识别
    const intent = this.classifyIntent(originalQuery);

    // 3. 关键词提取（中文 bigram + 规范术语 + 英文词）
    const keywords = this.extractKeywords(originalQuery, canonicalTerms);

    // 4. 生成过滤器
    const filter: MetadataFilter = { ...(baseFilter ?? {}) };
    const categoryHint = INTENT_CATEGORY_HINT[intent];
    if (categoryHint && (!filter.categories || filter.categories.length === 0)) {
      filter.categories = categoryHint;
    }

    return {
      originalQuery,
      rewrittenQuery: rewritten,
      keywords,
      intent,
      filter,
    };
  }

  /**
   * 识别查询意图
   *
   * @param query - 查询文本
   * @returns 意图
   */
  private classifyIntent(query: string): QueryIntent {
    let best: QueryIntent = 'general';
    let bestHits = 0;
    for (const item of INTENT_KEYWORDS) {
      let hits = 0;
      for (const kw of item.keywords) {
        if (query.includes(kw)) hits++;
      }
      if (hits > bestHits) {
        bestHits = hits;
        best = item.intent;
      }
    }
    return best;
  }

  /**
   * 提取检索关键词。
   *
   * 结合规范术语与中文二元组，供 BM25 关键词检索使用。
   *
   * @param query - 查询文本
   * @param canonicalTerms - 已识别的规范术语
   * @returns 关键词列表（去重）
   */
  private extractKeywords(query: string, canonicalTerms: string[]): string[] {
    const set = new Set<string>(canonicalTerms);

    // 规范术语本身优先
    for (const syn of SYNONYMS) {
      if (query.includes(syn.canonical)) set.add(syn.canonical);
      for (const alias of syn.aliases) {
        if (query.includes(alias)) set.add(alias);
      }
    }

    // 中文二元组
    const cjk = query.match(/[\u4e00-\u9fff]/g);
    if (cjk) {
      for (let i = 0; i < cjk.length - 1; i++) {
        set.add(cjk[i] + cjk[i + 1]);
      }
    }

    // 英文/数字词
    const words = query.match(/[A-Za-z][A-Za-z0-9]+/g);
    if (words) {
      for (const w of words) set.add(w.toLowerCase());
    }

    return Array.from(set).filter((k) => k.length >= 1);
  }
}
