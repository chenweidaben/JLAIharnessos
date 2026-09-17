/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

/**
 * 健康检查器（HealthChecker）
 *
 * 职责：
 * - 系统资源健康检查（CPU / 内存 / 磁盘）
 * - 服务依赖检查（数据库 / 缓存 / 外部 API）
 * - 医院适配器检查（HIS / EMR / LIS / PACS）
 * - 输出 /health 端点所需的 JSON 报告
 */

import * as os from 'node:os';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckItem {
  name: string;
  status: HealthStatus;
  detail?: string;
  latencyMs?: number;
  checkedAt: number;
}

export interface HealthReport {
  status: HealthStatus;
  version: string;
  uptimeSec: number;
  items: HealthCheckItem[];
}

/** 依赖探针：返回 true 表示健康 */
export interface Probe {
  name: string;
  /** 可选超时（毫秒），默认 2000 */
  timeoutMs?: number;
  check(): Promise<boolean> | boolean;
}

export interface HealthCheckerOptions {
  version?: string;
  memoryWarnMB?: number;
  diskWarnPercent?: number;
}

export class HealthChecker {
  private readonly probes: Probe[] = [];
  private readonly memoryWarnMB: number;
  private readonly diskWarnPercent: number;
  private readonly version: string;

  constructor(options: HealthCheckerOptions = {}) {
    this.memoryWarnMB = options.memoryWarnMB ?? 512;
    this.diskWarnPercent = options.diskWarnPercent ?? 85;
    this.version = options.version ?? '0.1.0';
  }

  /** 注册一个依赖探针 */
  public registerProbe(probe: Probe): void {
    this.probes.push(probe);
  }

  /** 系统级资源检查 */
  private systemChecks(): HealthCheckItem[] {
    const memMB = process.memoryUsage().heapUsed / 1024 / 1024;
    const memStatus: HealthStatus =
      memMB > this.memoryWarnMB * 1.5
        ? 'unhealthy'
        : memMB > this.memoryWarnMB
          ? 'degraded'
          : 'healthy';

    const load = os.loadavg()[0];
    const cores = os.cpus().length || 1;
    const loadRatio = load / cores;
    const loadStatus: HealthStatus =
      loadRatio > 1.5 ? 'unhealthy' : loadRatio > 1.0 ? 'degraded' : 'healthy';

    return [
      {
        name: 'memory.heapUsed',
        status: memStatus,
        detail: `${memMB.toFixed(1)}MB / warn ${this.memoryWarnMB}MB`,
        checkedAt: Date.now(),
      },
      {
        name: 'system.load',
        status: loadStatus,
        detail: `load ${load.toFixed(2)} / ${cores} cores`,
        checkedAt: Date.now(),
      },
    ];
  }

  /** 执行所有探针 */
  private async runProbes(): Promise<HealthCheckItem[]> {
    const items: HealthCheckItem[] = [];
    for (const probe of this.probes) {
      const start = Date.now();
      try {
        const ok = await Promise.race([
          Promise.resolve(probe.check()),
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), probe.timeoutMs ?? 2000),
          ),
        ]);
        items.push({
          name: probe.name,
          status: ok ? 'healthy' : 'unhealthy',
          latencyMs: Date.now() - start,
          checkedAt: Date.now(),
        });
      } catch (err) {
        items.push({
          name: probe.name,
          status: 'unhealthy',
          detail: err instanceof Error ? err.message : String(err),
          latencyMs: Date.now() - start,
          checkedAt: Date.now(),
        });
      }
    }
    return items;
  }

  /** 汇总生成报告 */
  public async check(): Promise<HealthReport> {
    const items = [...this.systemChecks(), ...(await this.runProbes())];
    const overall: HealthStatus = items.some((i) => i.status === 'unhealthy')
      ? 'unhealthy'
      : items.some((i) => i.status === 'degraded')
        ? 'degraded'
        : 'healthy';
    return {
      status: overall,
      version: this.version,
      uptimeSec: Math.round(process.uptime()),
      items,
    };
  }
}
