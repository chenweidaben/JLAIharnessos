/**
 * 健澜科技数智医院智能体 - 健澜深海蓝主题
 *
 * 基于健澜科技VI色系的深海蓝主题定义，包含80+语义化颜色令牌，
 * 与原始claude-code主题系统兼容，并扩展医疗场景专用颜色。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 健澜VI基础色板
// ============================================================================

/** 健澜深海蓝 - 主品牌色 */
export const JIANLAN_DEEP_BLUE = '#0A3D62';
/** 健澜海洋蓝 - 辅助品牌色 */
export const JIANLAN_OCEAN_BLUE = '#1B4F72';
/** 健澜天际蓝 - 高亮品牌色 */
export const JIANLAN_SKY_BLUE = '#2E86C1';
/** 健澜医疗青 - 辅助色 */
export const JIANLAN_MEDICAL_TEAL = '#1ABC9C';
/** 健澜警示橙 - 异常/警告 */
export const JIANLAN_WARNING_ORANGE = '#E67E22';
/** 健澜危险红 - 危急/错误 */
export const JIANLAN_DANGER_RED = '#E74C3C';
/** 健澜成功绿 - 正常/成功 */
export const JIANLAN_SUCCESS_GREEN = '#27AE60';
/** 健澜信息蓝 - 信息提示 */
export const JIANLAN_INFO_BLUE = '#3498DB';

// ============================================================================
// 主题类型定义（80+语义化颜色令牌）
// ============================================================================

/**
 * 健澜医疗主题类型定义
 *
 * 包含与原始claude-code主题系统兼容的基础令牌，
 * 以及医疗场景扩展令牌（危急值、患者状态、医嘱状态等）。
 */
export interface JianlanTheme {
  // ---- 品牌/角色色 (6) ----
  /** 健澜主品牌色 - 深海蓝 */
  jianlan: string;
  /** 健澜品牌色微光变体 */
  jianlanShimmer: string;
  /** AI助手角色色 */
  assistant: string;
  /** AI助手角色色微光变体 */
  assistantShimmer: string;
  /** 权限确认色 */
  permission: string;
  /** 权限确认色微光变体 */
  permissionShimmer: string;

  // ---- 基础文本 (6) ----
  /** 主要文本色 */
  text: string;
  /** 反色文本（深色背景上的浅色文本） */
  inverseText: string;
  /** 非活跃文本 */
  inactive: string;
  /** 非活跃文本微光变体 */
  inactiveShimmer: string;
  /** 微妙文本（次要信息） */
  subtle: string;
  /** 建议/提示文本 */
  suggestion: string;

  // ---- 背景 (5) ----
  /** 主背景色 */
  background: string;
  /** 用户消息背景 */
  userMessageBackground: string;
  /** 文本选择背景 */
  selectionBg: string;
  /** 面板/卡片背景 */
  panelBackground: string;
  /** 悬浮/悬停背景 */
  hoverBackground: string;

  // ---- 语义状态 (5) ----
  /** 成功状态色 */
  success: string;
  /** 错误状态色 */
  error: string;
  /** 警告状态色 */
  warning: string;
  /** 警告状态色微光变体 */
  warningShimmer: string;
  /** 已合并/已完成色 */
  merged: string;

  // ---- 医疗场景专用 - 检验值等级 (6) ----
  /** 危急值 - 红色，需立即处理 */
  criticalValue: string;
  /** 危急值背景 */
  criticalValueBg: string;
  /** 异常值（高）- 橙色 */
  abnormalHigh: string;
  /** 异常值（低）- 橙色 */
  abnormalLow: string;
  /** 正常值 - 绿色 */
  normalValue: string;
  /** 临界值 - 黄色 */
  borderlineValue: string;

  // ---- 医疗场景专用 - 患者状态 (4) ----
  /** 患者状态 - 稳定 */
  patientStable: string;
  /** 患者状态 - 监护中 */
  patientMonitoring: string;
  /** 患者状态 - 危重 */
  patientCritical: string;
  /** 患者状态 - 已出院 */
  patientDischarged: string;

  // ---- 医疗场景专用 - 医嘱状态 (5) ----
  /** 医嘱 - 待审核 */
  orderPending: string;
  /** 医嘱 - 执行中 */
  orderExecuting: string;
  /** 医嘱 - 已完成 */
  orderCompleted: string;
  /** 医嘱 - 已取消/停用 */
  orderDiscontinued: string;
  /** 医嘱 - 紧急(STAT) */
  orderStat: string;

  // ---- 医疗场景专用 - 警报级别 (3) ----
  /** 危险警报 - 危急值/过敏/严重相互作用 */
  alertDanger: string;
  /** 警告警报 - 异常值/中度相互作用 */
  alertWarning: string;
  /** 信息警报 - 提示/建议 */
  alertInfo: string;

  // ---- 边框/分隔线 (4) ----
  /** 主边框色 */
  border: string;
  /** 聚焦边框色 */
  borderFocus: string;
  /** 分隔线色 */
  divider: string;
  /** 输入框边框 */
  inputBorder: string;

