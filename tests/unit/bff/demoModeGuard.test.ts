/**
 * DEMO_MODE 下 BFF aggregator 守卫测试。
 *
 * 背景：DEMO_MODE=1 时 BFF 不应连 PostgreSQL；任何 aggregator 的 listView /
 * 默认入口若直连 repo 都会触发 500。本测试在 DEMO_MODE=1 下逐个调用最近新增的
 * aggregator，验证：
 *   1. 不抛异常（不会因为 getDb() / repo 查询而 reject）；
 *   2. 返回值 demo 字段恒为 true（兜底数据）；
 *   3. 写路径（submitView / signView）在 DEMO_MODE 下同样不抛错。
 *
 * 注意：必须在 import aggregator 之前设置 process.env.DEMO_MODE，并通过
 * _resetEnvCache() 清掉 env 模块的缓存，否则 getEnv() 可能沿用前次测试的快照。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

// DEMO_MODE 必须在任何 aggregator 模块被请求 getEnv() 之前就位。
process.env.DEMO_MODE = '1';
delete process.env.DATABASE_URL;

import { _resetEnvCache, getEnv } from '@/bff/config/env.js';
import {
  listView as emrGrade5ListView,
  submitView as emrGrade5SubmitView,
  GRADE5_DIMENSIONS,
} from '@/bff/aggregators/emrGrade5Aggregator.js';
import {
  auditBatch,
  hitRateStats,
  DRG_AUDIT_RULES,
  SAMPLE_DRG_CONFIG,
  type DrgAuditVisit,
} from '@/bff/aggregators/drgAuditAggregator.js';
import {
  listView as ceoDashboardListView,
} from '@/bff/aggregators/ceoDashboardAggregator.js';
import {
  listView as surgeryChecklistListView,
  signView as surgeryChecklistSignView,
  CHECKLIST_PHASES,
} from '@/bff/aggregators/surgeryChecklistAggregator.js';
import {
  listView as nursingNqiListView,
  NQI_INDICATORS,
} from '@/bff/aggregators/nursingNqiAggregator.js';
import {
  listView as opdWorkstationListView,
} from '@/bff/aggregators/opdWorkstationAggregator.js';
import type { AuthView } from '@/bff/view/userView.js';

/**
 * 构造一个最小可用的 AuthView（仅满足本测试用到的字段）。
 * 真实 AuthView 字段较多，这里用 as unknown as AuthView 穿透类型检查，
 * 因为 aggregator 在 DEMO_MODE 短路前只会断言 permissions 包含目标权限码。
 */
function fakeAdminView(): AuthView {
  return {
    id: 'u-demo',
    username: 'demo',
    realName: '演示用户',
    employeeNo: 'E0001',
    gender: 'unknown',
    deptCode: 'dept',
    deptName: '全院',
    title: '主任医师',
    phone: '',
    email: '',
    status: 'active',
    roles: [],
    roleCodes: ['admin'],
    rawRoles: ['admin'],
    permissions: ['emr_level5:view'],
    dataScope: 'all',
  } as unknown as AuthView;
}

