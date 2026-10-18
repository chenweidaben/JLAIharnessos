/**
 * 健澜科技 jlmedaios - 病历质控知识库 V14 纯数据 + 纯函数（M475-D，M475 收官）
 *
 * 5 条质控知识条目，覆盖书写规范/缺陷类型/整改措施/评分标准/法律法规 5 类。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 知识条目 */
export interface KnowledgeEntryV14 {
  id: string;
  category: string;
  title: string;
  content: string;
}

/** 质控知识库条目（5 条，覆盖 5 类） */
export const QC_KB_ENTRIES_V14: KnowledgeEntryV14[] = [
  {
    id: "KB-001",
    category: "书写规范",
    title: "病历书写基本规范",
    content: "主诉简明扼要，现病史按时间顺序描述，体格检查完整记录。",
  },
  {
    id: "KB-002",
    category: "缺陷类型",
    title: "常见缺陷分类",
    content: "完整性缺失、逻辑矛盾、时限超时、表述不规范四大类。",
  },
  {
    id: "KB-003",
    category: "整改措施",
    title: "缺陷整改流程",
    content: "发现缺陷→通知医师→限期整改→复核确认→归档闭环。",
  },
  {
    id: "KB-004",
    category: "评分标准",
    title: "百分制计分规则",
    content: "基础分100分，关键缺陷扣10分，一般缺陷扣5分，扣完为止。",
  },
  {
    id: "KB-005",
    category: "法律法规",
    title: "医疗纠纷预防和处理条例",
    content: "病历书写应当客观、真实、准确、及时、完整、规范。",
  },
];

/**
 * 按 title includes 关键词过滤知识条目。
 *
 * @param keyword 搜索关键词
 * @returns 匹配的知识条目
 */
export function searchQcKnowledge(keyword: string): KnowledgeEntryV14[] {
  if (!keyword.trim()) return QC_KB_ENTRIES_V14;
  return QC_KB_ENTRIES_V14.filter((entry) => entry.title.includes(keyword));
}

/**
 * 创建知识条目。
 *
 * @param id 条目 ID
 * @param category 分类
 * @param title 标题
 * @param content 内容
 * @returns 知识条目
 */
export function buildKnowledgeEntry(id: string, category: string, title: string, content: string): KnowledgeEntryV14 {
  return { id, category, title, content };
}
