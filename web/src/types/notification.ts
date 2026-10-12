/**
 * 健澜科技 jlmedaios - 通知中心前端类型（M20-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface NotificationItem {
  id: string;
  notifType: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}
