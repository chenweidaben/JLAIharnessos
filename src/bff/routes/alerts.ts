/**
 * 健澜科技 jlmedaios - 系统告警中心路由
 * GET /api/v1/alerts  返回当前医生视角的未决告警列表（危急值/过敏/用药相互作用/生命体征异常）。
 * DEMO_MODE 下返回内存 demo 数据；真实库告警源接入后替换实现。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 健澜科技：DEMO_MODE 下不连 PostgreSQL，GET 返回内存兜底。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 告警类型（与前端 web/src/types/medical.AlertType 对齐）。 */
export type AlertType = 'critical-value' | 'allergy' | 'drug-interaction' | 'abnormal-vital';

/** 告警级别（与前端 web/src/types/common.MedicalLevel 对齐）。 */
export type AlertLevel = 'critical' | 'abnormal' | 'normal' | 'pending';

/** 告警列表项视图。 */
export interface AlertView {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  content: string;
  patientId: string;
  patientName?: string;
  createdAt: string;
  acknowledged: boolean;
}

/**
 * 纯函数：构造系统告警 demo 数据（无副作用、可单测）。
 * 形状与前端 `fetchAlerts(): Promise<Alert[]>` 对齐。
 *
 * @returns 告警列表
 */
export function listView(): AlertView[] {
  return [
    {
      id: 'ALM-20261015-001',
      type: 'critical-value',
      level: 'critical',
      title: '危急值：血钾 6.8 mmol/L',
      content: '患者血钾高于危急上限 5.5 mmol/L，请立即处理并记录。',
      patientId: 'P100234',
      patientName: '王*明',
      createdAt: '2026-10-15T08:32:00.000Z',
      acknowledged: false,
    },
    {
      id: 'ALM-20261015-002',
      type: 'drug-interaction',
      level: 'abnormal',
      title: '用药相互作用：华法林 + 阿司匹林',
      content: '两药联用显著增加出血风险，请复核医嘱。',
      patientId: 'P100567',
      patientName: '李*华',
      createdAt: '2026-10-15T07:50:00.000Z',
      acknowledged: false,
    },
    {
      id: 'ALM-20261015-003',
      type: 'abnormal-vital',
      level: 'abnormal',
      title: '生命体征异常：心率 118 bpm',
      content: '持续心动过速，请结合床旁评估。',
      patientId: 'P100789',
      patientName: '张*芳',
      createdAt: '2026-10-15T06:40:00.000Z',
      acknowledged: true,
    },
    {
      id: 'ALM-20261014-011',
      type: 'allergy',
      level: 'critical',
      title: '过敏史提醒：青霉素',
      content: '患者既往青霉素过敏，本次医嘱含阿莫西林，请核对。',
      patientId: 'P100901',
      patientName: '赵*兰',
      createdAt: '2026-10-14T15:20:00.000Z',
      acknowledged: false,
    },
  ];
}

export const alertsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/alerts',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
      if (isDemo) return json(ok(listView(), 'ok', c.traceId));
      // 真实告警源接入前，兜底返回内存 demo 告警，保证告警中心可渲染。
      return json(ok(listView(), 'ok', c.traceId));
    },
  },
];
