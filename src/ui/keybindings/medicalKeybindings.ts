/**
 * 健澜科技数智医院智能体 - 医疗场景键位绑定
 *
 * 基础键位与原始claude-code兼容，扩展医疗场景快捷键，
 * 支持键位上下文（不同屏幕不同键位），可配置化。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import type { Keybinding } from '../types';

// ============================================================================
// 键位上下文定义
// ============================================================================

/** 键位上下文名称 */
export type KeybindingContext =
  | 'global'
  | 'dashboard'
  | 'outpatient'
  | 'ward-round'
  | 'consultation'
  | 'input'
  | 'command-palette'
  | 'confirmation'
  | 'patient-search'
  | 'order-entry'
  | 'report-view'
  | 'help';

/** 上下文描述 */
export const CONTEXT_DESCRIPTIONS: Record<KeybindingContext, string> = {
  global: '全局始终活跃',
  dashboard: '主仪表盘',
  outpatient: '门诊问诊屏幕',
  'ward-round': '查房屏幕',
  consultation: '会诊屏幕',
  input: '输入框聚焦',
  'command-palette': '命令面板打开',
  confirmation: '确认对话框',
  'patient-search': '患者搜索',
  'order-entry': '医嘱录入',
  'report-view': '报告查看',
  help: '帮助弹窗',
};

// ============================================================================
// 基础键位（与原始claude-code兼容）
// ============================================================================

/** 全局基础键位 */
export const GLOBAL_KEYBINDINGS: Keybinding[] = [
  {
    key: 'ctrl+c',
    action: 'interrupt',
    description: '中断当前操作/AI回复',
    context: 'global',
  },
  {
    key: 'ctrl+l',
    action: 'clear-screen',
    description: '清屏/重绘',
    context: 'global',
  },
  {
    key: 'ctrl+d',
    action: 'exit',
    description: '退出程序（输入框为空时）',
    context: 'global',
  },
  {
    key: 'ctrl+z',
    action: 'suspend',
    description: '挂起程序',
    context: 'global',
  },
];

// ============================================================================
// 医疗场景快捷键
// ============================================================================

