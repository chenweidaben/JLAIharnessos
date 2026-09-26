/**
 * 健澜科技数智医院智能体 - BFF 业务权限码登记
 *
 * 与 docs/RADAR_FUSION_CONTRACT.md §4 对齐的影像 AI 权限码：
 *  - imaging:view          查看影像 AI 结果/目录/任务
 *  - imaging:ai:analyze   提交影像 AI 分析任务
 *  - imaging:ai:review    放射科医师复核签名（写审计留痕）
 *
 * 登记位置：本文件为 BFF 层权限码常量单一事实来源；
 * requirePermissionCode（middleware/auth.ts）按此校验。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export const IMAGING_PERMISSIONS = {
  /** 查看影像 AI 结果 / 目录 / 任务列表 */
  VIEW: 'imaging:view',
  /** 提交影像 AI 分析任务 */
  ANALYZE: 'imaging:ai:analyze',
  /** 复核签名（写审计留痕） */
  REVIEW: 'imaging:ai:review',
} as const;

export type ImagingPermissionCode =
  (typeof IMAGING_PERMISSIONS)[keyof typeof IMAGING_PERMISSIONS];

/** 全部已登记的影像 AI 权限码（便于种子/自检遍历） */
export const ALL_IMAGING_PERMISSION_CODES: readonly string[] = Object.values(IMAGING_PERMISSIONS);

/* ===========================================================================
 * 住院 ADT 权限码（M1-A）
 *  - inpatient:view       查看床位图/在院列表/患者摘要
 *  - inpatient:admit      入院登记 + 床位分配
 *  - inpatient:manage     换床 / 转科
 *  - inpatient:discharge  出院并释放床位（须医师，护士不可）
 *  - inpatient:bed:manage 床位状态维护（空闲/维护/隔离）
 *
 * 重要：这些权限仅授予“真实登录的医护/管理员”，绝不授予 Agent 服务账号，
 *       AI 只能辅助、不得直接产生在院事务。
 * ========================================================================= */
export const INPATIENT_PERMISSIONS = {
  VIEW: 'inpatient:view',
  ADMIT: 'inpatient:admit',
  MANAGE: 'inpatient:manage',
  DISCHARGE: 'inpatient:discharge',
  BED_MANAGE: 'inpatient:bed:manage',
} as const;

/* ===========================================================================
 * 急诊权限码（M1-B1）
 *  - emergency:view          查看急诊分诊台/候诊/抢救/留观队列
 *  - emergency:triage        接诊 + 分诊分级（护士）
 *  - emergency:green_channel 启动/记录/关闭绿色通道
 *  - emergency:resuscitation 启动/记录/结束抢救
 *  - emergency:observation  开始/更新/结束留观
 *  - emergency:disposition   记录终末转归（医师）
 *
 * 重要：仅授予真实登录的急诊医护/管理员，绝不授予 Agent 服务账号；
 *       AI 仅辅助评分/建议、不自主分级。
 * ========================================================================= */
export const EMERGENCY_PERMISSIONS = {
  VIEW: 'emergency:view',
  TRIAGE: 'emergency:triage',
  GREEN_CHANNEL: 'emergency:green_channel',
  RESUSCITATION: 'emergency:resuscitation',
  OBSERVATION: 'emergency:observation',
  DISPOSITION: 'emergency:disposition',
} as const;

export type EmergencyPermissionCode =
  (typeof EMERGENCY_PERMISSIONS)[keyof typeof EMERGENCY_PERMISSIONS];

export type InpatientPermissionCode =
  (typeof INPATIENT_PERMISSIONS)[keyof typeof INPATIENT_PERMISSIONS];

/** 全部已登记的住院权限码（便于种子/自检遍历） */
export const ALL_INPATIENT_PERMISSION_CODES: readonly string[] =
  Object.values(INPATIENT_PERMISSIONS);
