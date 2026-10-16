/**
 * 健澜科技 jlmedaios - M181-B 系统功能全景图 V2 单测（300版本里程碑）
 *
 * 验证纯函数层「全景构建 / 模块统计 / 覆盖率计算」闭环：
 *  - buildSystemMapV2：十大领域齐全、题目要求的全部子模块一个不漏、
 *    generatedAt 为合法 ISO、每次返回全新对象（不共享内部数组引用）；
 *  - getModuleCoverageV2：模块总数、done/partial/planned 计数、覆盖率口径
 *    （done=1，partial=0.5，planned=0）正确，按领域明细与总量一致；
 *  - 边界：传入自定义 map、空 domains、非法入参均安全兜底，不抛错。
 * 全部为纯函数断言，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  buildSystemMapV2,
  getModuleCoverageV2,
  REGISTRY_V2_DOMAIN_COUNT,
  REGISTRY_V2_MODULE_COUNT,
  type SystemDomainV2,
  type SystemMapV2,
} from '../../src/bff/aggregators/systemMapV2Aggregator';

/** 题目要求的十大领域中文名（必须全部出现） */
const EXPECTED_DOMAIN_NAMES_V2 = [
  '临床业务',
  '护理业务',
  '药事业务',
  '管理业务',
  'AI能力',
  '平台能力',
  '患者服务',
  '集团能力',
  '运营支撑',
  '安全合规',
];

/** 每个领域题目要求的子模块中文名（必须一个不漏） */
const EXPECTED_SUBMODULES_V2: Record<string, string[]> = {
  临床业务: ['门诊', '住院', '病历', '处方', '检查', '检验', '手术', '麻醉', '输血', 'DRG'],
  护理业务: ['排班', '交班', '执行', '风险', '质量', 'MUSE'],
  药事业务: ['审方', '库存', '采购', 'ADR', '生命周期', '抗菌药', 'SPD'],
  管理业务: ['质控', '院感', '绩效', '财务', '设备', '耗材', '医保'],
  AI能力: ['诊断', '病历', '用药', '影像', '问答', '预测', '科研', 'CDSS'],
  平台能力: ['学习引擎', 'Personal Agent', '知识联邦', '自学习', '数字孪生'],
  患者服务: ['预约', '缴费', '报告', '导诊', '导航', '教育', '随访', 'MUSE'],
  集团能力: ['多院', '对比', '调配', '标准统一'],
  运营支撑: ['病案', '统计', '设备', '耗材', '财务', '人力', '行政', '党建'],
  安全合规: ['等保三级', '安全审计', '数据脱敏', '入侵防范'],
};

/** 十大领域子模块数合计：10+6+7+7+8+5+8+4+8+4 = 67 */
const EXPECTED_TOTAL_MODULES = 67;