/** 医疗功能快捷键 */
export const MEDICAL_KEYBINDINGS: Keybinding[] = [
  // 功能键
  {
    key: 'f1',
    action: 'show-help',
    description: '显示帮助',
    context: 'global',
  },
  {
    key: 'f2',
    action: 'switch-patient',
    description: '切换患者',
    context: 'global',
  },
  {
    key: 'f3',
    action: 'view-lab',
    description: '查看检验结果',
    context: 'global',
  },
  {
    key: 'f4',
    action: 'view-orders',
    description: '查看医嘱',
    context: 'global',
  },
  {
    key: 'f5',
    action: 'generate-record',
    description: '生成病历',
    context: 'global',
  },
  {
    key: 'f6',
    action: 'create-order',
    description: '开医嘱',
    context: 'global',
  },
  {
    key: 'f7',
    action: 'qc-check',
    description: '质控检查',
    context: 'global',
  },
  {
    key: 'f8',
    action: 'view-vitals',
    description: '查看生命体征',
    context: 'global',
  },
  {
    key: 'f9',
    action: 'view-alerts',
    description: '查看警报',
    context: 'global',
  },
  {
    key: 'f10',
    action: 'patient-summary',
    description: '患者摘要',
    context: 'global',
  },
  {
    key: 'f11',
    action: 'drug-query',
    description: '药品查询',
    context: 'global',
  },
  {
    key: 'f12',
    description: '开发者工具',
    action: 'dev-tools',
    context: 'global',
  },

  // Ctrl组合键
  {
    key: 'ctrl+p',
    action: 'command-palette',
    description: '打开命令面板',
    context: 'global',
  },
  {
    key: 'ctrl+k',
    action: 'command-palette',
    description: '打开命令面板（备选）',
    context: 'global',
  },
  {
    key: 'ctrl+e',
    action: 'switch-input-mode',
    description: '切换输入模式（问诊/医嘱/查房/会诊）',
    context: 'input',
  },
  {
    key: 'ctrl+r',
    action: 'patient-search',
    description: '患者搜索',
    context: 'global',
  },
  {
    key: 'ctrl+s',
    action: 'save',
    description: '保存当前内容（病历/医嘱）',
    context: 'global',
  },
  {
    key: 'ctrl+n',
    action: 'new-visit',
    description: '新建就诊/患者',
    context: 'global',
  },
  {
    key: 'ctrl+o',
    action: 'open-record',
    description: '打开病历',
    context: 'global',
  },
  {
    key: 'ctrl+w',
    action: 'ward-round-mode',
    description: '切换到查房模式',
    context: 'global',
  },
  {
    key: 'ctrl+m',
    action: 'outpatient-mode',
    description: '切换到门诊模式',
    context: 'global',
  },

  // 屏幕导航
  {
    key: 'ctrl+1',
    action: 'goto-dashboard',
    description: '跳转到主仪表盘',
    context: 'global',
  },
  {
    key: 'ctrl+2',
    action: 'goto-outpatient',
    description: '跳转到门诊问诊',
    context: 'global',
  },
  {
    key: 'ctrl+3',
    action: 'goto-ward-round',
    description: '跳转到查房',
    context: 'global',
  },
  {
    key: 'ctrl+4',
    action: 'goto-consultation',
    description: '跳转会诊',
    context: 'global',
  },

  // Alt组合键
  {
    key: 'alt+left',
    action: 'prev-patient',
    description: '上一位患者（查房模式）',
    context: 'ward-round',
  },
  {
    key: 'alt+right',
    action: 'next-patient',
    description: '下一位患者（查房模式）',
    context: 'ward-round',
  },
  {
    key: 'alt+e',
    action: 'emergency-order',
    description: '紧急医嘱',
    context: 'order-entry',
  },
];

// ============================================================================
// 上下文特定键位
// ============================================================================

/** 确认对话框键位 */
export const CONFIRMATION_KEYBINDINGS: Keybinding[] = [
  { key: 'y', action: 'confirm', description: '确认', context: 'confirmation' },
  { key: 'n', action: 'cancel', description: '取消', context: 'confirmation' },
  { key: 'enter', action: 'confirm', description: '确认（默认按钮）', context: 'confirmation' },
  { key: 'escape', action: 'cancel', description: '取消', context: 'confirmation' },
  { key: 'tab', action: 'next-field', description: '下一字段/按钮', context: 'confirmation' },
];

/** 命令面板键位 */
export const COMMAND_PALETTE_KEYBINDINGS: Keybinding[] = [
  { key: 'escape', action: 'close', description: '关闭命令面板', context: 'command-palette' },
  { key: 'enter', action: 'execute', description: '执行选中命令', context: 'command-palette' },
  { key: 'up', action: 'prev', description: '上一个命令', context: 'command-palette' },
  { key: 'down', action: 'next', description: '下一个命令', context: 'command-palette' },
  { key: 'tab', action: 'autocomplete', description: '自动补全', context: 'command-palette' },
];

/** 患者搜索键位 */
export const PATIENT_SEARCH_KEYBINDINGS: Keybinding[] = [
  { key: 'escape', action: 'close', description: '关闭搜索', context: 'patient-search' },
  { key: 'enter', action: 'select', description: '选中患者', context: 'patient-search' },
  { key: 'up', action: 'prev', description: '上一个结果', context: 'patient-search' },
  { key: 'down', action: 'next', description: '下一个结果', context: 'patient-search' },
  { key: 'ctrl+r', action: 'advanced-search', description: '高级搜索', context: 'patient-search' },
];

