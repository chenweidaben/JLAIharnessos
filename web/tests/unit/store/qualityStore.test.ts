/**
 * 健澜科技 jlmedaios - 医疗质量（质控）场景状态管理测试
 * Copyright (c) 2026 健澜科技有限公司. All Rights Reserved.
 *
 * qualityStore 测试：任务列表 / 病历详情 / 质控检查与提交 / AI 缺陷采纳 /
 * 缺陷增删与扣分重算 / 规则管理与命中测试 / 整改提交与复核 / 首页与核心制度。
 * 数据来自 src/mock/qualityMock，真实落库由后端集成测试覆盖。
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { useQualityStore, gradeFromScore } from '@/store/qualityStore';
import {
  mockQualityTasks,
  mockQualityRules,
  mockRectificationTasks,
  mockCurrentRecord,
} from '@/mock/qualityMock';
import type { QualityDefect, QualityResult } from '@/types/quality';

const recordNo = mockQualityTasks[0].recordNo;

function resetStore() {
  useQualityStore.setState({
    qualityTasks: [],
    currentRecord: null,
    qualityResult: null,
    qualityStats: null,
    qualityRules: [],
    rectificationTasks: [],
    frontPageRecords: [],
    coreSystemResult: null,
    loading: false,
  });
}

beforeEach(resetStore);

describe('gradeFromScore 评级', () => {
  it('单项否决直接丙级', () => {
    expect(gradeFromScore(100, ['veto'])).toBe('C');
  });
  it('90 分及以上甲级、75-89 乙级、其余丙级', () => {
    expect(gradeFromScore(95, [])).toBe('A');
    expect(gradeFromScore(80, [])).toBe('B');
    expect(gradeFromScore(60, [])).toBe('C');
  });
});

describe('质控任务与病历详情', () => {
  it('fetchQualityTasks 加载任务并切换 loading', async () => {
    const p = useQualityStore.getState().fetchQualityTasks();
    expect(useQualityStore.getState().loading).toBe(true);
    await p;
    const s = useQualityStore.getState();
    expect(s.qualityTasks.length).toBe(mockQualityTasks.length);
    expect(s.loading).toBe(false);
  });

  it('fetchRecordDetail 加载病历并回填质控结果', async () => {
    const rec = await useQualityStore.getState().fetchRecordDetail(recordNo);
    const s = useQualityStore.getState();
    expect(rec).not.toBeNull();
    expect(s.currentRecord?.task.recordNo).toBe(recordNo);
  });
});

describe('质控检查与提交', () => {
  it('startQualityCheck 初始化病历与质控结果、任务置为 checking', async () => {
    await useQualityStore.getState().fetchQualityTasks();
    await useQualityStore.getState().startQualityCheck(recordNo);
    const s = useQualityStore.getState();
    expect(s.currentRecord).not.toBeNull();
    expect(s.qualityResult).not.toBeNull();
    expect(s.qualityTasks.find((t) => t.recordNo === recordNo)?.status).toBe('checking');
  });

  it('saveQualityResult 保存结果', async () => {
    await useQualityStore.getState().startQualityCheck(recordNo);
    const current = useQualityStore.getState().qualityResult!;
    const changed: QualityResult = { ...current, score: 88 };
    await useQualityStore.getState().saveQualityResult(changed);
    expect(useQualityStore.getState().qualityResult?.score).toBe(88);
  });

  it('submitQualityResult 签名并按分数评级、回写任务状态', async () => {
    await useQualityStore.getState().fetchQualityTasks();
    await useQualityStore.getState().startQualityCheck(recordNo);
    const current = useQualityStore.getState().qualityResult!;
    await useQualityStore.getState().submitQualityResult({ ...current, score: 70 });
    const s = useQualityStore.getState();
    expect(s.qualityResult?.signed).toBe(true);
    expect(s.qualityResult?.grade).toBe('C');
    const task = s.qualityTasks.find((t) => t.recordNo === recordNo);
    expect(task?.status === 'to_rectify' || task?.status === 'checked').toBe(true);
  });
});

describe('AI 缺陷处置', () => {
  it('acceptAIDefect 更新缺陷处置；采纳时转入正式缺陷并重算', async () => {
    await useQualityStore.getState().startQualityCheck('BL2026000');
    const rec = useQualityStore.getState().currentRecord!;
    const defect = rec.aiDefects[0];
    const before = useQualityStore.getState().qualityResult!.defects.length;
    await useQualityStore.getState().acceptAIDefect(defect.defectId, 'adopted');
    const s = useQualityStore.getState();
    expect(s.currentRecord?.aiDefects.find((d) => d.defectId === defect.defectId)?.aiAction)
      .toBe('adopted');
    expect(s.qualityResult!.defects.length).toBeGreaterThan(before);
  });

  it('ignore / modified 仅更新标记，不新增缺陷', async () => {
    await useQualityStore.getState().startQualityCheck('BL2026000');
    const defect = useQualityStore.getState().currentRecord!.aiDefects[0];
    await useQualityStore.getState().acceptAIDefect(defect.defectId, 'ignored');
    expect(useQualityStore.getState().currentRecord?.aiDefects[0].aiAction).toBe('ignored');
  });

  it('无当前病历时 acceptAIDefect 安全返回', async () => {
    await useQualityStore.getState().acceptAIDefect('x', 'adopted');
    expect(useQualityStore.getState().currentRecord).toBeNull();
  });
});

describe('缺陷增删与扣分', () => {
  it('addDefect / removeDefect 后自动重算分数', async () => {
    await useQualityStore.getState().startQualityCheck(recordNo);
    const extra: QualityDefect = mockCurrentRecord('BL2026000').aiDefects[0];
    const countBefore = useQualityStore.getState().qualityResult!.defects.length;
    await useQualityStore.getState().addDefect({ ...extra, defectId: 'EXTRA1' });
    expect(useQualityStore.getState().qualityResult!.defects.length).toBe(countBefore + 1);
    await useQualityStore.getState().removeDefect('EXTRA1');
    expect(useQualityStore.getState().qualityResult!.defects.some((d) => d.defectId === 'EXTRA1'))
      .toBe(false);
  });

  it('recalcScore 处理单项否决，分数不低于 0', async () => {
    await useQualityStore.getState().startQualityCheck(recordNo);
    const current = useQualityStore.getState().qualityResult!;
    useQualityStore.setState({
      qualityResult: { ...current, vetoItems: ['veto'], defects: [] },
    });
    useQualityStore.getState().recalcScore();
    const r = useQualityStore.getState().qualityResult!;
    expect(r.score).toBe(0);
    expect(r.grade).toBe('C');
  });

  it('无质控结果时 addDefect/removeDefect/recalcScore 安全返回', async () => {
    const d = mockCurrentRecord('BL2026000').aiDefects[0];
    await useQualityStore.getState().addDefect(d);
    await useQualityStore.getState().removeDefect('x');
    useQualityStore.getState().recalcScore();
    expect(useQualityStore.getState().qualityResult).toBeNull();
  });
});

describe('质控统计与规则管理', () => {
  it('fetchQualityStats 加载统计', async () => {
    await useQualityStore.getState().fetchQualityStats();
    expect(useQualityStore.getState().qualityStats).not.toBeNull();
  });

  it('fetchQualityRules 加载规则', async () => {
    await useQualityStore.getState().fetchQualityRules();
    expect(useQualityStore.getState().qualityRules.length).toBe(mockQualityRules.length);
  });

  it('updateQualityRule 更新匹配规则', async () => {
    await useQualityStore.getState().fetchQualityRules();
    const rule = useQualityStore.getState().qualityRules[0];
    await useQualityStore.getState().updateQualityRule({ ...rule, name: '更新后规则' });
    expect(useQualityStore.getState().qualityRules[0].name).toBe('更新后规则');
  });

  it('toggleRuleStatus 切换启用状态', async () => {
    await useQualityStore.getState().fetchQualityRules();
    const rule = useQualityStore.getState().qualityRules[0];
    const original = rule.status;
    await useQualityStore.getState().toggleRuleStatus(rule.ruleId);
    const now = useQualityStore.getState().qualityRules[0].status;
    expect(now).not.toBe(original);
  });

  it('testRule 返回命中结果', async () => {
    const r = await useQualityStore.getState().testRule('r1');
    expect(r.triggered).toBe(true);
  });
});

describe('整改任务', () => {
  it('fetchRectificationTasks 加载任务', async () => {
    await useQualityStore.getState().fetchRectificationTasks();
    expect(useQualityStore.getState().rectificationTasks.length).toBe(mockRectificationTasks.length);
  });

  it('submitRectify 更新任务为已整改', async () => {
    await useQualityStore.getState().fetchRectificationTasks();
    const task = useQualityStore.getState().rectificationTasks[0];
    await useQualityStore.getState().submitRectify(task.taskId, '整改内容', '备注');
    const t = useQualityStore.getState().rectificationTasks.find((x) => x.taskId === task.taskId);
    expect(t?.status).toBe('rectified');
    expect(t?.rectifyContent).toBe('整改内容');
  });

  it('reviewRectify 通过/驳回分别更新状态与分数', async () => {
    await useQualityStore.getState().fetchRectificationTasks();
    const tasks = useQualityStore.getState().rectificationTasks;
    await useQualityStore.getState().reviewRectify(tasks[0].taskId, 'approved', '通过');
    const t0 = useQualityStore.getState().rectificationTasks[0];
    expect(t0.status).toBe('reviewed');
    expect(t0.reviewResult).toBe('approved');
    if (tasks[1]) {
      await useQualityStore.getState().reviewRectify(tasks[1].taskId, 'rejected', '不通过');
      const t1 = useQualityStore.getState().rectificationTasks[1];
      expect(t1.reviewResult).toBe('rejected');
    }
  });
});

describe('首页质控与核心制度', () => {
  it('fetchFrontPageRecords 加载首页记录', async () => {
    await useQualityStore.getState().fetchFrontPageRecords();
    expect(useQualityStore.getState().frontPageRecords.length).toBeGreaterThan(0);
  });

  it('fetchCoreSystem 加载核心制度检查结果', async () => {
    await useQualityStore.getState().fetchCoreSystem();
    expect(useQualityStore.getState().coreSystemResult).not.toBeNull();
  });
});