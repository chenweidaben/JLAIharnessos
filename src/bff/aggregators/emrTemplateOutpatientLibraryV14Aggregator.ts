/**
 * 健澜科技 jlmedaios - 门诊病历模板库 V14 聚合器（M523-A）
 *
 * 纯函数：构建门诊模板库基础数据 + 搜索模板 + 构建模板库报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 门诊模板库基础数据 */
export interface OutpatientLibraryV14 {
  category: string;
  totalTemplates: number;
}

/** 门诊模板项 */
export interface OutpatientTemplateItemV14 {
  id: string;
  name: string;
  dept: string;
}

/** 搜索匹配项 */
export interface OutpatientMatchV14 {
  id: string;
  name: string;
}

/** 搜索结果 */
export interface OutpatientSearchResultV14 {
  matched: OutpatientMatchV14[];
  count: number;
}

/** 模板库报告 */
export interface OutpatientLibraryReportV14 {
  count: number;
  firstTemplate: string;
}

/**
 * 构建门诊模板库基础数据。
 *
 * @param category 分类
 * @param totalTemplates 模板总数
 * @returns 门诊模板库基础数据
 */
export function buildOutpatientLibrary(category: string, totalTemplates: number): OutpatientLibraryV14 {
  return { category, totalTemplates };
}

/**
 * 搜索模板。
 * templates 中 name 或 dept 包含 query 子串的项匹配。
 *
 * @param query 搜索词
 * @param templates 模板列表
 * @returns 搜索结果（matched + count）
 */
export function searchOutpatientTemplates(query: string, templates: OutpatientTemplateItemV14[]): OutpatientSearchResultV14 {
  // 手算：templates 中 name 或 dept 包含 query 子串即匹配
  // 测试2：query='感染' → T001 '上呼吸道感染模板'含'感染'✓, T002 '高血压门诊模板'不含'感染'✗ → matched=[T001]
  // 测试3：query='科' → T001 dept='呼吸科'含'科'✓, T002 dept='心内科'含'科'✓ → matched=[T001, T002]
  const matched: OutpatientMatchV14[] = [];
  for (const t of templates) {
    if (t.name.includes(query) || t.dept.includes(query)) {
      matched.push({ id: t.id, name: t.name });
    }
  }
  return { matched, count: matched.length };
}

/**
 * 构建模板库报告。
 * firstTemplate = 匹配列表第一项 name，空列表返回'无匹配模板'。
 *
 * @param result 搜索结果
 * @returns 模板库报告（count + firstTemplate）
 */
export function buildOutpatientLibraryReport(result: OutpatientSearchResultV14): OutpatientLibraryReportV14 {
  // 手算：firstTemplate = matched[0].name
  // 测试4：matched=[T001,T002] → firstTemplate='上呼吸道感染模板'
  const firstTemplate = result.matched.length > 0 ? result.matched[0].name : "无匹配模板";
  return { count: result.count, firstTemplate };
}
