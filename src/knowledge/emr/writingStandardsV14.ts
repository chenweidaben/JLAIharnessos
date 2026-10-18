/**
 * 健澜科技 jlmedaios - 病历书写规范知识库 V14（M469-C）
 *
 * 纯数据：5 类病历书写规范条目（主诉/现病史/既往史/体格检查/诊断）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 规范条目 */
export interface StandardEntryV14 {
  id: string;
  category: string;
  title: string;
  required: boolean;
}

/** 内置病历书写规范条目 */
export const WRITING_STANDARDS_V14: StandardEntryV14[] = [
  {
    id: "S001",
    category: "主诉",
    title: "主诉应简明扼要，不超过 20 字",
    required: true,
  },
  {
    id: "S002",
    category: "现病史",
    title: "现病史应包括起病情况、主要症状、诊治经过",
    required: true,
  },
  {
    id: "S003",
    category: "既往史",
    title: "既往史应记录既往疾病、手术、外伤、过敏史",
    required: false,
  },
  {
    id: "S004",
    category: "体格检查",
    title: "体格检查应按系统顺序记录阳性体征",
    required: true,
  },
  {
    id: "S005",
    category: "诊断",
    title: "诊断应使用标准术语并附 ICD-10 编码",
    required: true,
  },
];

/**
 * 按 title 关键词搜索规范条目。
 *
 * @param keyword 搜索关键词
 * @returns 匹配的规范条目
 */
export function searchStandards(keyword: string): StandardEntryV14[] {
  if (!keyword.trim()) return [];
  return WRITING_STANDARDS_V14.filter((entry) => entry.title.includes(keyword));
}

/**
 * 获取所有必填（required=true）的规范条目。
 *
 * @returns 必填规范条目列表
 */
export function getRequiredSections(): StandardEntryV14[] {
  return WRITING_STANDARDS_V14.filter((entry) => entry.required);
}
