/**
 * 健澜科技数智医院智能体 - 对话模块统一导出
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

export type { ChatInputProps } from './ChatInput';
export { CHAT_INPUT_MODES, ChatInput } from './ChatInput';
export type { ChatMessageListProps } from './ChatMessageList';
export { ChatMessageList, MOCK_CHAT_MESSAGES } from './ChatMessageList';
export type {
  ChatInputMode,
  ChatInputModeInfo,
  ChatMessage,
  ChatMessageRole,
  ChatReference,
  ChatRefKind,
  ToolCallInfo,
  ToolCallStatus,
  ToolConfirmState,
  ToolRiskLevel,
} from './chatTypes';
export { makeMessageId, nowTime } from './chatTypes';
export type { StreamingTextProps, StreamingTextState } from './StreamingText';
export {
  renderInlineMarkdown,
  renderMarkdown,
  StreamingText,
  useStreamingText,
} from './StreamingText';
export type { ToolCallDisplayProps } from './ToolCallDisplay';
export { ToolCallDisplay } from './ToolCallDisplay';
