/**
 * 健澜科技 jlmedaios - 病历结构化字段查询 V14 聚合器（M532-A）
 *
 * 纯函数：构建字段查询基础数据 + 字段查询 + 构建查询报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 字段查询基础数据 */
export interface StructQueryV14 {
  recordType: string;
  dept: string;
}

/** 字段查询输入 */
export interface StructQueryInputV14 {
  recordType: string;
  availableFields: string[];
  requestedFields: string[];
}

/** 字段查询结果 */
export interface StructQueryResultV14 {
  foundFields: string[];
  missingFields: string[];
}

/** 字段查询报告 */
export interface StructQueryReportV14 {
  foundCount: number;
  missingCount: number;
}

/**
 * 构建字段查询基础数据。
 *
 * @param recordType 病历类型
 * @param dept 科室
 * @returns 字段查询基础数据
 */
export function buildStructQuery(recordType: string, dept: string): StructQueryV14 {
  return { recordType, dept };
}

/**
 * 字段查询。
 * foundFields = requestedFields 中在 availableFields 的项；missingFields = requestedFields 中不在 availableFields 的项。
 *
 * @param input 查询输入（病历类型 + 可用字段 + 请求字段）
 * @returns 查询结果（foundFields + missingFields）
 */
export function queryStructFields(input: StructQueryInputV14): StructQueryResultV14 {
  // 手算：foundFields = requestedFields 中在 availableFields 的项
  // 测试2：requestedFields=['主诉','诊断'], availableFields=['主诉','现病史','诊断'] → foundFields=['主诉','诊断']
  // 测试3：requestedFields=['主诉','手术记录'], availableFields=['主诉','现病史'] → foundFields=['主诉']
  const foundFields = input.requestedFields.filter((f) => input.availableFields.includes(f));
  // 手算：missingFields = requestedFields 中不在 availableFields 的项
  // 测试2：无缺失 → missingFields=[]
  // 测试3：'手术记录'不在 availableFields → missingFields=['手术记录']
  const missingFields = input.requestedFields.filter((f) => !input.availableFields.includes(f));
  return { foundFields, missingFields };
}

/**
 * 构建查询报告。
 *
 * @param result 查询报告输入（foundCount + missingCount）
 * @returns 查询报告（foundCount + missingCount 透传）
 */
export function buildStructQueryReport(result: { foundCount: number; missingCount: number }): StructQueryReportV14 {
  // 手算：透传 foundCount + missingCount
  // 测试4：{foundCount:1, missingCount:1} → foundCount=1, missingCount=1
  return { foundCount: result.foundCount, missingCount: result.missingCount };
}
