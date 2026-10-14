/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 通知渠道配置 API（微信/钉钉 Webhook + 三类业务事件开关）
 */
import { get, post, put } from '../request';

/** 三类业务事件 */
export type NotifyEventKind = 'criticalValue' | 'pendingApproval' | 'followup';

/** 事件开关 */
export interface NotifyEventSwitches {
  criticalValue: boolean;
  pendingApproval: boolean;
  followup: boolean;
}

/** 通知配置（与后端 notifyChannels.ts 的 NotifyConfig 对齐） */
export interface NotifyConfig {
  wechatWebhookUrl: string;
  dingTalkWebhookUrl: string;
  enabled: NotifyEventSwitches;
}

/** 测试发送结果 */
export interface NotifyTestResult {
  event: NotifyEventKind;
  demo: boolean;
  channels: Array<{
    ok: boolean;
    demo: boolean;
    channel: 'wechat' | 'dingtalk';
    reason?: string;
  }>;
}

export const notifyConfigApi = {
  /** 读取通知配置 */
  config() {
    return get<NotifyConfig>('/notify/config');
  },
  /** 更新通知配置 */
  updateConfig(data: Partial<NotifyConfig>) {
    return put<NotifyConfig>('/notify/config', data);
  },
  /** 触发一次测试发送（DEMO 下后端仅打印日志） */
  test(event: NotifyEventKind) {
    return post<NotifyTestResult>(`/notify/config/test?event=${event}`, {});
  },
};
