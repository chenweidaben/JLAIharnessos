/**
 * 健澜科技数智医院智能体 - 底部状态栏
 *
 * 屏幕底部通栏：左侧快捷键提示，右侧系统状态、当前时间与连接状态。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';

import { useThemeColors } from '../../theme';

// ============================================================================
// 组件 Props
// ============================================================================

/** FooterBar 属性 */
export interface FooterBarProps {
  /** 快捷键提示列表 */
  shortcuts?: { key: string; label: string }[];
  /** 系统状态文本（左侧） */
  systemStatus?: string;
  /** 网络是否已连接，默认 true */
  connected?: boolean;
  /** 待处理事项数量 */
  pendingCount?: number;
  /** 危急值数量 */
  criticalCount?: number;
}

// ============================================================================
// 组件
// ============================================================================

/**
 * 底部状态栏组件
 *
 * 通栏布局：左侧为快捷键与系统状态，右侧实时时钟与连接状态。
 * 危急值数量以红色徽章醒目提示。
 *
 * @example
 * ```tsx
 * <FooterBar shortcuts={[{key:'←→',label:'切换'}]} pendingCount={3} criticalCount={1} />
 * ```
 */
export function FooterBar({
  shortcuts,
  systemStatus = 'HIS/LIS/PACS 已连接',
  connected = true,
  pendingCount = 0,
  criticalCount = 0,
}: FooterBarProps): React.ReactElement {
  const theme = useThemeColors();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const tick = (): void => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor={theme.panelBackground}
      borderStyle="single"
      borderColor={theme.border}
      paddingX={1}
      paddingY={0}
    >
      {/* 快捷键提示 */}
      {shortcuts && shortcuts.length > 0 && (
        <Box flexDirection="row" gap={1}>
          {shortcuts.map((sc) => (
            <Box key={sc.key} flexDirection="row" gap={0}>
              <Text color={theme.jianlan} bold>
                {sc.key}
              </Text>
              <Text color={theme.subtle}>{sc.label}</Text>
            </Box>
          ))}
          <Text color={theme.divider}>│</Text>
        </Box>
      )}

      {/* 系统状态 */}
      <Text color={theme.inactive}>{systemStatus}</Text>

      {pendingCount > 0 && <Text color={theme.orderPending}> · {pendingCount}待办</Text>}
      {criticalCount > 0 && (
        <Text color={theme.criticalValue} bold backgroundColor={theme.criticalValueBg}>
          {' '}
          🚨{criticalCount}{' '}
        </Text>
      )}

      {/* 右侧 */}
      <Box flexGrow={1} />
      <Box flexDirection="row" gap={1}>
        <Text color={connected ? theme.statusOnline : theme.statusOffline}>
          {connected ? '● 已连接' : '○ 离线'}
        </Text>
        <Text color={theme.subtle}>{currentTime}</Text>
      </Box>
    </Box>
  );
}
