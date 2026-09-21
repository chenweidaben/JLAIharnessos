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