/** 报告查看键位 */
export const REPORT_VIEW_KEYBINDINGS: Keybinding[] = [
  { key: 'escape', action: 'close', description: '关闭报告', context: 'report-view' },
  { key: 'q', action: 'close', description: '关闭报告', context: 'report-view' },
  { key: 'left', action: 'prev-report', description: '上一份报告', context: 'report-view' },
  { key: 'right', action: 'next-report', description: '下一份报告', context: 'report-view' },
  { key: 'ctrl+e', action: 'expand-all', description: '展开全部', context: 'report-view' },
  { key: 'pageup', action: 'scroll-up', description: '向上滚动', context: 'report-view' },
  { key: 'pagedown', action: 'scroll-down', description: '向下滚动', context: 'report-view' },
];

// ============================================================================
// 全部键位汇总
// ============================================================================

/** 全部键位绑定（按上下文分组） */
export const ALL_KEYBINDINGS: Record<KeybindingContext, Keybinding[]> = {
  global: [...GLOBAL_KEYBINDINGS, ...MEDICAL_KEYBINDINGS.filter((k) => k.context === 'global')],
  dashboard: [],
  outpatient: MEDICAL_KEYBINDINGS.filter((k) => k.context === 'outpatient'),
  'ward-round': MEDICAL_KEYBINDINGS.filter((k) => k.context === 'ward-round'),
  consultation: [],
  input: MEDICAL_KEYBINDINGS.filter((k) => k.context === 'input'),
  'command-palette': COMMAND_PALETTE_KEYBINDINGS,
  confirmation: CONFIRMATION_KEYBINDINGS,
  'patient-search': PATIENT_SEARCH_KEYBINDINGS,
  'order-entry': MEDICAL_KEYBINDINGS.filter((k) => k.context === 'order-entry'),
  'report-view': REPORT_VIEW_KEYBINDINGS,
  help: [{ key: 'escape', action: 'close', description: '关闭帮助', context: 'help' }],
};

/** 扁平化的全部键位列表 */
export const ALL_KEYBINDINGS_FLAT: Keybinding[] = [
  ...GLOBAL_KEYBINDINGS,
  ...MEDICAL_KEYBINDINGS,
  ...CONFIRMATION_KEYBINDINGS,
  ...COMMAND_PALETTE_KEYBINDINGS,
  ...PATIENT_SEARCH_KEYBINDINGS,
  ...REPORT_VIEW_KEYBINDINGS,
];

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取指定上下文的键位
 * @param context - 键位上下文
 * @returns 该上下文的键位列表
 */
export function getKeybindingsForContext(context: KeybindingContext): Keybinding[] {
  return ALL_KEYBINDINGS[context] ?? [];
}

/**
 * 获取活跃上下文栈的所有键位（全局+指定上下文）
 * @param contexts - 活跃上下文列表
 * @returns 合并后的键位列表
 */
export function getActiveKeybindings(contexts: KeybindingContext[]): Keybinding[] {
  const result: Keybinding[] = [...ALL_KEYBINDINGS.global];
  for (const ctx of contexts) {
    if (ctx !== 'global') {
      result.push(...(ALL_KEYBINDINGS[ctx] ?? []));
    }
  }
  return result;
}

/**
 * 格式化键位显示字符串
 * @param key - 键位字符串
 * @returns 格式化后的显示字符串
 */
export function formatKeybinding(key: string): string {
  return key
    .split('+')
    .map((part) => {
      const map: Record<string, string> = {
        ctrl: 'Ctrl',
        meta: 'Meta',
        shift: 'Shift',
        alt: 'Alt',
        up: '↑',
        down: '↓',
        left: '←',
        right: '→',
        enter: 'Enter',
        escape: 'Esc',
        space: 'Space',
        tab: 'Tab',
        backspace: 'Backspace',
        delete: 'Delete',
        pageup: 'PageUp',
        pagedown: 'PageDown',
      };
      return map[part.toLowerCase()] ?? part.toUpperCase();
    })
    .join('+');
}

/**
 * 按动作名称查找键位
 * @param action - 动作名称
 * @returns 匹配的键位列表
 */
export function findKeybindingsByAction(action: string): Keybinding[] {
  return ALL_KEYBINDINGS_FLAT.filter((k) => k.action === action);
}
