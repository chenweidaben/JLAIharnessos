/**
 * 健澜科技 jlmedaios - 智能经验问答聚合器（M118-B，依据宪法第七章）
 *
 * 面向全院员工的自然语言问答（Ask Muse）：把「高警示药品怎么核对」这类口语化
 * 提问，在医院层已脱敏知识库（HospitalKnowledgeEntry）中做关键词匹配，并按
 * 提问人岗位角色 / 所在科室做加权，输出一段可直接阅读的答案 + 可溯源来源列表 +
 * 0~1 置信度。失败经验（教训）在答案中显式标注警示。
 *
 * 医疗安全与隐私红线（依据宪法第七章）：
 *  - 检索对象为医院层已脱敏条目，不包含作者工号 / 姓名等个人标识符；
 *  - 答案为院内经验的辅助参考，不改变医嘱、不强制改派诊疗方案；
 *  - 每条答案必须附带 sources（来源 id / 角色 / 科室），全程可溯源；
 *  - 纯函数：不触库、不碰 WebSocket、零新增依赖，结果确定可单测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  KNOWLEDGE_ROLES,
  type HospitalKnowledgeEntry,
  type KnowledgeRole,
} from './hospitalKnowledgeAggregator';

/* ------------------------------- 类型契约 ------------------------------- */

/** 来源角色中文映射（答案拼接与前端展示共用） */
export const ROLE_LABEL_ZH: Record<KnowledgeRole, string> = {
  doctor: '医生',
  nurse: '护士',
  pharma: '药师',
  admin: '行政质控',
};

/** 答案溯源条目（在原始条目上附加命中分） */
export interface ExperienceQaSource {
  /** 条目 id */
  id: string;
  /** 条目标题 */
  title: string;
  /** 来源角色 */
  sourceRole: KnowledgeRole;
  /** 来源科室编码 */
  deptCode: string;
  /** 是否失败经验（教训） */
  isLesson: boolean;
  /** 命中分（标题命中 +3，正文命中 +1） */
  score: number;
}

/** askExperience 返回信封 */
export interface ExperienceQaResult {
  /** 拼接后的可读答案；无命中时为兜底提示语 */
  answer: string;
  /** 命中来源列表（按命中分降序，最多 3 条）；无命中为空数组 */
  sources: ExperienceQaSource[];
  /** 置信度 0~1；无命中为 0 */
  confidence: number;
  /** 是否命中任何经验 */
  matched: boolean;
}

/* ------------------------------ 工具函数 ------------------------------ */

/** 问句中的口语疑问词 / 助词（去除后再分词，避免把「怎么」当成关键词） */
const STOP_WORDS =
  /(怎么|怎样|怎么样|如何|为什么|为何|什么|哪些|多少|吗|呢|啊|呀|哦|的|了|我|我们|请|请问|问一下|关于|一下|的时候|的时候)/g;

/**
 * tokenizeQuery：把自然语言问句切成关键词数组（依据宪法第七章：确定性、可单测）。
 *
 * 口径：去空白 → 去掉疑问词 / 助词 → 按空白与中英文标点切分 → 去重、去空串。
 * 不引入任何分词库（零新增依赖），对「高警示药品怎么核对」返回 ['高警示药品','核对']。
 */
