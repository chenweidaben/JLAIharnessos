/**
 * 健澜科技 jlmedaios - Doctor MUSE 员工个人经验上下文注入（依据宪法第七章）纯函数单测
 *
 * 覆盖：
 *  - 上下文合并：员工角色行 + 当前场景上下文（承接 buildAgentContext 输出）+ 个人经验段，
 *    段顺序确定；
 *  - 个人经验权重：成功经验按 weight 降序渲染，权重次数体现在文本中；
 *  - 空历史兜底：患者上下文与个人记忆全空 / null / undefined 时返回冷启动兜底文案，不抛错；
 *  - 失败经验置顶：failure 条目排在 success 之前，且以「教训」标注；
 *  - 角色区分：医生/护士/药师/管理员分别注入对应模式标题。
 *
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildStaffMuseContext,
  renderStaffMemorySection,
  renderRoleLine,
  sortStaffMemoryItems,
  type StaffDecisionMemoryItem,
  type StaffMemory,
} from '../../src/bff/aggregators/staffMuseContextAggregator';

/** 构造员工记忆 */
function memory(overrides: Partial<StaffMemory> = {}): StaffMemory {
  return {
    staffId: 'S-10086',
    role: 'doctor',
    items: [],
    ...overrides,
  };
}

/** 构造单条记忆 */
function item(
  summary: string,
  outcome: StaffDecisionMemoryItem['outcome'],
  weight?: number,
): StaffDecisionMemoryItem {
  return { summary, outcome, ...(weight ? { weight } : {}) };
}

/** 模拟 agentContextAggregator.buildAgentContext 的产出（患者画像+医生偏好+科室知识） */
const SAMPLE_PATIENT_CONTEXT = [
  '【学习上下文｜以下为系统自学习沉淀，仅供参考，最终诊疗决策由执业医师做出】',
  '■ 患者画像（最高优先级｜已脱敏）',
  '- 慢病：高血压、2型糖尿病',
  '■ 医生偏好（开方习惯）',
  '- 常用药品：苯磺酸氨氯地平片×12',
].join('\n');

describe('buildStaffMuseContext 上下文合并', () => {
  it('医生角色：抬头 + 角色行 + 场景上下文 + 个人经验段齐备，且顺序确定', () => {
    const mem = memory({
      items: [item('氨氯地平降压联合阿托伐他汀调脂，路径依从度高', 'success', 12)],
    });
    const text = buildStaffMuseContext('S-10086', 'doctor', SAMPLE_PATIENT_CONTEXT, mem);

    // 抬头
    expect(text).toContain('【员工个人经验上下文');
    // 角色行：医生 + 看病诊疗 + 工号
    expect(text).toContain('■ 员工：医生（看病诊疗）｜工号：S-10086');
    // 场景上下文原样承接（合并思路：患者画像+医生偏好+科室知识）
    expect(text).toContain('■ 当前场景上下文（已合并 患者画像 + 医生偏好 + 科室知识）');
    expect(text).toContain('苯磺酸氨氯地平片×12');
    // 个人经验段：医生=诊断与用药模式
    expect(text).toContain('■ 个人历史决策（诊断与用药模式');
    expect(text).toContain('氨氯地平降压联合阿托伐他汀调脂');

    // 顺序：抬头 < 角色行 < 场景上下文 < 个人经验
    const iHeader = text.indexOf('【员工个人经验上下文');
    const iRole = text.indexOf('■ 员工：医生');
    const iPatient = text.indexOf('■ 当前场景上下文');
    const iMemory = text.indexOf('■ 个人历史决策');
    expect(iHeader).toBeGreaterThan(-1);
    expect(iRole).toBeGreaterThan(iHeader);
    expect(iPatient).toBeGreaterThan(iRole);
    expect(iMemory).toBeGreaterThan(iPatient);
  });

  it('无场景上下文时只渲染角色行 + 个人经验段', () => {
    const mem = memory({ items: [item('β受体阻滞剂用于冠心病稳定型心绞痛', 'success', 7)] });
    const text = buildStaffMuseContext('S-2001', 'doctor', null, mem);

    expect(text).toContain('■ 员工：医生');
    expect(text).toContain('■ 个人历史决策（诊断与用药模式');
    expect(text).not.toContain('■ 当前场景上下文');
  });

  it('无个人记忆时只渲染角色行 + 场景上下文', () => {
    const text = buildStaffMuseContext('S-2001', 'nurse', SAMPLE_PATIENT_CONTEXT, null);

    expect(text).toContain('■ 员工：护士（护理交班）');
    expect(text).toContain('■ 当前场景上下文');
    expect(text).not.toContain('■ 个人历史决策');
  });
});

