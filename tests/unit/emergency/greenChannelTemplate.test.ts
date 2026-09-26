/**
 * 健澜科技 jlmedaios - 绿色通道模板单测（M1-B1）
 *
 * 覆盖五类通道节点链、目标时限、DB/DCT/DNT 质控指标计算。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { describe, expect, it } from 'bun:test';

import {
  computeMetrics,
  elapsedMinutes,
  getChannelTemplate,
  listChannelTypes,
  type GreenChannelType,
} from '@/emergency/greenChannelTemplate.js';

describe('绿色通道模板', () => {
  const types: GreenChannelType[] = ['chest_pain', 'stroke', 'trauma', 'maternal', 'neonatal'];

  it('五类模板均可取，且节点按 sortOrder 升序、含 arrive/activate', () => {
    for (const t of types) {
      const tpl = getChannelTemplate(t);
      expect(tpl.nodes.length).toBeGreaterThan(2);
      const keys = tpl.nodes.map((n) => n.nodeKey);
      expect(keys.slice(0, 2)).toEqual(['arrive', 'activate']);
      const sorted = tpl.nodes.map((n) => n.sortOrder);
      expect([...sorted].sort((a, b) => a - b)).toEqual(sorted);
      expect(tpl.notifyTeams.length).toBeGreaterThan(0);
      expect(tpl.subtypes.length).toBeGreaterThan(0);
    }
  });

  it('未知类型抛错', () => {
    expect(() => getChannelTemplate('nope' as GreenChannelType)).toThrow(/未知/);
  });

  it('listChannelTypes 返回全部类型与亚型', () => {
    const list = listChannelTypes();
    expect(list).toHaveLength(5);
    const stroke = list.find((x) => x.type === 'stroke');
    expect(stroke?.subtypes).toContain('急性缺血性卒中');
  });

  it('胸痛通道含 ECG/肌钙蛋白/双抗/PCI 节点，DB 目标≤90', () => {
    const nodes = getChannelTemplate('chest_pain').nodes;
    const pci = nodes.find((n) => n.nodeKey === 'pci');
    expect(pci?.targetMinutes).toBe(90);
    expect(nodes.find((n) => n.nodeKey === 'ecg')?.targetMinutes).toBe(10);
  });

  it('卒中通道 DCT 目标≤25、DNT 目标≤60', () => {
    const nodes = getChannelTemplate('stroke').nodes;
    expect(nodes.find((n) => n.nodeKey === 'ct_scan')?.targetMinutes).toBe(25);
    expect(nodes.find((n) => n.nodeKey === 'thrombolysis')?.targetMinutes).toBe(60);
  });
});

describe('elapsedMinutes', () => {
  const arrive = new Date('2026-09-25T10:00:00+08:00');
  it('计算分钟差', () => {
    expect(elapsedMinutes(arrive, new Date('2026-09-25T11:15:00+08:00'))).toBe(75);
  });
  it('actual 缺失返回 null', () => {
    expect(elapsedMinutes(arrive, null)).toBeNull();
  });
  it('非法日期返回 null', () => {
    expect(elapsedMinutes('bad', 'worse')).toBeNull();
  });
});

describe('computeMetrics 质控指标', () => {
  const arrive = new Date('2026-09-25T10:00:00+08:00');
  const at = (min: number) => new Date(arrive.getTime() + min * 60000);

  it('胸痛：PCI 时间 → DB 分钟', () => {
    const nodes = [
      { nodeKey: 'arrive', targetMinutes: 0, actualTime: arrive },
      { nodeKey: 'pci', targetMinutes: 90, actualTime: at(75) },
    ];
    const m = computeMetrics('chest_pain', arrive, nodes);
    expect(m.dbnMinutes).toBe(75);
    expect(m.dctMinutes).toBeNull();
    expect(m.dntMinutes).toBeNull();
    expect(m.overdue.pci).toBe(false);
  });

  it('胸痛 PCI 超 90min 标记超时', () => {
    const nodes = [{ nodeKey: 'pci', targetMinutes: 90, actualTime: at(100) }];
    expect(computeMetrics('chest_pain', arrive, nodes).overdue.pci).toBe(true);
  });

  it('卒中：CT→DCT、溶栓→DNT', () => {
    const nodes = [
      { nodeKey: 'ct_scan', targetMinutes: 25, actualTime: at(20) },
      { nodeKey: 'thrombolysis', targetMinutes: 60, actualTime: at(45) },
    ];
    const m = computeMetrics('stroke', arrive, nodes);
    expect(m.dctMinutes).toBe(20);
    expect(m.dntMinutes).toBe(45);
    expect(m.dbnMinutes).toBeNull();
    expect(m.overdue.ct_scan).toBe(false);
  });

  it('卒中 CT 超 25min 标记超时', () => {
    const nodes = [{ nodeKey: 'ct_scan', targetMinutes: 25, actualTime: at(30) }];
    expect(computeMetrics('stroke', arrive, nodes).overdue.ct_scan).toBe(true);
  });

  it('未完成节点不标记超时', () => {
    const nodes = [{ nodeKey: 'pci', targetMinutes: 90, actualTime: null }];
    expect(computeMetrics('chest_pain', arrive, nodes).overdue.pci).toBe(false);
  });
});
