/**
 * 健澜科技数智医院智能体 - 主题系统统一导出
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

export type { JianlanTheme, JianlanThemeName } from './jianlanTheme';
export {
  defaultJianlanTheme,
  defaultJianlanThemeName,
  getJianlanTheme,
  JIANLAN_DANGER_RED,
  JIANLAN_DEEP_BLUE,
  JIANLAN_INFO_BLUE,
  JIANLAN_MEDICAL_TEAL,
  JIANLAN_OCEAN_BLUE,
  JIANLAN_SKY_BLUE,
  JIANLAN_SUCCESS_GREEN,
  JIANLAN_WARNING_ORANGE,
  jianlanDarkTheme,
  jianlanLightTheme,
  jianlanThemes,
  supportsTrueColor,
} from './jianlanTheme';
export type { ThemeContextValue, ThemeProviderProps } from './ThemeProvider';
export { ThemeProvider, useIsDarkTheme, useTheme, useThemeColors } from './ThemeProvider';
