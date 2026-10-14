/**
 * MEDMUSE 知识中台 RAG - 院内规章制度/临床路径关键词检索（纯函数，无向量依赖）。
 *
 * 医疗安全：
 *   - 只读检索，不连接数据库、不调用向量模型；
 *   - 数据源为内置演示知识条目（demo:true），后续可无缝替换为真实知识表/repo；
 *   - 命中结果仅用于在聊天回复尾部追加「参考依据」引用块，不改变诊疗结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 单条知识条目 */
export interface KnowledgeEntry {
  title: string;
  snippet: string;
  source: string;
  /** ISO yyyy-mm-dd */
  updatedAt: string;
  tags: string[];
  /** demo 数据标记：真实知识表接入后置 false */
  demo: boolean;
}

/** 检索命中（追加给用户的引用形态） */
export interface KnowledgeHit {
  title: string;
  snippet: string;
  source: string;
  updatedAt: string;
  demo?: boolean;
}

/**
 * 内置演示知识库：覆盖抗菌药物分级管理、临床路径入径标准、知情同意范围等
 * 院内高频咨询的规章制度。稳定不变，便于单测与演示。
 */
export const DEMO_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    title: '抗菌药物分级管理办法',
    snippet:
      '抗菌药物实行非限制使用级、限制使用级与特殊使用级三级管理。特殊使用级抗菌药物须经抗菌药物管理工作组审批，由具有高级职称的医师开具，门诊不得使用；紧急情况下越级使用应在24小时内补办手续。',
    source: '医务处·院内制度',
    updatedAt: '2025-06-01',
    tags: ['抗菌药物', '分级管理', '特殊使用级', '处方权', '越级使用'],
    demo: true,
  },
  {
    title: '临床路径入径与出径标准',
    snippet:
      '符合路径诊断标准且无严重合并症的患者，应在入院24小时内完成入径；出现严重并发症、患者要求出院或诊断变更时按规范出径。临床路径入径率、完成率与变异率纳入科室月度质控考核。',
    source: '医务处·临床路径管理',
    updatedAt: '2025-03-15',
    tags: ['临床路径', '入径', '出径', '变异', '质控'],
    demo: true,
  },
  {
    title: '知情同意书签署范围与要求',
    snippet:
      '手术、麻醉、特殊检查、特殊治疗、临床试验及高值医用耗材使用前须签署知情同意书。告知内容包括病情、拟采取的医疗措施、风险、替代方案与大致费用，由患者本人或其授权家属签字确认。',
    source: '医务处·医疗安全制度',
    updatedAt: '2025-01-10',
    tags: ['知情同意', '签字', '特殊检查', '手术同意书', '授权家属'],
    demo: true,
  },
  {
    title: '三级医师查房制度',
    snippet:
      '主任医师（或副主任医师）每周查房不少于2次，主治医师每日查房，住院医师实行24小时值班负责制并每日查房。查房内容包括诊断核对、治疗方案调整与疑难病例讨论，意见须记入病程记录。',
    source: '医务处·医疗核心制度',
    updatedAt: '2025-02-20',
    tags: ['三级查房', '主任查房', '主治医师', '住院医师'],
    demo: true,
  },
  {
    title: '危急值报告与处理制度',
    snippet:
      '检验、检查结果触及危急值界限时，医技科室须立即电话通知临床科室；接收医护人员应在10分钟内记录、复核并报告经治医师，处理结果应在6小时内记入病程记录，做到闭环管理。',
    source: '医务处·医疗安全制度',
    updatedAt: '2024-11-05',
    tags: ['危急值', '电话报告', '闭环', '病程记录'],
    demo: true,
  },
  {
    title: '手术安全核查制度（三方核查）',
    snippet:
      '麻醉实施前、手术开始前、患者离开手术室前三个时点，由手术医师、麻醉医师、巡回护士共同核查患者身份、手术部位、手术方式与无菌物品，核对无误后三方签字确认。',
    source: '医务处·手术管理制度',
    updatedAt: '2025-04-12',
    tags: ['手术核查', '三方核查', '手术部位', 'Time-out'],
    demo: true,
  },
  {
    title: '会诊管理暂行规定',
    snippet:
      '普通会诊应邀诊科室在24小时内完成，急会诊应邀诊医师10分钟内到位。会诊意见须由应邀医师记入病历，跨科诊疗意见由申请科室经治医师负责落实并记录。',
    source: '医务处·医疗核心制度',
    updatedAt: '2024-12-01',
    tags: ['会诊', '急会诊', '转诊', '会诊意见'],
    demo: true,
  },
  {
    title: '病历书写基本规范（时限要求）',
    snippet:
      '入院记录应在患者入院后24小时内完成，首次病程记录应在8小时内完成，主治医师首次查房记录应在48小时内完成；抢救记录应在抢救结束后6小时内据实补记并注明补记时间。',
    source: '病案室·病历管理',
    updatedAt: '2025-05-08',
    tags: ['病历', '入院记录', '首次病程', '时限', '补记'],
    demo: true,
  },
];

