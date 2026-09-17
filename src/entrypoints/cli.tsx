/**
 * 健澜科技数智医院智能体 - CLI入口（简化版）
 *
 * 初始化主题、键位、命令，渲染DashboardScreen，
 * 提供基础事件循环。不集成真实Agent，仅做UI框架展示。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { Box, render, Text, useApp, useInput } from 'ink';
import React, { useCallback, useState } from 'react';

import { generateHelpText, MEDICAL_COMMANDS } from '../ui/commands';
import { StatusLine } from '../ui/components';
import { AlertBanner } from '../ui/components/AlertBanner';
import { CommandPalette } from '../ui/components/input/CommandPalette';
import { ALL_KEYBINDINGS_FLAT, formatKeybinding } from '../ui/keybindings';
import { DashboardScreen, OutpatientScreen, WardRoundScreen } from '../ui/screens';
import { ThemeProvider, useTheme, useThemeColors } from '../ui/theme';
import type { MedicalCommand, ScreenType, SessionState } from '../ui/types';
import { getTerminalSize } from '../ui/utils/layout';

// ============================================================================
// 应用版本信息
// ============================================================================

const APP_NAME = '健澜科技数智医院智能体';
const APP_VERSION = '1.0.0';
const APP_COPYRIGHT = 'Copyright (c) 2026 健澜科技. All rights reserved.';

// ============================================================================
// 主应用组件
// ============================================================================

/**
 * 主应用组件
 *
 * 管理全局屏幕状态、命令面板、警报显示，
 * 处理全局键盘快捷键，渲染当前屏幕和状态栏。
 */