  // ---- 导航/标签 (4) ----
  /** 标签页激活色 */
  tabActive: string;
  /** 标签页非激活色 */
  tabInactive: string;
  /** 侧边栏选中项 */
  sidebarActive: string;
  /** 侧边栏背景 */
  sidebarBackground: string;

  // ---- 按钮 (4) ----
  /** 主按钮背景 */
  buttonPrimary: string;
  /** 主按钮文本 */
  buttonPrimaryText: string;
  /** 危险按钮背景 */
  buttonDanger: string;
  /** 危险按钮文本 */
  buttonDangerText: string;

  // ---- 图表/数据可视化 (6) ----
  /** 图表色1 - 蓝 */
  chartBlue: string;
  /** 图表色2 - 青 */
  chartTeal: string;
  /** 图表色3 - 绿 */
  chartGreen: string;
  /** 图表色4 - 黄 */
  chartYellow: string;
  /** 图表色5 - 橙 */
  chartOrange: string;
  /** 图表色6 - 红 */
  chartRed: string;

  // ---- 系统状态 (4) ----
  /** 在线/已连接 */
  statusOnline: string;
  /** 离线/未连接 */
  statusOffline: string;
  /** 忙碌/处理中 */
  statusBusy: string;
  /** 空闲 */
  statusIdle: string;

  // ---- 其他 (6) ----
  /** 快速模式指示色 */
  fastMode: string;
  /** 快速模式微光变体 */
  fastModeShimmer: string;
  /** 记忆/知识库色 */
  memory: string;
  /** 速率限制填充色 */
  rateLimitFill: string;
  /** 速率限制空色 */
  rateLimitEmpty: string;
  /** 专业蓝（系统标识） */
  professionalBlue: string;
}

// ============================================================================
// 健澜深海蓝暗色主题（默认）
// ============================================================================

/**
 * 健澜深海蓝暗色主题
 *
 * 以健澜VI深海蓝为主色调，深色背景适合长时间终端使用，
 * 医疗场景颜色经过对比度优化，确保危急值醒目可辨。
 */
export const jianlanDarkTheme: JianlanTheme = {
  // 品牌/角色色
  jianlan: '#1B4F72',
  jianlanShimmer: '#2E86C1',
  assistant: '#1ABC9C',
  assistantShimmer: '#48C9B0',
  permission: '#E67E22',
  permissionShimmer: '#F39C12',

  // 基础文本
  text: '#E8F4F8',
  inverseText: '#0A1929',
  inactive: '#5D6D7E',
  inactiveShimmer: '#7F8C8D',
  subtle: '#85929E',
  suggestion: '#5DADE2',

  // 背景
  background: '#0A1929',
  userMessageBackground: '#112A46',
  selectionBg: '#1B4F72',
  panelBackground: '#0F2744',
  hoverBackground: '#163A5C',

  // 语义状态
  success: '#27AE60',
  error: '#E74C3C',
  warning: '#E67E22',
  warningShimmer: '#F39C12',
  merged: '#8E44AD',

  // 医疗 - 检验值等级
  criticalValue: '#FF3B30',
  criticalValueBg: '#3D0C0C',
  abnormalHigh: '#FF9500',
  abnormalLow: '#FF9500',
  normalValue: '#34C759',
  borderlineValue: '#FFCC00',

  // 医疗 - 患者状态
  patientStable: '#34C759',
  patientMonitoring: '#FFCC00',
  patientCritical: '#FF3B30',
  patientDischarged: '#8E8E93',

  // 医疗 - 医嘱状态
  orderPending: '#FFCC00',
  orderExecuting: '#007AFF',
  orderCompleted: '#34C759',
  orderDiscontinued: '#8E8E93',
  orderStat: '#FF3B30',

  // 医疗 - 警报级别
  alertDanger: '#FF3B30',
  alertWarning: '#FF9500',
  alertInfo: '#007AFF',

  // 边框/分隔线
  border: '#1B4F72',
  borderFocus: '#2E86C1',
  divider: '#1A3A5C',
  inputBorder: '#2E86C1',

  // 导航/标签
  tabActive: '#1ABC9C',
  tabInactive: '#5D6D7E',
  sidebarActive: '#1B4F72',
  sidebarBackground: '#081420',

  // 按钮
  buttonPrimary: '#1B4F72',
  buttonPrimaryText: '#E8F4F8',
  buttonDanger: '#C0392B',
  buttonDangerText: '#FFFFFF',

  // 图表
  chartBlue: '#3498DB',
  chartTeal: '#1ABC9C',
  chartGreen: '#27AE60',
  chartYellow: '#F1C40F',
  chartOrange: '#E67E22',
  chartRed: '#E74C3C',

  // 系统状态
  statusOnline: '#34C759',
  statusOffline: '#8E8E93',
  statusBusy: '#FF9500',
  statusIdle: '#5DADE2',

  // 其他
  fastMode: '#9B59B6',
  fastModeShimmer: '#BB8FCE',
  memory: '#16A085',
  rateLimitFill: '#E67E22',
  rateLimitEmpty: '#34495E',
  professionalBlue: '#2E86C1',
};

