/**
 * 健澜科技 jlmedaios - 多学科诊疗MDT管理 V13 纯函数（M459-D，M459 收官，医院运营与健康管理组）
 *
 * 备注：M455 曾派此名但中途改规格为药品供应，旧文件已物理删除回滚；本切片按新规格重新落盘。
 *
 * computeMdtConsultationApplicationTimelyRateV13 / computeMdtConsultationConductRateV13 / computeMdtConsultationPlanExecutionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 多学科诊疗MDT管理记录 */
export interface MdtConsultationMgmtRecordV13 {
  timely: number;
  totalApply: number;
  conducted: number;
  totalConduct: number;
  executed: number;
  totalPlan: number;
}

/**
 * MDT申请及时率（纯函数）：及时申请MDT数/应申请MDT总数×100，保留 2 位小数。
 *
 * @param records 多学科诊疗MDT管理记录列表
 * @returns MDT申请及时率百分比
 */
export function computeMdtConsultationApplicationTimelyRateV13(records: MdtConsultationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalApply, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timely, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * MDT开展率（纯函数）：已开展MDT数/应开展MDT总数×100，保留 2 位小数。
 *
 * @param records 多学科诊疗MDT管理记录列表
 * @returns MDT开展率百分比
 */
export function computeMdtConsultationConductRateV13(records: MdtConsultationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalConduct, 0);
  if (total === 0) return 0;
  const conducted = records.reduce((acc, r) => acc + r.conducted, 0);
  return Math.round((conducted / total) * 10000) / 100;
}

/**
 * MDT方案执行率（纯函数）：已执行方案数/MDT方案总数×100，保留 2 位小数。
 *
 * @param records 多学科诊疗MDT管理记录列表
 * @returns MDT方案执行率百分比
 */
export function computeMdtConsultationPlanExecutionRateV13(records: MdtConsultationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalPlan, 0);
  if (total === 0) return 0;
  const executed = records.reduce((acc, r) => acc + r.executed, 0);
  return Math.round((executed / total) * 10000) / 100;
}
