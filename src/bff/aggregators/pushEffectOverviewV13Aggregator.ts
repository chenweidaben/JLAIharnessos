/**
 * 健澜科技 jlmedaios - 推送效果与闭环总览 V13 纯函数（M302-D）
 *
 * buildPushEffectOverviewV13 / computePushROIV13 / identifyPushGapV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 推送日志 */
export interface PushLogV13 {
  pushId: string;
  clicked: boolean;
  adopted: boolean;
}

/** 推送效果总览 */
export interface PushEffectOverviewV13 {
  impressions: number;
  clicks: number;
  adoptions: number;
  adoptionRate: number;
  ctr: number;
}

/**
 * 推送效果总览（纯函数）：impressions=日志数，ctr=clicks/impressions×100，adoptionRate=adoptions/impressions×100，保留1位。
 *
 * @param pushLogs 推送日志
 * @returns 总览
 */
export function buildPushEffectOverviewV13(pushLogs: PushLogV13[]): PushEffectOverviewV13 {
  const impressions = pushLogs.length;
  const clicks = pushLogs.filter((l) => l.clicked).length;
  const adoptions = pushLogs.filter((l) => l.adopted).length;
  const pct = (n: number) => (impressions === 0 ? 0 : Math.round((n / impressions) * 1000) / 10);
  return {
    impressions,
    clicks,
    adoptions,
    ctr: pct(clicks),
    adoptionRate: pct(adoptions),
  };
}

/**
 * 推送 ROI（纯函数）：每千次推送节省人时 = hoursSaved / (impressions/1000)，保留1位。
 *
 * @param adoptions 采纳数
 * @param hoursSaved 节省总人时
 * @param impressions 推送次数（此处用 adoptions 所在日志的总曝光；按入参语义）
 * @returns 每千次推送节省人时
 */
export function computePushROIV13(
  adoptions: number,
  hoursSaved: number,
  impressions: number,
): number {
  void adoptions;
  if (impressions === 0) return 0;
  return Math.round((hoursSaved / (impressions / 1000)) * 10) / 10;
}

/**
 * 推送缺口识别（纯函数）：CTR<10 → "推送不精准"；采纳率<20 → "推送内容无效"。
 *
 * @param overview 总览
 * @returns 缺口描述（无则空串）
 */
export function identifyPushGapV13(overview: PushEffectOverviewV13): string {
  if (overview.adoptionRate < 20 && overview.adoptionRate > 0) {
    return "推送内容无效：采纳率<20%";
  }
  if (overview.ctr < 10 && overview.ctr > 0) {
    return "推送不精准：点击率<10%";
  }
  return "";
}