describe('DEMO_MODE guard', () => {
  beforeAll(() => {
    // 清掉 env 缓存，确保本次测试运行时读到的是 DEMO_MODE=1 的快照
    _resetEnvCache();
  });

  afterAll(() => {
    // 还原，避免污染同进程后续用例
    delete process.env.DEMO_MODE;
    _resetEnvCache();
  });

  it('env 解析识别 DEMO_MODE=1', () => {
    expect(getEnv().demoMode).toBe(true);
  });

  it('emrGrade5Aggregator.listView 在 DEMO 下返回演示基线，不连库', async () => {
    const view = await emrGrade5ListView(fakeAdminView());
    expect(view.demo).toBe(true);
    expect(view.assessedAt).toBeNull();
    expect(view.dimensions.length).toBe(GRADE5_DIMENSIONS.length);
    expect(view.maxTotal).toBe(GRADE5_DIMENSIONS.length * 100);
    // 八维得分合计在合理区间
    expect(view.totalScore).toBeGreaterThan(0);
    expect(view.totalScore).toBeLessThanOrEqual(view.maxTotal);
  });

  it('emrGrade5Aggregator.submitView 在 DEMO 下不落库也不抛错', async () => {
    const view = await emrGrade5SubmitView(fakeAdminView(), {
      dimensions: GRADE5_DIMENSIONS.map((d) => ({
        dimension: d.key,
        items: [{ achieved: true }, { achieved: false }],
      })),
    });
    expect(view.demo).toBe(true);
    expect(view.dimensions.length).toBe(GRADE5_DIMENSIONS.length);
  });

  it('drgAuditAggregator 为纯函数，DEMO 下规则库与批量审核不抛错', () => {
    // 无 repo 调用；这里至少验证模块加载与纯函数入口可执行
    expect(DRG_AUDIT_RULES.length).toBeGreaterThan(0);
    const visits: DrgAuditVisit[] = [
      { visitId: 'v-1', principalDiagnosis: '阑尾炎', totalCost: 8000, losDays: 4 },
      { visitId: 'v-2', principalDiagnosis: '脓毒症', totalCost: 3000, losDays: 2 },
    ];
    const results = auditBatch(visits, SAMPLE_DRG_CONFIG);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);
    // 顶层 null/undefined 安全返回空数组
    expect(auditBatch(null, SAMPLE_DRG_CONFIG)).toEqual([]);
    expect(auditBatch(undefined, SAMPLE_DRG_CONFIG)).toEqual([]);
    const stats = hitRateStats(results);
    expect(stats.totalVisits).toBe(2);
  });

  it('ceoDashboardAggregator.listView 在 DEMO 下返回八大指标演示数据', async () => {
    const view = ceoDashboardListView();
    expect(view.demo).toBe(true);
    expect(view.metrics.length).toBe(8);
    expect(view.trend.length).toBe(24);
    expect(typeof view.generatedAt).toBe('string');
  });

  it('surgeryChecklistAggregator.listView 在 DEMO 下返回默认四阶段清单，不连库', async () => {
    const view = await surgeryChecklistListView({ id: 'u-demo' }, 'SURG-DEMO-001');
    expect(view.surgeryId).toBe('SURG-DEMO-001');
    expect(view.phases.length).toBe(CHECKLIST_PHASES.length);
    for (const p of view.phases) {
      // 演示态未签署：每阶段应有默认核查项、signed=false
      expect(p.items.length).toBeGreaterThan(0);
      expect(p.signed).toBe(false);
      expect(p.signedBy).toBeNull();
    }
  });

  it('surgeryChecklistAggregator.signView 在 DEMO 下回显已签署态，不落库', async () => {
    const view = await surgeryChecklistSignView({ id: 'u-demo' }, {
      surgeryId: 'SURG-DEMO-001',
      phase: 'pre_op',
    });
    expect(view.phase).toBe('pre_op');
    expect(view.signed).toBe(true);
    expect(view.signedBy).toBe('u-demo');
    expect(view.items.length).toBeGreaterThan(0);
  });

  it('nursingNqiAggregator.listView 在 DEMO 下返回四类指标演示趋势', () => {
    const view = nursingNqiListView();
    expect(view.demo).toBe(true);
    expect(view.indicators.length).toBe(NQI_INDICATORS.length);
    // 近 12 个月演示数据
    expect(view.months.length).toBe(12);
  });

  it('opdWorkstationAggregator.listView 在 DEMO 下返回一屏四栏演示数据', async () => {
    const view = await opdWorkstationListView();
    expect(view.demo).toBe(true);
    expect(view.templates.length).toBeGreaterThan(0);
    expect(view.prescriptions.length).toBeGreaterThan(0);
    expect(view.diagnoses.length).toBeGreaterThan(0);
    expect(view.catalog.length).toBeGreaterThan(0);
  });
});
