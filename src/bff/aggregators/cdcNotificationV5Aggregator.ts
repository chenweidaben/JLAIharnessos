/**
 * 健澜科技 jlmedaios - 疾控传染病与慢病直报 V5 纯函数（M278-C）
 *
 * detectNotifiableV5 / buildCDCRecordV5 / trackChronicDiseaseV5 / buildCDCANotificationV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 传染病分类 */
export type CDCCategory = "甲类" | "乙类" | "丙类" | "非法定";

/** 病例 */
export interface CDCCase {
  caseRef: string;
  diagnosis: string;
  patientAge: number;
  reportDate: string;
}

/** 直报卡 */
export interface CDCRecord {
  caseRef: string;
  diseaseType: string;
  category: CDCCategory;
  reportDate: string;
  status: "new" | "corrected" | "closed";
  followupRequired: boolean;
}

/** 法定传染病字典 */
const NOTIFIABLE: Record<string, CDCCategory> = {
  "鼠疫": "甲类",
  "霍乱": "甲类",
  "新型冠状病毒肺炎": "乙类",
  "肺结核": "乙类",
  "梅毒": "乙类",
  "病毒性肝炎": "乙类",
  "细菌性痢疾": "乙类",
  "流行性感冒": "丙类",
  "手足口病": "丙类",
  "其他感染性腹泻": "丙类",
};

/**
 * 识别法定传染病 V5（纯函数）：甲乙丙类识别。
 *
 * @param diagnosis 诊断
 * @returns 分类
 */
export function detectNotifiableV5(diagnosis: string): CDCCategory {
  return NOTIFIABLE[diagnosis] ?? "非法定";
}

/**
 * 生成直报卡 V5（纯函数）：甲乙类需随访。
 *
 * @param c 病例
 * @returns 直报卡
 */
export function buildCDCRecordV5(c: CDCCase): CDCRecord {
  const category = detectNotifiableV5(c.diagnosis);
  const followupRequired = category === "甲类" || category === "乙类";
  return {
    caseRef: c.caseRef,
    diseaseType: c.diagnosis,
    category,
    reportDate: c.reportDate,
    status: "new",
    followupRequired,
  };
}

/**
 * 慢病随访追踪 V5（纯函数）。
 *
 * @param chronicType 慢病类型
 * @param lastFollowupDays 距上次随访天数
 * @returns 是否到期
 */
export function trackChronicDiseaseV5(chronicType: string, lastFollowupDays: number): { due: boolean; nextFollowup: number } {
  let interval = 90;
  if (chronicType === "高血压") interval = 90;
  else if (chronicType === "糖尿病") interval = 30;
  else if (chronicType === "冠心病") interval = 60;
  const due = lastFollowupDays >= interval;
  return { due, nextFollowup: interval };
}

/** 直报看板输出 */
export interface CDCANotificationV5Report {
  totalCases: number;
  categoryCounts: Record<CDCCategory, number>;
  pendingFollowup: number;
  suggestions: string[];
}

/**
 * 构建直报告看板（纯函数）。
 *
 * @param records 直报卡列表
 * @returns 看板
 */
export function buildCDCANotificationV5Report(records: CDCRecord[]): CDCANotificationV5Report {
  const categoryCounts: Record<CDCCategory, number> = { 甲类: 0, 乙类: 0, 丙类: 0, 非法定: 0 };
  let pendingFollowup = 0;
  for (const r of records) {
    categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1;
    if (r.followupRequired && r.status === "new") pendingFollowup += 1;
  }
  return {
    totalCases: records.length,
    categoryCounts,
    pendingFollowup,
    suggestions: pendingFollowup > 0
      ? ["甲乙类传染病待随访，需按规定时限完成订正"]
      : ["传染病直报与随访流转正常"],
  };
}
