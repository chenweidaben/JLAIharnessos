/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 工作台仪表盘 - 类型定义
 */

// ============ 统计卡片 ============
export interface StatCardData {
  /** 唯一标识 */
  key: string;
  /** 卡片标题 */
  title: string;
  /** 显示数值 */
  value: number;
  /** 数值单位 */
  unit?: string;
  /** 图标 emoji */
  icon: string;
  /** 趋势百分比（正数上升，负数下降） */
  trend?: number;
  /** 趋势描述（如"较昨日"、"较上月"） */
  trendLabel?: string;
  /** 是否高亮（危急值等） */
  highlight?: boolean;
  /** 进度条百分比（0-100，用于床位使用率等） */
  progress?: number;
  /** 附加信息（如"已完成/待手术"） */
  extra?: string;
  /** 点击跳转路径 */
  link?: string;
}

// ============ 待办事项 ============
export type TodoType =
  'prescription' | 'medical_record' | 'critical_value' | 'consultation' | 'other';
export type TodoPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface TodoItem {
  id: string;
  type: TodoType;
  title: string;
  patientName: string;
  bedNumber: string;
  department: string;
  priority: TodoPriority;
  deadline: string;
  description?: string;
  done: boolean;
  createdAt: string;
}

// ============ 通知 ============
export type NotificationType =
  'system' | 'critical_alert' | 'drug_interaction' | 'consultation_invite' | 'qc_reminder';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  time: string;
  read: boolean;
  link?: string;
}

// ============ 系统公告 ============
export type AnnouncementType = 'important' | 'maintenance' | 'policy' | 'training';

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  content: string;
  publishTime: string;
  department: string;
  pinned: boolean;
}

// ============ 趋势数据 ============
export interface VisitTrendPoint {
  date: string;
  outpatient: number;
  inpatient: number;
  emergency: number;
}

export interface DepartmentLoadPoint {
  department: string;
  /** 8个时段：08-10,10-12,12-14,14-16,16-18,18-20,20-22,22-08 */
  loads: number[];
}

export interface WaitingTimePoint {
  department: string;
  minutes: number;
}

// ============ 医生信息 ============
export type ShiftType = 'morning' | 'afternoon' | 'night' | 'off';

export interface DoctorProfile {
  name: string;
  title: string;
  department: string;
  avatar?: string;
  shifts: {
    morning: ShiftType;
    afternoon: ShiftType;
    night: ShiftType;
  };
  monthlyStats: {
    outpatientVisits: number;
    surgeries: number;
    medicalRecords: number;
  };
  performance: {
    recordQualityRate: number;
    patientSatisfaction: number;
    avgStayDays: number;
  };
}

// ============ 快捷入口 ============
export interface QuickAccessItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

export interface RecentPatient {
  id: string;
  name: string;
  department: string;
  bedNumber: string;
  avatarColor: string;
}

// ============ 工作台汇总数据 ============
export interface DashboardData {
  stats: StatCardData[];
  visitTrend: VisitTrendPoint[];
  departmentLoad: DepartmentLoadPoint[];
  waitingTimes: WaitingTimePoint[];
  todos: TodoItem[];
  notifications: Notification[];
  announcements: Announcement[];
  doctorProfile: DoctorProfile;
  quickAccess: QuickAccessItem[];
  recentPatients: RecentPatient[];
}
