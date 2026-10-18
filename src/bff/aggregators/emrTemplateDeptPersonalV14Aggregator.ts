/**
 * 健澜科技 jlmedaios - 模板科室个性化 V14 聚合器（M524-B）
 *
 * 纯函数：构建科室个性化基础数据 + 科室个性化定制 + 构建个性化报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室个性化基础数据 */
export interface DeptPersonalV14 {
  dept: string;
  templateName: string;
}

/** 定制输入 */
export interface DeptCustomizeInputV14 {
  baseFields: string[];
  deptSpecificFields: string[];
}

/** 定制结果 */
export interface DeptCustomizeResultV14 {
  finalFields: string[];
  addedFields: number;
}

/** 个性化报告 */
export interface DeptPersonalReportV14 {
  totalFields: number;
  addedFields: number;
}

/**
 * 构建科室个性化基础数据。
 *
 * @param dept 科室
 * @param templateName 模板名
 * @returns 科室个性化基础数据
 */
export function buildDeptPersonal(dept: string, templateName: string): DeptPersonalV14 {
  return { dept, templateName };
}

/**
 * 科室个性化定制。
 * finalFields = baseFields + deptSpecificFields 去重合并；addedFields = deptSpecificFields.length（不去重）。
 *
 * @param input 定制输入（基础字段 + 科室特有字段）
 * @returns 定制结果（finalFields + addedFields）
 */
export function customizeDeptTemplate(input: DeptCustomizeInputV14): DeptCustomizeResultV14 {
  // 手算：finalFields = baseFields + deptSpecificFields 去重合并
  // 测试2：baseFields=['主诉','现病史'], deptSpecificFields=['心内科专项评估'] → 无重叠 → finalFields=['主诉','现病史','心内科专项评估']（3 项）
  // 测试3：baseFields=['主诉','现病史','既往史'], deptSpecificFields=['既往史','心脏超声结果'] → '既往史'重叠去重 → finalFields=['主诉','现病史','既往史','心脏超声结果']（4 项）
  const fieldSet = new Set<string>();
  for (const f of input.baseFields) {
    fieldSet.add(f);
  }
  for (const f of input.deptSpecificFields) {
    fieldSet.add(f);
  }
  const finalFields = Array.from(fieldSet);
  // 手算：addedFields = deptSpecificFields.length（不去重）
  // 测试2：deptSpecificFields=['心内科专项评估'] → addedFields=1
  // 测试3：deptSpecificFields=['既往史','心脏超声结果'] → addedFields=2（不去重）
  const addedFields = input.deptSpecificFields.length;
  return { finalFields, addedFields };
}

/**
 * 构建个性化报告。
 *
 * @param result 定制结果
 * @returns 个性化报告（totalFields + addedFields）
 */
export function buildDeptPersonalReport(result: DeptCustomizeResultV14): DeptPersonalReportV14 {
  // 手算：totalFields = finalFields.length
  // 测试4：finalFields=['主诉','现病史','既往史','心脏超声结果'] → totalFields=4
  const totalFields = result.finalFields.length;
  return { totalFields, addedFields: result.addedFields };
}
