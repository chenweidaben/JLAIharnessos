/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 系统健康监控 API（GET /api/v1/system/health，权限码 system:view）
 */
import { get } from '../request';

export type Severity = 'healthy' | 'warning' | 'critical' | 'unknown';
export type OverallStatus = 'healthy' | 'warning' | 'critical';

export interface HealthCheckItem {
  key: 'bff' | 'db' | 'outbox' | 'agents';
  name: string;
  status: Severity;
  message: string;
}

export interface SystemHealth {
  overall: OverallStatus;
  demo: boolean;
  checkedAt: string;
  bff: {
    status: Severity;
    startedAt: string;
    uptimeSeconds: number;
    requestCount: number;
    message: string;
  };
  db: {
    status: Severity;
    totalCount: number | null;
    idleCount: number | null;
    usedCount: number | null;
    max: number | null;
    message: string;
  };
  outbox: {
    status: Severity;
    pending: number;
    dead: number;
    oldestAgeSeconds: number | null;
    message: string;
  };
  agents: {
    status: Severity;
    total: number;
    tripped: string[];
    message: string;
  };
  checks: HealthCheckItem[];
}

/** 拉取系统健康状态（BFF / DB 连接池 / outbox 积压 / agent 熔断） */
export function fetchSystemHealth(): Promise<SystemHealth> {
  return get<SystemHealth>('/system/health/dashboard');
}
