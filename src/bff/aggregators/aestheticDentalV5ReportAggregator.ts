/**
 * 健澜科技 jlmedaios - 医美口腔健康消费 V5 纯函数（M274-C）
 *
 * priceAestheticV5 / assessAestheticSafetyV5 / buildAestheticDentalV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 项目报价 V5（纯函数）。
 *
 * @param procedures 项目数
 * @param membership 是否会员
 * @returns 报价
 */
export function priceAestheticV5(procedures: number, membership: boolean): { total: number; discount: number; final: number } {
  const unitPrice = 3000;
  const total = procedures * unitPrice;
  const discount = membership ? 0.8 : 1.0;
  const final = Math.round(total * discount);
  return { total, discount, final };
}

/**
 * 安全评估 V5（纯函数）。
 *
 * @param client 客户风险因子数（过敏/既往史/基础病）
 * @param procedures 有创项目数
 * @returns 安全评估
 */
export function assessAestheticSafetyV5(client: number, procedures: number): { level: string; ok: boolean } {
  let level = "低风险";
  let ok = true;
  if (client >= 2 || procedures >= 3) {
    level = "高风险";
    ok = false;
  } else if (client >= 1 || procedures >= 2) {
    level = "中风险";
    ok = false;
  }
  return { level, ok };
}

/** 医美口腔健康消费 V5 报告输出 */
export interface AestheticDentalV5Report {
  timeRange: string;
  aesthetic: { skin: number; injection: number; laser: number; surgery: number; antiaging: number; intimate: number; hairTransplant: number; consult: number };
  dental: { orthodontics: number; implant: number; restoration: number; pediatric: number; periodontal: number; whitening: number; extraction: number; emergency: number };
  payment: { procedure: number; package: number; installment: number; membershipCard: number; deposit: number; refund: number; invoice: number };
  consultConversion: { consult: number; quote: number; plan: number; faceToFace: number; conversion: number; repurchase: number; customerMgmt: number };
  safetyQuality: { preop: number; informedConsent: number; complication: number; allergy: number; infection: number; anesthesia: number };
  membership: { tier: number; benefits: number; points: number; storedValue: number; birthday: number; recall: number; satisfaction: number };
  marketing: { miniProgram: number; groupbuy: number; review: number; fission: number; referral: number; content: number; anchor: number };
  metrics: { avgTransaction: number; repurchaseRate: number; conversionRate: number; complaintRate: number; satisfaction: number; revenue: number };
  suggestions: string[];
}

/**
 * 构建医美口腔健康消费 V5 报告（纯函数）。
 *
 * @param timeRange 时间范围
 * @returns 报告
 */
export function buildAestheticDentalV5Report(timeRange: string): AestheticDentalV5Report {
  return {
    timeRange,
    aesthetic: { skin: 200, injection: 300, laser: 150, surgery: 80, antiaging: 250, intimate: 30, hairTransplant: 20, consult: 500 },
    dental: { orthodontics: 150, implant: 200, restoration: 180, pediatric: 100, periodontal: 120, whitening: 80, extraction: 300, emergency: 50 },
    payment: { procedure: 1000, package: 400, installment: 150, membershipCard: 300, deposit: 500, refund: 30, invoice: 800 },
    consultConversion: { consult: 500, quote: 450, plan: 300, faceToFace: 250, conversion: 200, repurchase: 100, customerMgmt: 1 },
    safetyQuality: { preop: 1, informedConsent: 1, complication: 5, allergy: 10, infection: 3, anesthesia: 80 },
    membership: { tier: 4, benefits: 1, points: 1, storedValue: 1, birthday: 1, recall: 1, satisfaction: 90 },
    marketing: { miniProgram: 1, groupbuy: 100, review: 500, fission: 50, referral: 80, content: 1, anchor: 10 },
    metrics: { avgTransaction: 5000, repurchaseRate: 35, conversionRate: 40, complaintRate: 1.5, satisfaction: 90, revenue: 500 },
    suggestions: [
      "提升咨询转化率",
      "加强术前安全评估",
      "扩大会员储值复购",
    ],
  };
}
