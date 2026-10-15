/**
 * 健澜科技 jlmedaios - 护理交接班智能助手纯函数单测（M120-C，依据宪法第七章）
 *
 * 覆盖：风险患者排序（风险分降序 / 同级按护理级别）、患者列表映射与兜底、
 *       接班待办过滤与优先级、交班报告四段式生成与确定性。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildNursingHandover,
  formatHandoverReport,
  type NursingHandoverData,
} from '../../src/bff/aggregators/nursingHandoverAggregator';

describe('M120-C buildNursingHandover 纯函数', () => {
  it('患者列表：映射在册患者，缺省入参兜底为空数组不抛异常', () => {
    const ho = buildNursingHandover('N001', 'w-01', 'day', {
      patients: [
        { patientId: 'P1', name: '张三', bedNo: '12', diagnosis: '肺炎', nursingLevel: 'level1', riskScore: 45, riskFlags: ['fall'] },
        { patientId: 'P2', name: '李四', bedNo: '3', nursingLevel: 'level3', riskScore: 10, riskFlags: [] },
      ],
    });
    expect(ho.riskPatients).toHaveLength(2);
    expect(ho.riskPatients[0].name).toBe('张三');
    expect(ho.riskPatients[0].nursingLevel).toBe('一级护理');
    expect(ho.shiftLabel).toBe('白班');

    // null/undefined 入参兜底
    const empty = buildNursingHandover('N001', '', 'day', null);
    expect(empty.riskPatients).toEqual([]);
    expect(empty.carePoints).toEqual([]);
    expect(empty.pendingTasks).toEqual([]);
    expect(empty.lessons).toEqual([]);
  });

  it('风险排序：按风险分降序，高危排最前', () => {
    const data: NursingHandoverData = {
      patients: [
        { patientId: 'P-low', name: '低危', riskScore: 15 },
        { patientId: 'P-high', name: '高危', riskScore: 88, riskFlags: ['fall', 'bedsore'] },
        { patientId: 'P-mid', name: '中危', riskScore: 42 },
      ],
    };
    const ho = buildNursingHandover('N001', 'w-01', 'night', data);
    expect(ho.riskPatients.map((p) => p.patientId)).toEqual(['P-high', 'P-mid', 'P-low']);
    expect(ho.riskPatients[0].riskLevel).toBe('high');
    expect(ho.riskPatients[1].riskLevel).toBe('medium');
    expect(ho.riskPatients[2].riskLevel).toBe('low');
  });

  it('风险排序：同分按护理级别危重度降序（特级先于一级）', () => {
    const ho = buildNursingHandover('N001', 'w-01', 'day', {
      patients: [
        { patientId: 'P-l1', name: '一级', nursingLevel: 'level1', riskScore: 70 },
        { patientId: 'P-sp', name: '特级', nursingLevel: 'special', riskScore: 70 },
      ],
    });
    expect(ho.riskPatients.map((p) => p.patientId)).toEqual(['P-sp', 'P-l1']);
  });

  it('未给风险分时由风险标签与护理级别透明推导', () => {
    const ho = buildNursingHandover('N001', 'w-01', 'day', {
      patients: [
        { patientId: 'P-a', name: '裸', riskFlags: [] },
        { patientId: 'P-b', name: '多风险', nursingLevel: 'level1', riskFlags: ['fall', 'vte'] },
      ],
    });
    expect(ho.riskPatients[0].patientId).toBe('P-b');
    expect(ho.riskPatients[0].riskScore).toBeGreaterThanOrEqual(50);
  });

  it('接班待办：剔除已完成项并按优先级升序', () => {
    const ho = buildNursingHandover('N001', 'w-01', 'evening', {
      pendingTasks: [
        { taskId: 't1', content: '普通任务', priority: 5 },
        { taskId: 't2', content: '高优先任务', priority: 1 },
        { taskId: 't3', content: '已完成不应出现', priority: 0, done: true },
      ],
    });
    expect(ho.pendingTasks.map((t) => t.taskId)).toEqual(['t2', 't1']);
    expect(ho.shiftType).toBe('evening');
  });
});

describe('M120-C formatHandoverReport 交班报告生成', () => {
  it('四段式章节齐全，含页脚版权与宪法第七章标注', () => {
    const ho = buildNursingHandover('N001', 'w-01', 'day', {
      patients: [{ patientId: 'P1', name: '张三', bedNo: '12', riskScore: 82, riskFlags: ['fall'], nursingLevel: 'level1' }],
      carePoints: [{ content: '每2小时翻身' }],
      pendingTasks: [{ taskId: 't1', patientName: '张三', content: '复查血常规' }],
      lessons: [{ lessonId: 'l1', title: '跌倒预防', summary: '床栏拉起', level: 'warn' }],
      generatedAt: '2026-10-16 08:00',
    });
    const report = formatHandoverReport(ho);
    expect(report).toContain('护理交接班智能交班报告');
    expect(report).toContain('交班护士：N001');
    expect(report).toContain('一、风险患者');
    expect(report).toContain('[高危] 12床 张三');
    expect(report).toContain('二、护理要点');
    expect(report).toContain('三、接班待办');
    expect(report).toContain('四、经验教训沉淀');
    expect(report).toContain('杭州健澜科技有限公司');
    expect(report).toContain('依据宪法第七章');
  });

  it('空病区也产出稳定兜底报告，不抛异常', () => {
    const ho = buildNursingHandover('N002', 'w-99', 'night', null);
    const report = formatHandoverReport(ho);
    expect(report).toContain('本班区暂无在册患者记录');
    expect(report).toContain('无特殊待办事项');
    expect(report).toContain('大夜班');
  });

  it('同一 handover 输出确定（无随机/时间依赖）', () => {
    const ho = buildNursingHandover('N001', 'w-01', 'day', {
      patients: [{ patientId: 'P1', name: '李四', riskScore: 30 }],
    });
    expect(formatHandoverReport(ho)).toBe(formatHandoverReport(ho));
  });
});
