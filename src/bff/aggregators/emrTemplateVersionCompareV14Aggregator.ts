/**
 * 健澜科技 jlmedaios - 模板版本对比 V14 聚合器（M524-A）
 *
 * 纯函数：构建版本对比基础数据 + 版本对比 + 构建对比报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 版本对比基础数据 */
export interface VersionCompareV14 {
  templateName: string;
  oldVersion: string;
  newVersion: string;
}

/** 对比输入 */
export interface VersionCompareInputV14 {
  oldFields: string[];
  newFields: string[];
}

/** 对比结果 */
export interface VersionCompareResultV14 {
  addedCount: number;
  removedCount: number;
  changedCount: number;
}

/** 对比报告 */
export interface VersionCompareReportV14 {
  totalChanges: number;
  summary: string;
}

/**
 * 构建版本对比基础数据。
 *
 * @param templateName 模板名
 * @param oldVersion 旧版本
 * @param newVersion 新版本
 * @returns 版本对比基础数据
 */
export function buildVersionCompare(templateName: string, oldVersion: string, newVersion: string): VersionCompareV14 {
  return { templateName, oldVersion, newVersion };
}

/**
 * 版本对比。
 * added = newFields 中不在 oldFields 的项；removed = oldFields 中不在 newFields 的项；changed = 0（纯集合运算）。
 *
 * @param input 对比输入（旧字段列表 + 新字段列表）
 * @returns 对比结果（addedCount + removedCount + changedCount）
 */
export function compareTemplateVersions(input: VersionCompareInputV14): VersionCompareResultV14 {
  // 手算：added = newFields 中不在 oldFields 的项
  // 测试2：oldFields=['主诉','现病史','既往史'], newFields=['主诉','现病史','既往史','家族史']
  // 手算：added = ['家族史'] → addedCount=1
  // 测试3：oldFields=['主诉','现病史','既往史','个人史'], newFields=['主诉','现病史','家族史']
  // 手算：added = ['家族史'] → addedCount=1
  const oldSet = new Set(input.oldFields);
  const newSet = new Set(input.newFields);
  let addedCount = 0;
  for (const f of input.newFields) {
    if (!oldSet.has(f)) {
      addedCount++;
    }
  }
  // 手算：removed = oldFields 中不在 newFields 的项
  // 测试2：removed = [] → removedCount=0
  // 测试3：removed = ['既往史','个人史'] → removedCount=2
  let removedCount = 0;
  for (const f of input.oldFields) {
    if (!newSet.has(f)) {
      removedCount++;
    }
  }
  // 手算：changed = 0（纯集合运算，不做字段内容对比）
  const changedCount = 0;
  return { addedCount, removedCount, changedCount };
}

/**
 * 构建对比报告。
 * totalChanges = added + removed + changed；summary = `新增${added}项/删除${removed}项/修改${changed}项`。
 *
 * @param result 对比结果
 * @returns 对比报告（totalChanges + summary）
 */
export function buildVersionCompareReport(result: VersionCompareResultV14): VersionCompareReportV14 {
  // 手算：totalChanges = added + removed + changed
  // 测试4：addedCount=1, removedCount=2, changedCount=0 → totalChanges=3
  const totalChanges = result.addedCount + result.removedCount + result.changedCount;
  // 手算：summary = `新增${added}项/删除${removed}项/修改${changed}项`
  // 测试4：'新增1项/删除2项/修改0项'
  const summary = `新增${result.addedCount}项/删除${result.removedCount}项/修改${result.changedCount}项`;
  return { totalChanges, summary };
}
