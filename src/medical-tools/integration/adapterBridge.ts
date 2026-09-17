/**
 * 健澜科技数智医院智能体 - 系统集成适配器桥接
 *
 * 为系统集成类医疗工具提供延迟初始化的 Mock 适配器单例。
 * 所有适配器初始化均包裹在 try/catch 中，初始化失败时返回 null，
 * 工具层据此回退到内置 Mock 数据，保证工具在任何环境下均可执行。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { EMRMockAdapter } from '../../integration/adapters/emr/EMRMockAdapter.js';
import { HISMockAdapter } from '../../integration/adapters/his/HISMockAdapter.js';
import { PACSMockAdapter } from '../../integration/adapters/pacs/PACSMockAdapter.js';

/** HIS Mock 适配器单例（惰性初始化） */
let hisAdapter: HISMockAdapter | null = null;
/** EMR Mock 适配器单例（惰性初始化） */
let emrAdapter: EMRMockAdapter | null = null;
/** PACS Mock 适配器单例（惰性初始化） */
let pacsAdapter: PACSMockAdapter | null = null;

/**
 * 获取 HIS Mock 适配器
 *
 * 首次调用时完成初始化；初始化失败返回 null。
 *
 * @returns HIS 适配器实例或 null
 */
export async function getHISAdapter(): Promise<HISMockAdapter | null> {
  try {
    if (!hisAdapter) {
      hisAdapter = new HISMockAdapter();
      await hisAdapter.init();
    }
    return hisAdapter;
  } catch {
    return null;
  }
}

/**
 * 获取 EMR Mock 适配器
 *
 * 首次调用时完成初始化；初始化失败返回 null。
 *
 * @returns EMR 适配器实例或 null
 */
export async function getEMRAdapter(): Promise<EMRMockAdapter | null> {
  try {
    if (!emrAdapter) {
      emrAdapter = new EMRMockAdapter();
      await emrAdapter.init();
    }
    return emrAdapter;
  } catch {
    return null;
  }
}

/**
 * 获取 PACS Mock 适配器
 *
 * 首次调用时完成初始化；初始化失败返回 null。
 *
 * @returns PACS 适配器实例或 null
 */
export async function getPACSAdapter(): Promise<PACSMockAdapter | null> {
  try {
    if (!pacsAdapter) {
      pacsAdapter = new PACSMockAdapter();
      await pacsAdapter.init();
    }
    return pacsAdapter;
  } catch {
    return null;
  }
}

/** 重置适配器单例（主要用于单元测试隔离） */
export function resetIntegrationAdapters(): void {
  hisAdapter = null;
  emrAdapter = null;
  pacsAdapter = null;
}
