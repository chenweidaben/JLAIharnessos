/**
 * 健澜科技 jlmedaios - 患者端门户展示工具（M80-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import type { PortalView } from '@/types/patientPortal';

/** 是否有待办高亮。 */
export function hasUrgent(v: PortalView): boolean {
  return v.unreadNotificationsCount > 0 || v.depositBalance < 0 || v.pendingSurveys > 0;
}
