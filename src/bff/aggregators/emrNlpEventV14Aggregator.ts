/**
 * 健澜科技 jlmedaios - NLP 病历事件提取 V14 聚合器（M490-C）
 *
 * 纯函数：医学事件提取 + 事件报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 事件提取结果 */
export interface NlpEventResultV14 {
  events: string[];
}

/** 事件报告 */
export interface NlpEventReportV14 {
  eventCount: number;
}

/** 医学事件词典（模拟 NLP 事件提取） */
const MEDICAL_EVENT_DICT = [
  "入院", "手术", "用药", "出院",
];

/**
 * 从病历正文提取医学事件（模拟 NLP 事件提取）。
 *
 * @param content 病历正文
 * @returns 事件提取结果
 */
export function extractMedicalEvents(content: string): NlpEventResultV14 {
  if (!content) {
    return { events: [] };
  }
  // 手算：遍历事件词典，命中则加入 events
  const events: string[] = [];
  for (const event of MEDICAL_EVENT_DICT) {
    if (content.includes(event)) {
      events.push(event);
    }
  }
  return { events };
}

/**
 * 构建事件报告（eventCount）。
 *
 * @param result 事件提取结果
 * @returns 事件报告
 */
export function buildEventReport(result: NlpEventResultV14): NlpEventReportV14 {
  // 手算：eventCount = events.length
  return { eventCount: result.events.length };
}
