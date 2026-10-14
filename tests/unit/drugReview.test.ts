/**
 * 健澜科技 jlmedaios - 合理用药实时审查（AI 第八剑客）纯函数单测
 *
 * 覆盖：配伍禁忌组合（critical / warning / 不命中）、抗菌药越级（warning / 授权匹配不命中 /
 * 授权未知不判）、重复用药（info）、空医嘱安全降级。全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import { scanOrders, type ReviewOrder } from '../../src/bff/aggregators/drugReviewAggregator';

const order = (id: string, drugName: string, extra?: Partial<ReviewOrder>): ReviewOrder => ({
  id, drugName, abxLevel: null, prescriberMaxLevel: null, ...extra,
});

describe('配伍/联用禁忌', () => {
  it('空医嘱或非法输入 -> 无 issue，不抛错', () => {
    expect(scanOrders([]).length).toBe(0);
    // @ts-expect-error 故意传非法输入验证防御
    expect(scanOrders(undefined).length).toBe(0);
  });

  it('头孢曲松 + 葡萄糖酸钙 -> critical 配伍禁忌', () => {
    const issues = scanOrders([
      order('1', '注射用头孢曲松钠'),
      order('2', '葡萄糖酸钙注射液'),
    ]);
    const hit = issues.find((i) => i.category === '配伍禁忌');
    expect(hit?.level).toBe('critical');
    expect(hit?.drug).toContain('头孢曲松');
    expect(hit?.suggestion).toContain('含钙输液');
  });

  it('美罗培南 + 丙戊酸钠 -> critical（规则名拼接）', () => {
    const issues = scanOrders([
      order('1', '注射用美罗培南'),
      order('2', '丙戊酸钠缓释片'),
    ]);
    expect(issues.some((i) => i.rule === 'incompat.美罗培南_丙戊酸钠' && i.level === 'critical')).toBe(true);
  });

  it('左氧氟沙星 + 硫酸亚铁 -> warning 级别（螯合降吸收）', () => {
    const issues = scanOrders([
      order('1', '左氧氟沙星注射液'),
      order('2', '硫酸亚铁片'),
    ]);
    const hit = issues.find((i) => i.category === '配伍禁忌');
    expect(hit?.level).toBe('warning');
  });

  it('无禁忌组合的医嘱 -> 不产出配伍 issue', () => {
    const issues = scanOrders([
      order('1', '0.9%氯化钠注射液'),
      order('2', '维生素C注射液'),
    ]);
    expect(issues.some((i) => i.category === '配伍禁忌')).toBe(false);
  });
});

describe('抗菌药物越级使用', () => {
  it('住院医师授权非限制级、开特殊使用级 -> warning', () => {
    const issues = scanOrders([
      order('1', '注射用美罗培南', { abxLevel: 'special', prescriberMaxLevel: 'unrestricted' }),
    ]);
    const hit = issues.find((i) => i.category === '抗菌药物越级使用');
    expect(hit?.level).toBe('warning');
    expect(hit?.suggestion).toContain('特殊使用级');
  });

  it('主治授权限制级、开非限制使用级 -> 不越级', () => {
    const issues = scanOrders([
      order('1', '注射用头孢呋辛', { abxLevel: 'unrestricted', prescriberMaxLevel: 'restricted' }),
    ]);
    expect(issues.some((i) => i.category === '抗菌药物越级使用')).toBe(false);
  });

  it('主任医师授权特殊级、开限制级 -> 不越级', () => {
    const issues = scanOrders([
      order('1', '注射用头孢哌酮舒巴坦', { abxLevel: 'restricted', prescriberMaxLevel: 'special' }),
    ]);
    expect(issues.some((i) => i.category === '抗菌药物越级使用')).toBe(false);
  });

  it('授权级别未知（null）-> 不判越级，不抛错', () => {
    const issues = scanOrders([
      order('1', '注射用美罗培南', { abxLevel: 'special' }),
    ]);
    expect(issues.some((i) => i.category === '抗菌药物越级使用')).toBe(false);
  });
});

describe('重复用药', () => {
  it('同药名在院开立两条 -> info 提醒', () => {
    const issues = scanOrders([
      order('1', '奥美拉唑肠溶胶囊'),
      order('2', '奥美拉唑肠溶胶囊'),
    ]);
    const hit = issues.find((i) => i.category === '重复用药');
    expect(hit?.level).toBe('info');
    expect(hit?.suggestion).toContain('2 条');
  });

  it('不同药名各一条 -> 不判重复', () => {
    const issues = scanOrders([
      order('1', '奥美拉唑肠溶胶囊'),
      order('2', '铝碳酸镁咀嚼片'),
    ]);
    expect(issues.some((i) => i.category === '重复用药')).toBe(false);
  });
});

describe('综合场景', () => {
  it('混合医嘱：禁忌 critical + 越级 warning + 无重复', () => {
    const issues = scanOrders([
      order('1', '注射用头孢曲松钠'),
      order('2', '葡萄糖酸钙注射液'),
      order('3', '注射用美罗培南', { abxLevel: 'special', prescriberMaxLevel: 'unrestricted' }),
    ]);
    expect(issues.some((i) => i.level === 'critical' && i.category === '配伍禁忌')).toBe(true);
    expect(issues.some((i) => i.level === 'warning' && i.category === '抗菌药物越级使用')).toBe(true);
    expect(issues.some((i) => i.category === '重复用药')).toBe(false);
  });
});
