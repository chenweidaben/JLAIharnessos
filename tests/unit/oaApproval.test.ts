/**
 * 健澜科技 jlmedaios - OA 多级审批纯函数单测（M139-A · 医院运营管理）
 *
 * 【医院运营管理】请假/报销/采购/用印，三级流转不可跳步。
 * 覆盖：
 *   - createApproval：组包、三级节点铺底、末级归口（请假/用印→人事，报销/采购→财务）；
 *   - approveStep：一次只前进一步，三级全通过才 approved；任一节点驳回即整单驳回；
 *   - 状态流转：pending → 逐节点推进 → approved / rejected，办结后不可再动；
 *   - 纪律：申请人不可自审、非法入参抛错。
 *
 * 与持久化解耦：不触库（persistApproval 由路由层显式调用，单测不覆盖）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  approveStep,
  createApproval,
  listApprovals,
  resolveFinalRole,
  type ApprovalType,
} from '../../src/bff/aggregators/oaApprovalAggregator';

const APPLICANT = 'aaaaaaaa-0000-0000-0000-000000000001';
const DIRECTOR = 'bbbbbbbb-0000-0000-0000-000000000002'; // 科室主任
const VP = 'cccccccc-0000-0000-0000-000000000003'; // 分管院长
const HR = 'dddddddd-0000-0000-0000-000000000004'; // 人事/财务

describe('createApproval', () => {
  it('组包：返回带 id 的审批单，三级节点铺底、起始 pending、currentStep=0', () => {
    const a = createApproval(APPLICANT, 'leave', '年休假申请', '国庆前后调休 5 天');
    expect(a.id).toBeTruthy();
    expect(a.applicantId).toBe(APPLICANT);
    expect(a.type).toBe('leave');
    expect(a.title).toBe('年休假申请');
    expect(a.status).toBe('pending');
    expect(a.currentStep).toBe(0);
    // 强制三级：科室主任 → 分管院长 → 人事/财务
    expect(a.steps).toHaveLength(3);
    expect(a.steps.map((s) => s.role)).toEqual(['科室主任', '分管院长', '人事科']);
    // 初始节点均未处理
    expect(a.steps.every((s) => s.approverId === null && s.action === null)).toBe(true);
  });

  it('末级归口分流：请假/用印→人事，报销/采购→财务', () => {
    expect(resolveFinalRole('leave')).toBe('hr');
    expect(resolveFinalRole('seal')).toBe('hr');
    expect(resolveFinalRole('expense')).toBe('finance');
    expect(resolveFinalRole('purchase')).toBe('finance');
    const exp = createApproval(APPLICANT, 'expense', '差旅费报销', '');
    expect(exp.finalRole).toBe('finance');
    expect(exp.steps[2].role).toBe('财务科');
  });

  it('非法入参抛错（空申请人 / 非法类型 / 空标题）', () => {
    expect(() => createApproval('', 'leave', 't', '')).toThrow();
    expect(() => createApproval(APPLICANT, 'bad' as ApprovalType, 't', '')).toThrow();
    expect(() => createApproval(APPLICANT, 'leave', '  ', '')).toThrow();
  });
});

describe('approveStep 多级流转', () => {
  it('一次只前进一步：三级全通过才 approved，中途始终 pending（不可一步到位）', () => {
    const a = createApproval(APPLICANT, 'purchase', 'CT 球管采购', '金额 38 万');
    // 第 1 步：科室主任通过
    const s1 = approveStep(a.id, DIRECTOR, 'approve', '同意');
    expect(s1.status).toBe('pending');
    expect(s1.currentStep).toBe(1);
    expect(s1.steps[0].action).toBe('approve');
    expect(s1.steps[1].action).toBeNull(); // 下一节点尚未处理
    // 第 2 步：分管院长通过
    const s2 = approveStep(a.id, VP, 'approve', '同意');
    expect(s2.status).toBe('pending');
    expect(s2.currentStep).toBe(2);
    // 第 3 步：财务通过 → 整单办结
    const s3 = approveStep(a.id, HR, 'approve', '预算内，同意支付');
    expect(s3.status).toBe('approved');
    expect(s3.currentStep).toBe(3);
    expect(s3.steps.every((s) => s.action === 'approve')).toBe(true);
  });

  it('任一节点驳回即整单 rejected，后续节点不再流转', () => {
    const a = createApproval(APPLICANT, 'leave', '病假申请', '腰椎间盘突出');
    const rejected = approveStep(a.id, DIRECTOR, 'reject', '病历材料不全');
    expect(rejected.status).toBe('rejected');
    expect(rejected.steps[0].action).toBe('reject');
    expect(rejected.steps[1].action).toBeNull(); // 分管院长节点未被触碰
  });

  it('办结后的单子不可再审批（防重复推进）', () => {
    const a = createApproval(APPLICANT, 'seal', '合同用印', '招标合同用印');
    approveStep(a.id, DIRECTOR, 'approve', '');
    approveStep(a.id, VP, 'approve', '');
    approveStep(a.id, HR, 'approve', '');
    // 已 approved：再动抛错
    expect(() => approveStep(a.id, HR, 'approve', '再签一次')).toThrow(/已/);
  });

  it('申请人不可审批自己的单子', () => {
    const a = createApproval(APPLICANT, 'leave', '自审测试', '');
    expect(() => approveStep(a.id, APPLICANT, 'approve', '')).toThrow(/自己/);
  });

  it('未知审批单 / 非法动作抛错', () => {
    expect(() => approveStep('not-exist', DIRECTOR, 'approve', '')).toThrow(/不存在/);
    const a = createApproval(APPLICANT, 'expense', '打车报销', '');
    expect(() => approveStep(a.id, DIRECTOR, 'jump' as never, '')).toThrow(/action/);
  });
});

describe('listApprovals', () => {
  it('按申请人过滤、返回副本，不串单', () => {
    const other = 'eeeeeeee-0000-0000-0000-000000000099';
    createApproval(APPLICANT, 'leave', '我的请假', '');
    createApproval(other, 'purchase', '他人采购', '');

    mine: {
      const mine = listApprovals(APPLICANT);
      expect(mine.every((x) => x.applicantId === APPLICANT)).toBe(true);
      expect(mine.some((x) => x.title === '我的请假')).toBe(true);
      expect(mine.some((x) => x.title === '他人采购')).toBe(false);
    }
    all: {
      const all = listApprovals();
      expect(all.some((x) => x.title === '他人采购')).toBe(true);
    }
  });
});
