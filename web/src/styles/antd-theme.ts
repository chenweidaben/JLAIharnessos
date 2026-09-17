/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * Ant Design 5 主题定制：健澜深海蓝
 */
import type { ThemeConfig } from 'antd';

export const jlTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0A4D8C',
    colorInfo: '#1890FF',
    colorSuccess: '#52C41A',
    colorWarning: '#FAAD14',
    colorError: '#F5222D',
    colorLink: '#1890FF',
    borderRadius: 8,
    colorBgLayout: '#F5F7FA',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#0A4D8C',
      headerBg: '#ffffff',
      bodyBg: '#F5F7FA',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(255,255,255,0.18)',
    },
    Card: {
      borderRadiusLG: 8,
    },
  },
};
