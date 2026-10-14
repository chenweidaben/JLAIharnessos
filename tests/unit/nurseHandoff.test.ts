/**
 * 健澜科技 jlmedaios - 护士交接班记录 buildHandoffSummary 纯函数单测（214）
 *
 * 覆盖：空输入兜底、生命体征拼装、护理要点编号、风险等级、接班待办、确定性。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildHandoffSummary,
  type HandoffPlan,
  type HandoffVitalSigns,
} from '../../src/bff/aggregators/nurseHandoffAggregator';

describe('214 buildHandoffSummary 纯函数', () => {
  it('空输入产出稳定兜底文案，不抛异常', () => {
    const text = buildHandoffSummary({}, {});
    expect(text).toContain('患者：（未填写）');
    expect(text).toContain('本班次暂无生命体征记录');
    expect(text).toContain('护理级别未标注');
    expect(text).toContain('接班待办：无特殊待办');
  });

  it('拼装患者/诊断/护理级别与生命体征', () => {
    const plan: HandoffPlan = {
      patientName: '张三', bedNo: '12', diagnosis: '肺部感染', nursingLevel: 'level1',
    };
    const v: HandoffVitalSigns = {
      temperature: 38.5, pulse: 96, respiration: 20,
      bpSystolic: 130, bpDiastolic: 80, oxygenSaturation: 95,
    };
    const text = buildHandoffSummary(plan, v);
    expect(text).toContain('患者：张三 / 12床');
    expect(text).toContain('诊断：肺部感染');
    expect(text).toContain('护理级别：一级护理');
    expect(text).toContain('T 38.5℃');
    expect(text).toContain('P 96次/分');
    expect(text).toContain('R 20次/分');
    expect(text).toContain('BP 130/80mmHg');
    expect(text).toContain('SpO₂ 95%');
  });

  it('护理要点按类别编号列出', () => {
    const plan: HandoffPlan = {
      planItems: [
        { item: '体位排痰', category: '呼吸道护理' },
        { item: '体温监测' },
      ],
    };
    const text = buildHandoffSummary(plan, {});
    expect(text).toContain('护理要点：');
    expect(text).toContain('1.[呼吸道护理]体位排痰');
    expect(text).toContain('2.体温监测');
  });

  it('风险等级映射为交接提示', () => {
    expect(buildHandoffSummary({ riskLevel: 'high' }, { })).toContain('高危');
    expect(buildHandoffSummary({ riskLevel: 'medium' }, { })).toContain('中危');
    expect(buildHandoffSummary({ riskLevel: 'low' }, { })).toContain('低危');
  });

  it('接班待办逐条编号', () => {
    const text = buildHandoffSummary(
      { pendingTasks: ['复查血常规', '记录24h出入量'] }, {},
    );
    expect(text).toContain('接班待办：1)复查血常规；2)记录24h出入量');
  });

  it('同一输入输出确定（无随机/时间依赖）', () => {
    const plan: HandoffPlan = { patientName: '李四', diagnosis: '冠心病', nursingLevel: 'special' };
    const v: HandoffVitalSigns = { temperature: 36.8, pulse: 78 };
    expect(buildHandoffSummary(plan, v)).toBe(buildHandoffSummary(plan, v));
  });
});