describe('M181-B 系统功能全景图 V2（300版本里程碑）', () => {
  describe('buildSystemMapV2 全景构建', () => {
    it('十大领域齐全且顺序固定', () => {
      const map = buildSystemMapV2();
      expect(map.domains).toHaveLength(10);
      expect(EXPECTED_DOMAIN_NAMES_V2).toEqual(map.domains.map((d) => d.name));
      expect(map.domains.map((d) => d.key)).toEqual([
        'clinical',
        'nursing',
        'pharmacy',
        'management',
        'ai',
        'platform',
        'patient',
        'group',
        'ops',
        'security',
      ]);
    });

    it('题目要求的全部子模块一个不漏', () => {
      const map = buildSystemMapV2();
      for (const domain of map.domains) {
        const expected = EXPECTED_SUBMODULES_V2[domain.name] ?? [];
        const actualNames = domain.modules.map((m) => m.name);
        for (const sub of expected) {
          expect(actualNames).toContain(sub);
        }
      }
    });

    it('模块总数 = 十大领域子模块之和（注册表常量一致）', () => {
      const map = buildSystemMapV2();
      const total = map.domains.reduce((s, d) => s + d.modules.length, 0);
      expect(total).toBe(REGISTRY_V2_MODULE_COUNT);
      expect(REGISTRY_V2_DOMAIN_COUNT).toBe(10);
      expect(total).toBe(EXPECTED_TOTAL_MODULES);
    });

    it('每个模块字段完整、status 合法、key 唯一', () => {
      const map = buildSystemMapV2();
      const keys = new Set<string>();
      for (const d of map.domains) {
        for (const m of d.modules) {
          expect(m.name.length).toBeGreaterThan(0);
          expect(['done', 'partial', 'planned']).toContain(m.status);
          expect(keys.has(m.key)).toBe(false);
          keys.add(m.key);
        }
      }
      expect(keys.size).toBe(EXPECTED_TOTAL_MODULES);
    });

    it('元信息带 300 版本里程碑与版权，generatedAt 为合法 ISO', () => {
      const map = buildSystemMapV2();
      expect(map.milestone).toContain('300版本里程碑');
      expect(map.company).toBe('杭州健澜科技有限公司');
      expect(() => new Date(map.generatedAt).toISOString()).not.toThrow();
    });

    it('不可变：两次调用返回全新对象，不共享内部数组', () => {
      const a = buildSystemMapV2();
      const b = buildSystemMapV2();
      expect(a).not.toBe(b);
      expect(a.domains).not.toBe(b.domains);
      expect(a.domains[0].modules).not.toBe(b.domains[0].modules);
    });
  });

  describe('getModuleCoverageV2 模块统计与覆盖率', () => {
    it('默认全景：总数 67、领域 10，done/partial/planned 之和=总数', () => {
      const stats = getModuleCoverageV2();
      expect(stats.totalDomains).toBe(10);
      expect(stats.totalModules).toBe(EXPECTED_TOTAL_MODULES);
      expect(stats.done + stats.partial + stats.planned).toBe(EXPECTED_TOTAL_MODULES);
      expect(stats.byDomain).toHaveLength(10);
    });

    it('覆盖率口径：done=1 / partial=0.5 / planned=0，且各领域明细与总量一致', () => {
      const stats = getModuleCoverageV2();
      // 复算总量
      const expectPct = ((stats.done + 0.5 * stats.partial) / stats.totalModules) * 100;
      expect(stats.coveragePct).toBe(Math.round(expectPct * 10) / 10);
      // 明细求和 = 总量
      const sumDone = stats.byDomain.reduce((s, d) => s + d.done, 0);
      const sumPartial = stats.byDomain.reduce((s, d) => s + d.partial, 0);
      const sumPlanned = stats.byDomain.reduce((s, d) => s + d.planned, 0);
      expect(sumDone).toBe(stats.done);
      expect(sumPartial).toBe(stats.partial);
      expect(sumPlanned).toBe(stats.planned);
    });

    it('覆盖率落在 0-100，保留 1 位小数', () => {
      const stats = getModuleCoverageV2();
      expect(stats.coveragePct).toBeGreaterThanOrEqual(0);
      expect(stats.coveragePct).toBeLessThanOrEqual(100);
    });

    it('自定义 map：混合状态覆盖率按 0.5 加权正确计算', () => {
      // 构造：2 done + 2 partial + 2 planned => (2 + 1) / 6 = 50%
      const fake: SystemMapV2 = {
        version: 'test',
        milestone: 'test',
        generatedAt: new Date().toISOString(),
        company: '杭州健澜科技有限公司',
        domains: [
          {
            key: 'x',
            name: '测试领域',
            modules: [
              { key: 'x.a', name: 'A', status: 'done', description: '', surface: '' },
              { key: 'x.b', name: 'B', status: 'done', description: '', surface: '' },
              { key: 'x.c', name: 'C', status: 'partial', description: '', surface: '' },
              { key: 'x.d', name: 'D', status: 'partial', description: '', surface: '' },
              { key: 'x.e', name: 'E', status: 'planned', description: '', surface: '' },
              { key: 'x.f', name: 'F', status: 'planned', description: '', surface: '' },
            ],
          },
        ],
      };
      const stats = getModuleCoverageV2(fake);
      expect(stats.totalModules).toBe(6);
      expect(stats.done).toBe(2);
      expect(stats.partial).toBe(2);
      expect(stats.planned).toBe(2);
      expect(stats.coveragePct).toBe(50);
      expect(stats.byDomain[0].coveragePct).toBe(50);
    });

    it('全部 done 时覆盖率 100%', () => {
      const dom: SystemDomainV2 = {
        key: 'y',
        name: '全上线领域',
        modules: [
          { key: 'y.a', name: 'A', status: 'done', description: '', surface: '' },
          { key: 'y.b', name: 'B', status: 'done', description: '', surface: '' },
        ],
      };
      const stats = getModuleCoverageV2({
        version: 't',
        milestone: 't',
        generatedAt: new Date().toISOString(),
        company: '杭州健澜科技有限公司',
        domains: [dom],
      });
      expect(stats.coveragePct).toBe(100);
    });

    it('边界：空 domains / 非法入参安全兜底为全零统计，不抛错', () => {
      const empty = getModuleCoverageV2({
        version: 't',
        milestone: 't',
        generatedAt: new Date().toISOString(),
        company: '杭州健澜科技有限公司',
        domains: [],
      });
      expect(empty.totalModules).toBe(0);
      expect(empty.coveragePct).toBe(0);

      // null/undefined 视为「取默认全景」，回退 buildSystemMapV2()
      const fallback = getModuleCoverageV2(null as unknown as SystemMapV2);
      expect(fallback.totalModules).toBe(EXPECTED_TOTAL_MODULES);

      // 传入非法对象（domains 非数组）安全兜底为全零统计，不抛错
      const bad = getModuleCoverageV2({} as unknown as SystemMapV2);
      expect(bad.totalModules).toBe(0);
      expect(bad.coveragePct).toBe(0);
      expect(bad.byDomain).toEqual([]);
    });
  });
});
