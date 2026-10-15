/**
 * 健澜科技 jlmedaios - 医生工作台偏好自学习（依据宪法第四章）纯函数单测
 *
 * 覆盖：
 *  - 偏好提取：用药 TOP5 / 检查检验 TOP5 / 临床路径 TOP5 的归类与截断；
 *  - 权重排序：count 降序、同名累计、count 相同按名称字典序、不修改入参；
 *  - 空历史兜底：null / undefined / 空数组均返回三类空数组，不抛错。
 *
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildDoctorPreference,
  topN,
  type HistoryExam,
  type HistoryOrder,
  type PreferenceItem,
} from '../../src/bff/aggregators/doctorPreferenceAggregator';

/** 构造用药医嘱 */
function order(drugName: string, pathwayTag?: string): HistoryOrder {
  return { drugName, pathwayTag, dosage: '5mg', frequency: 'qd' };
}

/** 构造检查检验 */
function exam(itemName: string, category: '检查' | '检验' = '检查'): HistoryExam {
  return { itemName, category };
}

describe('buildDoctorPreference 偏好提取', () => {
  it('用药医嘱按药品名累计并取 TOP5', () => {
    const historyOrders: HistoryOrder[] = [
      order('苯磺酸氨氯地平片'),
      order('苯磺酸氨氯地平片'),
      order('阿托伐他汀钙片'),
      order('苯磺酸氨氯地平片'),
      order('盐酸二甲双胍缓释片'),
      order('阿托伐他汀钙片'),
      order('复方氨酚烷胺胶囊'),
      order('蒲地蓝消炎口服液'),
      order('布洛芬缓释胶囊'),
      order('阿莫西林胶囊'),
    ];
    const pref = buildDoctorPreference(historyOrders, []);

    expect(pref.preferredDrugs).toHaveLength(5);
    // 氨氯地平出现 3 次，权重最高排首位
    expect(pref.preferredDrugs[0]).toEqual({ name: '苯磺酸氨氯地平片', count: 3 });
    // TOP5 截断：第 6 名及以后（同权按名称字典序靠后）不出现
    const names = pref.preferredDrugs.map((d) => d.name);
    expect(names).not.toContain('蒲地蓝消炎口服液');
    expect(names).not.toContain('盐酸二甲双胍缓释片');
  });

  it('检查检验按项目名累计并携带分类', () => {
    const historyExams: HistoryExam[] = [
      exam('血常规(五分类)', '检验'),
      exam('常规心电图'),
      exam('血常规(五分类)', '检验'),
      exam('胸部正位DR'),
    ];
    const pref = buildDoctorPreference([], historyExams);

    expect(pref.preferredExams).toHaveLength(3);
    expect(pref.preferredExams[0]).toEqual({
      name: '血常规(五分类)',
      count: 2,
      category: '检验',
    });
  });

  it('临床路径标签单独累计为 commonPathways', () => {
    const historyOrders: HistoryOrder[] = [
      order('苯磺酸氨氯地平片', '高血压门诊路径'),
      order('阿托伐他汀钙片', '高血压门诊路径'),
      order('盐酸二甲双胍缓释片', '2型糖尿病复诊路径'),
    ];
    const pref = buildDoctorPreference(historyOrders, []);

    expect(pref.commonPathways).toHaveLength(2);
    expect(pref.commonPathways[0]).toEqual({ name: '高血压门诊路径', count: 2 });
  });
});

describe('topN 权重排序', () => {
  const items: PreferenceItem[] = [
    { name: 'beta', count: 2 },
    { name: 'alpha', count: 5 },
    { name: 'gamma', count: 2 },
  ];

  it('按 count 降序', () => {
    expect(topN(items).map((i) => i.name)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('count 相同时按名称字典序升序，输出确定', () => {
    expect(topN([...items].reverse()).map((i) => i.name)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  it('取前 n 条且不修改入参数组', () => {
    const input = [...items];
    const top2 = topN(input, 2);
    expect(top2.map((i) => i.name)).toEqual(['alpha', 'beta']);
    expect(input.map((i) => i.name)).toEqual(['beta', 'alpha', 'gamma']);
  });

  it('n<=0 返回空数组', () => {
    expect(topN(items, 0)).toEqual([]);
    expect(topN(items, -3)).toEqual([]);
  });
});

describe('空历史兜底', () => {
  it('null / undefined 入参不抛错，返回三类空数组', () => {
    expect(buildDoctorPreference(null, undefined)).toEqual({
      preferredDrugs: [],
      preferredExams: [],
      commonPathways: [],
    });
    expect(buildDoctorPreference([], [])).toEqual({
      preferredDrugs: [],
      preferredExams: [],
      commonPathways: [],
    });
  });

  it('空名 / 纯空白医嘱被忽略', () => {
    const pref = buildDoctorPreference(
      [order(''), order('   '), order('阿莫西林胶囊')],
      [exam('')],
    );
    expect(pref.preferredDrugs).toEqual([{ name: '阿莫西林胶囊', count: 1 }]);
    expect(pref.preferredExams).toEqual([]);
    expect(pref.commonPathways).toEqual([]);
  });

  it('topN 空入参返回空数组', () => {
    expect(topN([])).toEqual([]);
  });
});
