/**
 * 健澜科技 jlmedaios - 病历AI术后病程跟踪 V14 聚合器（M555-C）
 *
 * 纯函数：构建 AI 术后病程跟踪基础数据 + AI 术后病程跟踪 + 构建术后病程跟踪报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 术后病程跟踪基础数据 */
export interface AiPostopProgressTrackV14 {
  recordId: string;
  dept: string;
}

/** AI 术后病程跟踪输入 */
export interface AiPostopProgressTrackInputV14 {
  postopDay: number;
  hasFever: boolean;
  woundHealed: boolean;
}

/** AI 术后病程跟踪结果 */
export interface AiPostopProgressTrackResultV14 {
  recoveryStatus: string;
  daysToDischarge: number;
}

/** 术后病程跟踪报告 */
export interface AiPostopProgressTrackReportV14 {
  recoveryStatus: string;
  daysToDischarge: number;
}

/**
 * 构建 AI 术后病程跟踪基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 术后病程跟踪基础数据
 */
export function buildAiPostopProgressTrack(recordId: string, dept: string): AiPostopProgressTrackV14 {
  return { recordId, dept };
}

/**
 * AI 术后病程跟踪。
 * recoveryStatus = !woundHealed ? '恢复中' : hasFever ? '观察中' : '恢复良好'
 * daysToDischarge = recoveryStatus === '恢复良好' ? Math.max(1, 7 - postopDay)
 *   : recoveryStatus === '观察中' ? Math.max(2, 10 - postopDay)
 *   : Math.max(3, 14 - postopDay)
 *
 * @param input 术后病程跟踪输入（术后第几天 + 是否发热 + 伤口愈合）
 * @returns 术后病程跟踪结果（recoveryStatus + daysToDischarge）
 */
export function trackPostopProgressByAi(input: AiPostopProgressTrackInputV14): AiPostopProgressTrackResultV14 {
  // 手算：recoveryStatus = !woundHealed ? '恢复中' : hasFever ? '观察中' : '恢复良好'
  // 测试2：postopDay=5, hasFever=false, woundHealed=true → !true=false, hasFever=false → recoveryStatus='恢复良好'
  // 测试3：postopDay=3, hasFever=true, woundHealed=false → !false=true → recoveryStatus='恢复中'
  const recoveryStatus = !input.woundHealed
    ? "恢复中"
    : input.hasFever
      ? "观察中"
      : "恢复良好";
  // 手算：daysToDischarge = recoveryStatus === '恢复良好' ? Math.max(1, 7 - postopDay)
  //   : recoveryStatus === '观察中' ? Math.max(2, 10 - postopDay)
  //   : Math.max(3, 14 - postopDay)
  // 测试2：recoveryStatus='恢复良好' → Math.max(1, 7-5) = Math.max(1, 2) = 2
  // 测试3：recoveryStatus='恢复中' → Math.max(3, 14-3) = Math.max(3, 11) = 11
  const daysToDischarge = recoveryStatus === "恢复良好"
    ? Math.max(1, 7 - input.postopDay)
    : recoveryStatus === "观察中"
      ? Math.max(2, 10 - input.postopDay)
      : Math.max(3, 14 - input.postopDay);
  return { recoveryStatus, daysToDischarge };
}

/**
 * 构建术后病程跟踪报告。
 *
 * @param result 术后病程跟踪结果
 * @returns 术后病程跟踪报告（recoveryStatus + daysToDischarge 透传）
 */
export function buildAiPostopProgressTrackReport(result: AiPostopProgressTrackResultV14): AiPostopProgressTrackReportV14 {
  // 手算：透传 recoveryStatus + daysToDischarge
  // 测试4：{recoveryStatus='恢复良好', daysToDischarge=2} → 透传
  return { recoveryStatus: result.recoveryStatus, daysToDischarge: result.daysToDischarge };
}
