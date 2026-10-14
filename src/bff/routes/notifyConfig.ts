/**
 * 健澜科技 jlmedaios - 通知渠道配置 BFF 路由
 *
 * 路由：
 *  - GET  /api/v1/notify/config   读取内存通知配置（webhook url + 事件开关）
 *  - PUT  /api/v1/notify/config  更新内存通知配置
 *  - POST /api/v1/notify/config/test?event=criticalValue|pendingApproval|followup
 *                                 触发一次测试发送（DEMO 下仅打印日志）
 *
 * 安全要点：通知 webhook 地址属敏感外联配置，仅 admin 角色可读写。
 * 配置保存在进程内存，不建 DB 表，不落盘。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  getNotifyConfig,
  setNotifyConfig,
  testNotify,
  type NotifyConfig,
} from '../notify/notifyChannels';

type NotifyEventKind = 'criticalValue' | 'pendingApproval' | 'followup';

function normalizeEnabled(input: unknown): NotifyConfig['enabled'] | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const o = input as Record<string, unknown>;
  return {
    criticalValue: Boolean(o.criticalValue),
    pendingApproval: Boolean(o.pendingApproval),
    followup: Boolean(o.followup),
  };
}

export const notifyConfigRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/notify/config',
    auth: true,
    handle: (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      return json(ok(getNotifyConfig()));
    },
  },
  {
    method: 'PUT',
    path: '/api/v1/notify/config',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      const body = (await c.body()) as Partial<NotifyConfig> & {
        enabled?: Record<string, unknown>;
      };
      const updated = setNotifyConfig({
        wechatWebhookUrl: body.wechatWebhookUrl,
        dingTalkWebhookUrl: body.dingTalkWebhookUrl,
        enabled: normalizeEnabled(body.enabled),
      });
      return json(ok(updated));
    },
  },
  {
    method: 'POST',
    path: '/api/v1/notify/config/test',
    auth: true,
    handle: (c: Ctx) => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;
      const event = (c.query.get('event') ?? 'criticalValue') as NotifyEventKind;
      if (!['criticalValue', 'pendingApproval', 'followup'].includes(event)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'event 必须为 criticalValue/pendingApproval/followup'), 400);
      }
      const results = testNotify(event);
      // DEMO/骨架阶段：全部为 console.info 打印，前端据此提示「已打印日志」
      return json(
        ok({
          event,
          demo: true,
          channels: results,
        }),
      );
    },
  },
];
