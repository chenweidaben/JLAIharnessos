/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 通知渠道配置 - 状态管理（Zustand）
 * 覆盖：微信/钉钉 webhook 地址、三类事件开关、测试发送
 */
import { create } from 'zustand';
import {
  notifyConfigApi,
  type NotifyConfig,
  type NotifyEventKind,
  type NotifyTestResult,
} from '@/services/api/notifyConfig';

const DEFAULT_CONFIG: NotifyConfig = {
  wechatWebhookUrl: '',
  dingTalkWebhookUrl: '',
  enabled: { criticalValue: true, pendingApproval: true, followup: true },
};

interface NotifyConfigState {
  config: NotifyConfig;
  loading: boolean;
  saving: boolean;
  /** 最近一次测试发送的反馈信息（DEMO 下提示「已打印日志」） */
  lastTestMessage: string;
  fetchConfig: () => Promise<void>;
  saveConfig: (patch: Partial<NotifyConfig>) => Promise<void>;
  toggleEvent: (event: NotifyEventKind) => Promise<void>;
  testSend: (event: NotifyEventKind) => Promise<NotifyTestResult>;
}

export const useNotifyConfigStore = create<NotifyConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  loading: false,
  saving: false,
  lastTestMessage: '',

  fetchConfig: async () => {
    set({ loading: true });
    try {
      const cfg = await notifyConfigApi.config();
      set({ config: { ...DEFAULT_CONFIG, ...cfg, enabled: { ...cfg.enabled } } });
    } finally {
      set({ loading: false });
    }
  },

  saveConfig: async (patch) => {
    set({ saving: true });
    try {
      const merged = { ...get().config, ...patch };
      const saved = await notifyConfigApi.updateConfig(merged);
      set({ config: saved });
    } finally {
      set({ saving: false });
    }
  },

  toggleEvent: async (event) => {
    const next: NotifyConfig = {
      ...get().config,
      enabled: { ...get().config.enabled, [event]: !get().config.enabled[event] },
    };
    set({ config: next });
    // 乐观更新后同步到后端内存配置
    await notifyConfigApi.updateConfig(next).catch(() => undefined);
  },

  testSend: async (event) => {
    const result = await notifyConfigApi.test(event);
    const skipped = result.channels.filter((c) => !c.ok);
    const message =
      skipped.length > 0
        ? '已打印日志（部分渠道未配置 webhook，已跳过）'
        : '已打印日志（DEMO 模式未真实发送）';
    set({ lastTestMessage: message });
    return result;
  },
}));