describe('buildStaffMuseContext 角色区分', () => {
  it.each([
    ['nurse', '护士（护理交班）', '交班风险识别模式'],
    ['pharmacist', '药师（处方审核）', '药物相互作用模式'],
    ['admin', '管理员（运营看数决策）', '历史管理决策效果'],
  ] as const)('%s：角色行与经验段标题对应', (role, roleLine, pattern) => {
    const mem = memory({ role, items: [item('某条经验', 'success')] });
    const text = buildStaffMuseContext('S-9', role, null, mem);

    expect(text).toContain(`■ 员工：${roleLine}`);
    expect(text).toContain(`■ 个人历史决策（${pattern}`);
  });
});

describe('buildStaffMuseContext 个人经验权重', () => {
  it('成功经验按 weight 降序渲染，权重次数以 ×n 体现', () => {
    const mem = memory({
      items: [
        item('低权重经验', 'success', 2),
        item('高权重经验', 'success', 15),
      ],
    });
    const text = buildStaffMuseContext('S-1', 'doctor', null, mem);

    const iHigh = text.indexOf('高权重经验×15');
    const iLow = text.indexOf('低权重经验×2');
    expect(iHigh).toBeGreaterThan(-1);
    expect(iLow).toBeGreaterThan(iHigh);
  });

  it('缺省 weight 不渲染次数后缀；空 summary 条目被丢弃', () => {
    const mem = memory({
      items: [item('', 'success'), item('无权重经验', 'success')],
    });
    const text = renderStaffMemorySection('doctor', mem);
    expect(text).toContain('- 无权重经验');
    expect(text).not.toContain('×');
  });
});

describe('buildStaffMuseContext 空历史兜底', () => {
  it('场景上下文与个人记忆全空返回冷启动兜底文案，不抛错', () => {
    const text = buildStaffMuseContext(null, 'doctor', null, null);
    expect(text).toContain('暂无可复用的个人决策记忆');
    expect(text).not.toContain('■');
  });

  it('空数组 / 空白字符串等价于无数据', () => {
    const mem = memory({ items: [] });
    const text = buildStaffMuseContext('S-1', 'doctor', '   ', mem);
    expect(text).toContain('暂无可复用的个人决策记忆');
  });

  it('null / undefined 入参不抛错', () => {
    expect(() =>
      buildStaffMuseContext(undefined, undefined, undefined, undefined),
    ).not.toThrow();
  });
});

describe('buildStaffMuseContext 失败经验置顶（依据宪法第七章）', () => {
  it('failure 条目排在 success 之前，且以「教训」标注', () => {
    const mem = memory({
      items: [
        item('常用成功模式', 'success', 10),
        item('曾对冠心病合并糖尿病首选磺脲类致重度低血糖', 'failure', 1),
      ],
    });
    const text = buildStaffMuseContext('S-10086', 'doctor', null, mem);

    expect(text).toContain('「教训」曾对冠心病合并糖尿病首选磺脲类致重度低血糖');
    const iLesson = text.indexOf('「教训」');
    const iSuccess = text.indexOf('常用成功模式');
    expect(iLesson).toBeGreaterThan(-1);
    expect(iSuccess).toBeGreaterThan(iLesson);
  });

  it('多条失败经验之间按权重降序', () => {
    const sorted = sortStaffMemoryItems([
      item('失败A', 'failure', 1),
      item('失败B', 'failure', 5),
      item('成功C', 'success', 20),
    ]);
    expect(sorted.map((s) => s.summary)).toEqual(['失败B', '失败A', '成功C']);
  });

  it('sortStaffMemoryItems 返回新数组、不修改入参', () => {
    const input: StaffDecisionMemoryItem[] = [
      item('成功C', 'success', 20),
      item('失败A', 'failure', 1),
    ];
    sortStaffMemoryItems(input);
    expect(input.map((s) => s.summary)).toEqual(['成功C', '失败A']);
  });
});

describe('renderRoleLine 防御性渲染', () => {
  it('工号为空时显示「未登记」；未知角色不抛错', () => {
    expect(renderRoleLine('doctor', '')).toContain('工号：未登记');
    expect(() => renderRoleLine('unknown' as never, 'S-1')).not.toThrow();
  });
});
