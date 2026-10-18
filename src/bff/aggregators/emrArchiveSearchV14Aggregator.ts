/**
 * 健澜科技 jlmedaios - 病历归档检索 V14 聚合器（M533-D，M533 收官）
 *
 * 纯函数：构建归档检索基础数据 + 归档检索 + 构建检索报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 归档检索基础数据 */
export interface ArchiveSearchV14 {
  dept: string;
  year: number;
}

/** 病历记录 */
export interface ArchiveSearchRecordV14 {
  id: string;
  patientName: string;
  dept: string;
}

/** 归档检索输入 */
export interface ArchiveSearchInputV14 {
  query: string;
  records: ArchiveSearchRecordV14[];
}

/** 归档检索结果 */
export interface ArchiveSearchResultV14 {
  matchedCount: number;
  firstMatch: string;
}

/** 归档检索报告 */
export interface ArchiveSearchReportV14 {
  matchedCount: number;
  firstMatch: string;
}

/**
 * 构建归档检索基础数据。
 *
 * @param dept 科室
 * @param year 年份
 * @returns 归档检索基础数据
 */
export function buildArchiveSearch(dept: string, year: number): ArchiveSearchV14 {
  return { dept, year };
}

/**
 * 归档检索。
 * matched = records 中 patientName 或 dept 包含 query 子串的项；
 * matchedCount = matched.length；firstMatch = matched.length > 0 ? matched[0].patientName : '无匹配'。
 *
 * @param input 检索输入（搜索词 + 病历记录列表）
 * @returns 检索结果（matchedCount + firstMatch）
 */
export function searchArchiveRecords(input: ArchiveSearchInputV14): ArchiveSearchResultV14 {
  // 手算：matched = records 中 patientName 或 dept 含 query 子串的项
  // 测试2：query='张'
  //   张三/心内科 → patientName 含'张' → 匹配
  //   李四/心内科 → patientName 不含'张'，dept 不含'张' → 不匹配
  //   张五/呼吸科 → patientName 含'张' → 匹配
  //   matched = [张三, 张五]
  // 测试3：query='王'
  //   张三/心内科 → 不含'王'，dept 不含'王' → 不匹配
  //   李四/心内科 → 不含'王'，dept 不含'王' → 不匹配
  //   matched = []
  const matched = input.records.filter(
    (r) => r.patientName.includes(input.query) || r.dept.includes(input.query)
  );
  // 手算：matchedCount = matched.length
  // 测试2：matched.length = 2
  // 测试3：matched.length = 0
  const matchedCount = matched.length;
  // 手算：firstMatch = matched.length > 0 ? matched[0].patientName : '无匹配'
  // 测试2：matched[0].patientName = '张三'
  // 测试3：matched.length=0 → '无匹配'
  const firstMatch = matched.length > 0 ? matched[0].patientName : "无匹配";
  return { matchedCount, firstMatch };
}

/**
 * 构建检索报告。
 *
 * @param result 检索结果
 * @returns 检索报告（matchedCount + firstMatch 透传）
 */
export function buildArchiveSearchReport(result: ArchiveSearchResultV14): ArchiveSearchReportV14 {
  // 手算：透传 matchedCount + firstMatch
  // 测试4：{matchedCount:2, firstMatch:'张三'} → matchedCount=2, firstMatch='张三'
  return { matchedCount: result.matchedCount, firstMatch: result.firstMatch };
}
