/**
 * 健澜科技 jlmedaios - 整改升级前端类型（M22-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface EscalatedTask {
  id: string;
  parentTaskId: string | null;
  escalationLevel: number;
  title: string;
  assigneeId: string;
  status: string;
}