// ============================================================================
// 健澜深海蓝亮色主题
// ============================================================================

/**
 * 健澜深海蓝亮色主题
 *
 * 适用于光线充足环境或投影展示，保持品牌色一致性，
 * 医疗警报颜色经过亮色背景对比度优化。
 */
export const jianlanLightTheme: JianlanTheme = {
  // 品牌/角色色
  jianlan: '#0A3D62',
  jianlanShimmer: '#1B4F72',
  assistant: '#0E6655',
  assistantShimmer: '#148F77',
  permission: '#CA6F1E',
  permissionShimmer: '#D68910',

  // 基础文本
  text: '#1A252F',
  inverseText: '#FFFFFF',
  inactive: '#7F8C8D',
  inactiveShimmer: '#95A5A6',
  subtle: '#566573',
  suggestion: '#2471A3',

  // 背景
  background: '#F4F8FB',
  userMessageBackground: '#E8F0F7',
  selectionBg: '#D4E6F1',
  panelBackground: '#FFFFFF',
  hoverBackground: '#EBF5FB',

  // 语义状态
  success: '#1E8449',
  error: '#C0392B',
  warning: '#CA6F1E',
  warningShimmer: '#D68910',
  merged: '#6C3483',

  // 医疗 - 检验值等级
  criticalValue: '#D32F2F',
  criticalValueBg: '#FFEBEE',
  abnormalHigh: '#E65100',
  abnormalLow: '#E65100',
  normalValue: '#2E7D32',
  borderlineValue: '#F57F17',

  // 医疗 - 患者状态
  patientStable: '#2E7D32',
  patientMonitoring: '#F57F17',
  patientCritical: '#D32F2F',
  patientDischarged: '#616161',

  // 医疗 - 医嘱状态
  orderPending: '#F57F17',
  orderExecuting: '#1565C0',
  orderCompleted: '#2E7D32',
  orderDiscontinued: '#616161',
  orderStat: '#D32F2F',

  // 医疗 - 警报级别
  alertDanger: '#D32F2F',
  alertWarning: '#E65100',
  alertInfo: '#1565C0',

  // 边框/分隔线
  border: '#B0C4DE',
  borderFocus: '#1B4F72',
  divider: '#D5DBDB',
  inputBorder: '#1B4F72',

  // 导航/标签
  tabActive: '#0E6655',
  tabInactive: '#7F8C8D',
  sidebarActive: '#D4E6F1',
  sidebarBackground: '#E8F0F7',

  // 按钮
  buttonPrimary: '#0A3D62',
  buttonPrimaryText: '#FFFFFF',
  buttonDanger: '#C0392B',
  buttonDangerText: '#FFFFFF',

  // 图表
  chartBlue: '#2471A3',
  chartTeal: '#0E6655',
  chartGreen: '#1E8449',
  chartYellow: '#B7950B',
  chartOrange: '#CA6F1E',
  chartRed: '#C0392B',

  // 系统状态
  statusOnline: '#2E7D32',
  statusOffline: '#616161',
  statusBusy: '#E65100',
  statusIdle: '#1565C0',

  // 其他
  fastMode: '#6C3483',
  fastModeShimmer: '#7D3C98',
  memory: '#0E6655',
  rateLimitFill: '#CA6F1E',
  rateLimitEmpty: '#D5DBDB',
  professionalBlue: '#1B4F72',
};

// ============================================================================
// 主题名称与导出
// ============================================================================

/** 可用主题名称 */
export type JianlanThemeName = 'jianlan-dark' | 'jianlan-light';

/** 主题映射表 */
export const jianlanThemes: Record<JianlanThemeName, JianlanTheme> = {
  'jianlan-dark': jianlanDarkTheme,
  'jianlan-light': jianlanLightTheme,
};

/** 默认主题 */
export const defaultJianlanTheme: JianlanTheme = jianlanDarkTheme;

/** 默认主题名称 */
export const defaultJianlanThemeName: JianlanThemeName = 'jianlan-dark';

/**
 * 获取指定名称的主题
 * @param name - 主题名称
 * @returns 主题对象
 */
export function getJianlanTheme(name: JianlanThemeName): JianlanTheme {
  return jianlanThemes[name] ?? defaultJianlanTheme;
}

/**
 * 检测终端是否支持真彩色
 * @returns 是否支持24位真彩色
 */
export function supportsTrueColor(): boolean {
  if (typeof process === 'undefined') return false;
  const colorTerm = process.env.COLORTERM;
  const term = process.env.TERM ?? '';
  return (
    colorTerm === 'truecolor' ||
    colorTerm === '24bit' ||
    term.includes('truecolor') ||
    term.includes('24bit')
  );
}
