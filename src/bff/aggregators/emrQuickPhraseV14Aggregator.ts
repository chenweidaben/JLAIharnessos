/**
 * 健澜科技 jlmedaios - 病历常见用语快捷输入 V14 聚合器（M539-C）
 *
 * 纯函数：构建快捷用语基础数据 + 快捷用语搜索 + 构建搜索报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 快捷用语基础数据 */
export interface QuickPhraseV14 {
  category: string;
  doctorId: string;
}

/** 用语项 */
export interface PhraseItemV14 {
  id: string;
  text: string;
}

/** 快捷用语搜索输入 */
export interface QuickPhraseInputV14 {
  query: string;
  phrases: PhraseItemV14[];
}

/** 快捷用语搜索结果 */
export interface QuickPhraseResultV14 {
  matchedCount: number;
  firstPhrase: string;
}

/** 搜索报告 */
export interface QuickPhraseReportV14 {
  matchedCount: number;
  firstPhrase: string;
}

/**
 * 构建快捷用语基础数据。
 *
 * @param category 分类
 * @param doctorId 医生ID
 * @returns 快捷用语基础数据
 */
export function buildQuickPhrase(category: string, doctorId: string): QuickPhraseV14 {
  return { category, doctorId };
}

/**
 * 快捷用语搜索。
 * matched = phrases.filter(p => p.text.includes(query))
 * matchedCount = matched.length
 * firstPhrase = matched.length > 0 ? matched[0].text : '无匹配'
 *
 * @param input 搜索输入（搜索词 + 用语列表）
 * @returns 搜索结果（matchedCount + firstPhrase）
 */
export function searchQuickPhrase(input: QuickPhraseInputV14): QuickPhraseResultV14 {
  // 手算：matched = phrases.filter(p => p.text.includes(query))
  // 测试2：query='胸闷'
  //   '胸闷3天'.includes('胸闷') = true
  //   '胸痛1周'.includes('胸闷') = false
  //   '胸闷伴气短'.includes('胸闷') = true
  //   matched = [胸闷3天, 胸闷伴气短] → matchedCount=2
  // 测试3：query='腹痛'
  //   '胸闷3天'.includes('腹痛') = false
  //   '胸痛1周'.includes('腹痛') = false
  //   matched = [] → matchedCount=0
  const matched = input.phrases.filter((p: PhraseItemV14) => p.text.includes(input.query));
  // 手算：matchedCount = matched.length
  // 测试2：matched.length = 2 → matchedCount=2
  // 测试3：matched.length = 0 → matchedCount=0
  const matchedCount = matched.length;
  // 手算：firstPhrase = matched.length > 0 ? matched[0].text : '无匹配'
  // 测试2：matched[0].text = '胸闷3天' → firstPhrase='胸闷3天'
  // 测试3：matched=[] → firstPhrase='无匹配'
  const firstPhrase = matched.length > 0 ? matched[0]?.text ?? "无匹配" : "无匹配";
  return { matchedCount, firstPhrase };
}

/**
 * 构建搜索报告。
 *
 * @param result 搜索结果
 * @returns 搜索报告（matchedCount + firstPhrase 透传）
 */
export function buildQuickPhraseReport(result: QuickPhraseResultV14): QuickPhraseReportV14 {
  // 手算：透传 matchedCount + firstPhrase
  // 测试4：{matchedCount=2, firstPhrase='胸闷3天'} → matchedCount=2, firstPhrase='胸闷3天'
  return { matchedCount: result.matchedCount, firstPhrase: result.firstPhrase };
}