function App(): React.ReactElement {
  const theme = useThemeColors();
  const { themeName, toggleColorScheme } = useTheme();
  const { exit } = useApp();

  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // 屏幕切换
  const navigate = useCallback((screen: ScreenType) => {
    setCurrentScreen(screen);
    setStatusMessage(
      `已切换到${screen === 'dashboard' ? '主仪表盘' : screen === 'outpatient' ? '门诊问诊' : '查房'}屏幕`,
    );
  }, []);

  // 命令选择处理
  const handleCommandSelect = useCallback(
    (cmd: MedicalCommand) => {
      setStatusMessage(`执行命令: /${cmd.name} - ${cmd.description}`);
      // 根据命令类型执行相应操作
      switch (cmd.name) {
        case 'clear':
          setStatusMessage('对话已清空');
          break;
        case 'theme':
          toggleColorScheme();
          setStatusMessage(`主题已切换为: ${themeName === 'jianlan-dark' ? '亮色' : '暗色'}`);
          break;
        case 'help':
          setShowHelp(true);
          break;
        case 'exit':
        case 'quit':
          exit();
          break;
        case 'outpatient':
        case 'mode':
          navigate('outpatient');
          break;
        case 'ward':
          navigate('ward-round');
          break;
        case 'patient':
        case 'current':
        case 'summary':
        case 'record':
        case 'order':
        case 'lab':
        case 'drug':
        case 'alert':
        case 'vitals':
        case 'qa':
          setStatusMessage(`命令 /${cmd.name} 将在Agent集成层实现`);
          break;
        default:
          break;
      }
    },
    [navigate, toggleColorScheme, themeName, exit],
  );

  // 全局键盘输入
  useInput((input, key) => {
    // 命令面板打开时，由CommandPalette处理
    if (showCommandPalette) return;

    // 帮助页面
    if (showHelp) {
      if (key.escape || input === 'q') {
        setShowHelp(false);
      }
      return;
    }

    // Ctrl+C 中断
    if (key.ctrl && input === 'c') {
      if (sessionState !== 'idle') {
        setSessionState('idle');
        setStatusMessage('操作已中断');
      }
      return;
    }

    // Ctrl+D 退出（输入框为空时）
    if (key.ctrl && input === 'd') {
      exit();
      return;
    }

    // Ctrl+L 清屏
    if (key.ctrl && input === 'l') {
      setStatusMessage('屏幕已重绘');
      return;
    }

    // Ctrl+P / Ctrl+K 命令面板
    if ((key.ctrl && input === 'p') || (key.ctrl && input === 'k')) {
      setShowCommandPalette(true);
      return;
    }

    // F1 帮助 (通过 escape 序列检测，标准Ink Key类型无f1属性)
    // 使用 Ctrl+H 作为帮助快捷键
    if (key.ctrl && input === 'h') {
      setShowHelp(true);
      return;
    }

    // 屏幕切换快捷键
    if (key.ctrl && input === '1') {
      navigate('dashboard');
      return;
    }
    if (key.ctrl && input === '2') {
      navigate('outpatient');
      return;
    }
    if (key.ctrl && input === '3') {
      navigate('ward-round');
      return;
    }

    // Ctrl+A 查看警报 (替代F9)
    if (key.ctrl && input === 'a') {
      setShowAlerts(!showAlerts);
      return;
    }

    // 斜杠命令输入
    if (input === '/') {
      setShowCommandPalette(true);
      return;
    }
  });

  // 渲染当前屏幕
  function renderScreen(): React.ReactElement {
    switch (currentScreen) {
      case 'outpatient':
        return <OutpatientScreen onBack={() => navigate('dashboard')} />;
      case 'ward-round':
        return <WardRoundScreen onBack={() => navigate('dashboard')} />;
      case 'consultation':
        return (
          <Box
            flexDirection="column"
            flexGrow={1}
            borderStyle="round"
            borderColor={theme.border}
            paddingX={2}
            paddingY={1}
          >
            <Text color={theme.jianlan} bold>
              👥 多学科会诊
            </Text>
            <Box marginTop={1}>
              <Text color={theme.subtle}>会诊屏幕开发中...</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={theme.inactive}>按 Ctrl+1 返回主仪表盘</Text>
            </Box>
          </Box>
        );
      case 'dashboard':
      default:
        return <DashboardScreen onNavigate={navigate} />;
    }
  }

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={0}>
      {/* 警报横幅 */}
      {showAlerts && (
        <Box marginBottom={0}>
          <AlertBanner />
        </Box>
      )}

      {/* 状态消息 */}
      {statusMessage && (
        <Box>
          <Text color={theme.assistant}>› {statusMessage}</Text>
        </Box>
      )}

      {/* 主内容区 */}
      <Box flexGrow={1} flexDirection="column">
        {renderScreen()}
      </Box>

      {/* 帮助覆盖层 */}
      {showHelp && (
        <Box
          flexGrow={1}
          flexDirection="column"
          borderStyle="double"
          borderColor={theme.borderFocus}
          backgroundColor={theme.background}
          paddingX={2}
          paddingY={1}
        >
          <Text color={theme.jianlan} bold>
            📖 {APP_NAME} - 帮助
          </Text>
          <Box marginTop={0}>
            <Text color={theme.subtle}>
              版本 {APP_VERSION} | {APP_COPYRIGHT}
            </Text>
          </Box>
          <Box marginTop={0}>
            <Text color={theme.text}>{generateHelpText()}</Text>
          </Box>
          <Box marginTop={0}>
            <Text color={theme.jianlan} bold>
              快捷键:
            </Text>
            {ALL_KEYBINDINGS_FLAT.slice(0, 20).map((kb) => (
              <Text key={kb.key + kb.action} color={theme.subtle}>
                {formatKeybinding(kb.key).padEnd(16)} {kb.description}
              </Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color={theme.inactive}>按 Esc 或 q 关闭帮助</Text>
          </Box>
        </Box>
      )}

      {/* 命令面板 */}
      <CommandPalette
        visible={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelect={handleCommandSelect}
        commands={MEDICAL_COMMANDS}
      />

      {/* 底部状态栏 */}
      <StatusLine sessionState={sessionState} />
    </Box>
  );
}

// ============================================================================
// 根组件（包含ThemeProvider）
// ============================================================================

function Root(): React.ReactElement {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

// ============================================================================
// CLI主函数
// ============================================================================

/**
 * CLI主入口
 *
 * 初始化终端环境，打印启动信息，渲染Ink应用。
 */
function main(): void {
  // 检测终端尺寸
  const size = getTerminalSize();

  // 打印启动信息到stderr（不干扰Ink渲染）
  process.stderr.write(`${APP_NAME} v${APP_VERSION}\n`);
  process.stderr.write(`${APP_COPYRIGHT}\n`);
  process.stderr.write(`终端: ${size.columns}x${size.rows}\n`);
  process.stderr.write(`主题: 健澜深海蓝\n`);
  process.stderr.write(`命令: ${MEDICAL_COMMANDS.length}个医疗命令已加载\n`);
  process.stderr.write(`键位: ${ALL_KEYBINDINGS_FLAT.length}个快捷键已注册\n`);
  process.stderr.write(`正在启动UI...\n\n`);

  // 渲染Ink应用
  const { waitUntilExit } = render(React.createElement(Root), {
    exitOnCtrlC: false,
  });

  // 等待应用退出
  waitUntilExit()
    .then(() => {
      process.stderr.write(`\n${APP_NAME} 已退出。感谢使用健澜科技产品。\n`);
    })
    .catch((error: unknown) => {
      process.stderr.write(
        `\n应用异常退出: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exit(1);
    });
}

// 启动
main();