export function tokenizeQuery(query: string | undefined): string[] {
  const raw = (query ?? '').trim().toLowerCase();
  if (!raw) return [];
  const cleaned = raw.replace(STOP_WORDS, ' ');
  const terms = cleaned
    .split(/[\s,，。、？?！!；;：:（）()《》〈〉「」"'`~]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return Array.from(new Set(terms));
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * askExperience：智能经验问答（依据宪法第七章）。
 *
 * 口径：
 *  1. 问句经 tokenizeQuery 切词；无有效词 → 直接返回「未命中」兜底答案；
 *  2. 对每条经验：逐词在 title（权重 +3）/ content（权重 +1）中做包含匹配；
 *     命中词占比（coverage）为 0 的条目直接丢弃；
 *  3. 加权：提问人角色与来源角色一致 +0.15；提问人科室与来源科室一致 +0.15；
 *     条目自身 successRate（0~1）以 0.1 权重计入；教训条目额外 +0.05 优先；
 *  4. 置信度 = clamp(0.25 + 0.35*coverage + roleBoost + deptBoost
 *     + 0.1*successRate + lessonBonus, 0, 1)；
 *  5. 排序：置信度降序 → 命中分降序 → 标题字典序；取 Top1 拼答案，Top3 入 sources；
 *  6. 纯函数：不修改入参数组 / 对象，返回新对象。
 *
 * @param query         自然语言问句（可空）
 * @param staffRole     提问人岗位角色（doctor/nurse/pharma/admin，非法值忽略加权）
 * @param deptCode      提问人所在科室编码（空值忽略加权）
 * @param allExperiences 医院层已脱敏经验条目数组
 * @returns { answer, sources, confidence, matched }
 */
export function askExperience(
  query: string | undefined,
  staffRole: string | undefined,
  deptCode: string | undefined,
  allExperiences: readonly HospitalKnowledgeEntry[],
): ExperienceQaResult {
  const terms = tokenizeQuery(query);
  const roleFilter = KNOWLEDGE_ROLES.includes(staffRole as KnowledgeRole)
    ? (staffRole as KnowledgeRole)
    : undefined;
  const deptFilter = (deptCode ?? '').trim().toLowerCase();

  // 空问句：直接兜底（依据宪法第七章：不编造经验）
  if (terms.length === 0) {
    return {
      answer: '请输入您的问题，例如「高警示药品怎么双人核对」「跌倒高危如何交班」。',
      sources: [],
      confidence: 0,
      matched: false,
    };
  }

  interface Scored extends HospitalKnowledgeEntry {
    hitTerms: number;
    coverage: number;
    hitScore: number;
    roleBoost: number;
    deptBoost: number;
    lessonBonus: number;
    confidence: number;
  }

  const scored: Scored[] = [];
  for (const entry of allExperiences ?? []) {
    const title = entry.title.toLowerCase();
    const content = entry.content.toLowerCase();
    let hitTerms = 0;
    let hitScore = 0;
    for (const term of terms) {
      if (title.includes(term)) {
        hitTerms += 1;
        hitScore += 3;
      } else if (content.includes(term)) {
        hitTerms += 1;
        hitScore += 1;
      }
    }
    if (hitTerms === 0) continue; // 该条经验与问句无任何交集

    const coverage = hitTerms / terms.length;
    const roleBoost = roleFilter && entry.sourceRole === roleFilter ? 0.15 : 0;
    const deptBoost = deptFilter && entry.deptCode.toLowerCase() === deptFilter ? 0.15 : 0;
    const lessonBonus = entry.isLesson ? 0.05 : 0;

    let confidence =
      0.25 + 0.35 * coverage + roleBoost + deptBoost + 0.1 * entry.successRate + lessonBonus;
    confidence = Math.max(0, Math.min(1, confidence));

    scored.push({ ...entry, hitTerms, coverage, hitScore, roleBoost, deptBoost, lessonBonus, confidence });
  }

  // 排序：置信度降序 → 命中分降序 → 标题字典序升序（结果确定、可单测）
  scored.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (b.hitScore !== a.hitScore) return b.hitScore - a.hitScore;
    return a.title.localeCompare(b.title);
  });

  // 无命中：兜底答案（依据宪法第七章：不臆造经验）
  if (scored.length === 0) {
    return {
      answer: `院内知识库中暂未检索到与「${(query ?? '').trim()}」直接相关的经验，建议换个问法，或联系科室秘书 / 质控员补充沉淀。`,
      sources: [],
      confidence: 0,
      matched: false,
    };
  }

  const top = scored[0];
  const roleZh = ROLE_LABEL_ZH[top.sourceRole] ?? top.sourceRole;
  const lessonTag = top.isLesson ? '【教训警示】' : '';
  const answer =
    `${lessonTag}根据院内经验《${top.title}》（来源：${roleZh} · ${top.deptCode}）：${top.content}` +
    `\n（该经验采纳成功率 ${(top.successRate * 100).toFixed(0)}%，累计使用 ${top.usageCount} 次，仅供参考，不替代临床判断）`;

  const sources: ExperienceQaSource[] = scored.slice(0, 3).map((e) => ({
    id: e.id,
    title: e.title,
    sourceRole: e.sourceRole,
    deptCode: e.deptCode,
    isLesson: e.isLesson,
    score: e.hitScore,
  }));

  return {
    answer,
    sources,
    confidence: Math.round(top.confidence * 100) / 100,
    matched: true,
  };
}
