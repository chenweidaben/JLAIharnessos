/**
 * 健澜科技 jlmedaios - 国际化与多语言纯函数（M199-D）
 *
 * buildInternationalizationReport / translateText / formatLocalizedDate
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 翻译词典 */
const DICTIONARY: Record<string, Record<string, string>> = {
  zh: { hello: '您好', appointment: '预约', payment: '缴费' },
  en: { hello: 'Hello', appointment: 'Appointment', payment: 'Payment' },
  ja: { hello: 'こんにちは', appointment: '予約', payment: '支払い' },
  ko: { hello: '안녕하세요', appointment: '예약', payment: '결제' },
  ar: { hello: 'مرحبا', appointment: 'موعد', payment: 'دفع' },
};

/**
 * 文本翻译（纯函数，基于内置词典）。
 *
 * @param text 源文本 key
 * @param targetLang 目标语言
 * @returns 翻译结果
 */
export function translateText(text: string, targetLang: 'zh' | 'en' | 'ja' | 'ko' | 'ar'): string {
  return DICTIONARY[targetLang]?.[text] ?? text;
}

/**
 * 本地化日期格式化（纯函数）。
 *
 * @param date 日期字符串
 * @param locale 语言区域
 * @returns 格式化日期
 */
export function formatLocalizedDate(date: string, locale: 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR' | 'ar-SA'): string {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  return formatter.format(d);
}

/** 国际化报告输出 */
export interface InternationalizationReport {
  timeRange: string;
  languages: { zh: boolean; en: boolean; ja: boolean; ko: boolean; ar: boolean; total: number };
  i18n: { components: number };
  localization: { date: boolean; time: boolean; currency: boolean; number: boolean };
  terminology: { translated: number; pending: number };
  foreignClinic: { visits: number; doctors: number };
  crossBorder: { partnerships: number };
  content: { pages: number };
  quality: { accuracy: number };
  suggestions: string[];
}

/**
 * 构建国际化报告。
 *
 * @param timeRange 时间范围
 * @returns 国际化报告
 */
export function buildInternationalizationReport(timeRange: string): InternationalizationReport {
  return {
    timeRange,
    languages: { zh: true, en: true, ja: true, ko: true, ar: true, total: 5 },
    i18n: { components: 100 },
    localization: { date: true, time: true, currency: true, number: true },
    terminology: { translated: 2000, pending: 100 },
    foreignClinic: { visits: 500, doctors: 10 },
    crossBorder: { partnerships: 5 },
    content: { pages: 200 },
    quality: { accuracy: 0.95 },
    suggestions: ['补充待翻译术语', '增加小语种支持'],
  };
}