/** 从查询语句提取检索词：空白/标点切词 + 中文相邻二字碎片，保证中文短语可命中 */
function extractTokens(query: string): string[] {
  const text = query.trim().toLowerCase();
  if (!text) return [];
  const tokens = new Set<string>();
  // 1) 按空白与非字母数字/非汉字切分（英文词、缩写整体保留）
  for (const raw of text.split(/[\s,，。.;；:：!！?？、()（）《》\-/]+/)) {
    const w = raw.trim();
    if (w.length > 0) tokens.add(w);
  }
  // 2) 中文二字碎片（覆盖未切分的中文短语，如“抗菌药物分级”）
  const cjk = text.replace(/[^\u4e00-\u9fa5]/g, ' ');
  for (const run of cjk.split(/\s+/)) {
    for (let i = 0; i + 2 <= run.length; i++) {
      tokens.add(run.slice(i, i + 2));
    }
  }
  return [...tokens].filter((t) => t.length > 0);
}

function entryScore(entry: KnowledgeEntry, tokens: string[]): number {
  const title = entry.title.toLowerCase();
  const body = (entry.snippet + ' ' + entry.tags.join(' ')).toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (title.includes(t)) score += 3;
    if (body.includes(t)) score += 1;
  }
  return score;
}

/**
 * 院内规章制度/临床路径关键词倒序扫描（纯函数）。
 *
 * @param query   用户提问原文
 * @param dataset 可选数据集注入（默认内置演示库）；接入真实知识表时传入即可
 * @returns 命中条目，按相关度降序、更新时间近者优先，最多 5 条；无命中返回 []
 */
export function searchKnowledge(
  query: string,
  dataset: KnowledgeEntry[] = DEMO_KNOWLEDGE_BASE,
): KnowledgeHit[] {
  const tokens = extractTokens(query);
  if (tokens.length === 0) return [];

  const scored = dataset
    .map((e) => ({ entry: e, score: entryScore(e, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.entry.updatedAt.localeCompare(a.entry.updatedAt);
    })
    .slice(0, 5);

  return scored.map(({ entry }) => ({
    title: entry.title,
    snippet: entry.snippet,
    source: entry.source,
    updatedAt: entry.updatedAt,
    demo: entry.demo,
  }));
}

/**
 * 将检索命中拼装为聊天回复尾部的「参考依据」引用块。
 * 无命中返回空字符串（调用方据此决定是否追加）。
 */
export function buildCitationBlock(hits: KnowledgeHit[]): string {
  if (hits.length === 0) return '';
  const lines = hits.map((h, i) => `${i + 1}.《${h.title}》（${h.source}）`);
  return `参考依据：\n${lines.join('\n')}`;
}
