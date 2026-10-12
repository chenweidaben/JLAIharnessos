/**
 * 健澜科技 jlmedaios - 改进任务前端类型（M22-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface ImprovementTask {
  id: string;
  source: string;
  visitId: string | null;
  groupCode: string | null;
  category: string | null;
  title: string;
  finding: string;
  assigneeId: string;
  status: string;
  dueDate: string | null;
  resolutionNote: string | null;
  createdAt: string;
}
