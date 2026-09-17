/**
 * 健澜科技数智医院智能体 - 主题提供者
 *
 * React Context实现主题注入，支持主题切换与实时预览，
 * 与终端颜色能力检测集成。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { JianlanTheme, JianlanThemeName } from './jianlanTheme';
import {
  defaultJianlanThemeName,
  getJianlanTheme,
  jianlanThemes,
  supportsTrueColor,
} from './jianlanTheme';

// ============================================================================
// Context 定义
// ============================================================================

/** 主题上下文值 */
export interface ThemeContextValue {
  /** 当前激活的主题对象 */
  theme: JianlanTheme;
  /** 当前主题名称 */
  themeName: JianlanThemeName;
  /** 预览中的主题名称（未保存） */
  previewThemeName: JianlanThemeName | null;
  /** 是否支持真彩色 */
  hasTrueColor: boolean;
  /** 切换主题 */
  setTheme: (name: JianlanThemeName) => void;
  /** 预览主题（不保存） */
  previewTheme: (name: JianlanThemeName) => void;
  /** 保存预览的主题 */
  savePreviewTheme: () => void;
  /** 取消预览，恢复已保存主题 */
  cancelPreviewTheme: () => void;
  /** 切换明暗模式 */
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================================================
// 本地存储键
// ============================================================================

const THEME_STORAGE_KEY = 'jianlan-medical-agent:theme';

/**
 * 从本地存储读取已保存的主题
 * @returns 保存的主题名称，若无则返回默认
 */
function loadSavedTheme(): JianlanThemeName {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && saved in jianlanThemes) {
        return saved as JianlanThemeName;
      }
    }
  } catch {
    // 忽略存储访问错误
  }
  return defaultJianlanThemeName;
}

/**
 * 保存主题到本地存储
 * @param name - 主题名称
 */
function saveThemeToStorage(name: JianlanThemeName): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, name);
    }
  } catch {
    // 忽略存储写入错误
  }
}

// ============================================================================
// Provider 组件
// ============================================================================

/** ThemeProvider 属性 */
export interface ThemeProviderProps {
  /** 子组件 */
  children: React.ReactNode;
  /** 初始主题（覆盖本地存储） */
  initialTheme?: JianlanThemeName;
}

/**
 * 健澜主题提供者组件
 *
 * 管理主题状态，提供主题切换、预览、明暗模式切换等功能。
 * 通过React Context向子组件注入主题对象。
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, initialTheme }: ThemeProviderProps): React.ReactElement {
  const [savedThemeName, setSavedThemeName] = useState<JianlanThemeName>(
    initialTheme ?? loadSavedTheme(),
  );
  const [previewThemeName, setPreviewThemeName] = useState<JianlanThemeName | null>(null);
  const [hasTrueColor, setHasTrueColor] = useState<boolean>(false);

  // 检测终端颜色能力
  useEffect(() => {
    setHasTrueColor(supportsTrueColor());
  }, []);

  // 当前激活的主题名称（预览优先）
  const activeThemeName = previewThemeName ?? savedThemeName;

  // 当前主题对象
  const theme = useMemo<JianlanTheme>(() => getJianlanTheme(activeThemeName), [activeThemeName]);

  /** 切换并保存主题 */
  const setTheme = useCallback((name: JianlanThemeName) => {
    setSavedThemeName(name);
    setPreviewThemeName(null);
    saveThemeToStorage(name);
  }, []);

  /** 预览主题（不保存） */
  const previewTheme = useCallback((name: JianlanThemeName) => {
    setPreviewThemeName(name);
  }, []);

  /** 保存预览的主题 */
  const savePreviewTheme = useCallback(() => {
    if (previewThemeName) {
      setSavedThemeName(previewThemeName);
      saveThemeToStorage(previewThemeName);
      setPreviewThemeName(null);
    }
  }, [previewThemeName]);

  /** 取消预览，恢复已保存主题 */
  const cancelPreviewTheme = useCallback(() => {
    setPreviewThemeName(null);
  }, []);

  /** 切换明暗模式 */
  const toggleColorScheme = useCallback(() => {
    const next: JianlanThemeName =
      activeThemeName === 'jianlan-dark' ? 'jianlan-light' : 'jianlan-dark';
    setTheme(next);
  }, [activeThemeName, setTheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeName: activeThemeName,
      previewThemeName,
      hasTrueColor,
      setTheme,
      previewTheme,
      savePreviewTheme,
      cancelPreviewTheme,
      toggleColorScheme,
    }),
    [
      theme,
      activeThemeName,
      previewThemeName,
      hasTrueColor,
      setTheme,
      previewTheme,
      savePreviewTheme,
      cancelPreviewTheme,
      toggleColorScheme,
    ],
  );

  return React.createElement(ThemeContext.Provider, { value: contextValue }, children);
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 使用主题上下文
 * @returns 主题上下文值
 * @throws 当在ThemeProvider外部使用时抛出错误
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme 必须在 <ThemeProvider> 内部使用');
  }
  return context;
}

/**
 * 便捷Hook：仅获取主题对象
 * @returns 当前主题对象
 */
export function useThemeColors(): JianlanTheme {
  return useTheme().theme;
}

/**
 * 便捷Hook：判断是否为暗色主题
 * @returns 是否为暗色主题
 */
export function useIsDarkTheme(): boolean {
  const { themeName } = useTheme();
  return themeName === 'jianlan-dark';
}
