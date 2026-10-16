/**
 * 健澜科技 jlmedaios - 部署准备纯函数单测（M200-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDeploymentReadinessReport,
  checkDeploymentReadiness,
  generateRollbackPlan,
  type ChecklistItem,
  type DeploymentData,
} from '../../src/bff/aggregators/deploymentReadinessAggregator';

describe('checkDeploymentReadiness', () => {
  it('全部通过 → ready', () => {
    const checklist: ChecklistItem[] = [
      { name: 'A', checked: true },
      { name: 'B', checked: true },
    ];
    expect(checkDeploymentReadiness(checklist).ready).toBe(true);
  });

  it('有未通过 → not ready', () => {
    const checklist: ChecklistItem[] = [
      { name: 'A', checked: true },
      { name: 'B', checked: false },
    ];
    const r = checkDeploymentReadiness(checklist);
    expect(r.ready).toBe(false);
    expect(r.pendingItems).toContain('B');
  });
});

describe('generateRollbackPlan', () => {
  it('生成回滚步骤', () => {
    const deployment: DeploymentData = { version: 'v2.77.0', affectedServices: ['svc1', 'svc2'], backupCompleted: true };
    const r = generateRollbackPlan(deployment);
    expect(r.steps.length).toBeGreaterThan(3);
  });
});

describe('buildDeploymentReadinessReport', () => {
  it('生成环境数据', () => {
    const r = buildDeploymentReadinessReport();
    expect(r.environment.servers).toBeGreaterThan(0);
  });

  it('生成服务数据', () => {
    const r = buildDeploymentReadinessReport();
    expect(r.service.healthy).toBeGreaterThan(0);
  });

  it('生成检查清单数据', () => {
    const r = buildDeploymentReadinessReport();
    expect(r.checklist.ready).toBe(true);
  });

  it('生成建议', () => {
    const r = buildDeploymentReadinessReport();
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
