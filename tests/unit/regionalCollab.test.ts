/**
 * 健澜科技 jlmedaios - 区域医疗协同纯函数单测（M159-B）【集团化扩展·区域医疗协同】
 *
 * 覆盖：
 *   ① 转诊匹配：上转 / 下转 / 双向方向判定、专科命中、号源共享、本院转本院拒收；
 *   ② 互认校验：互认通过 / 过期 / 未入名录 / 质量存疑 四种分支；
 *   ③ 资源调配：同集团放行、跨集团拒绝、院内支援拒绝；
 *   ④ 数据隔离：buildRegionalCollaboration 只回本集团医院，他集团数据不泄漏。
 * 全部内存台账，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import {
  buildRegionalCollaboration,
  matchReferral,
  verifyCrossHospitalResult,
  registerGroupHospital,
  dispatchCrossHospitalResource,
  maskPatientId,
  matchSpecialty,
  resetRegionalCollabStore,
  type ReferralPatient,
} from '../../src/bff/aggregators/regionalCollabAggregator';

beforeEach(() => resetRegionalCollabStore());

// ---- 种子：两个集团，各两家医院，便于隔离测试 ------------------------------------
function seedTwoGroups(): void {
  // 集团 A
  registerGroupHospital({
    hospitalId: 'hA_topo', groupId: 'grp_A', name: '集团A总院', level: '三级',
    region: '杭州', specialties: ['心血管内科', '肿瘤科'], expertSlots: 10,
    availableDevices: ['64排CT', '1.5T MR'], capacity: 1500,
  });
  registerGroupHospital({
    hospitalId: 'hA_base', groupId: 'grp_A', name: '集团A基层院', level: '一级',
    region: '杭州', specialties: ['全科'], expertSlots: 0,
    availableDevices: ['彩超'], capacity: 80,
  });
  // 集团 B
  registerGroupHospital({
    hospitalId: 'hB_topo', groupId: 'grp_B', name: '集团B总院', level: '三级',
    region: '宁波', specialties: ['骨科'], expertSlots: 5,
    availableDevices: ['平板DSA'], capacity: 1200,
  });
}

function patientOf(hospitalId: string, sourceLevel: '三级' | '二级' | '一级', condition: string): ReferralPatient {
  return {
    patientId: 'P01234523',
    hospitalId,
    sourceLevel,
    name: '张测试',
    age: 58,
    gender: '男',
    condition,
    severity: 4,
  };
}

describe('转诊匹配 matchReferral', () => {
  beforeEach(() => seedTwoGroups());

  it('一级基层 -> 三级总院：判定为「上转」，命中心血管内科，占 1 个专家号', () => {
    const m = matchReferral(
      patientOf('hA_base', '一级', '急性胸痛 2 小时'),
      { hospitalId: 'hA_topo', name: '集团A总院', level: '三级', specialties: ['心血管内科', '肿瘤科'], expertSlots: 10 },
      '急性胸痛 2 小时',
    );
    expect(m.direction).toBe('上转');
    expect(m.matchedSpecialty).toBe('心血管内科');
    expect(m.accepted).toBe(true);
    expect(m.sharedExpertSlot).toBe(1);
    expect(m.maskedPatientId).toBe('P0****23');
  });

  it('三级总院 -> 一级基层康复：判定为「下转」，不占专家号', () => {
    const m = matchReferral(
      patientOf('hA_topo', '三级', '术后康复随访'),
      { hospitalId: 'hA_base', name: '集团A基层院', level: '一级', specialties: ['全科'], expertSlots: 0 },
      '术后康复随访',
    );
    expect(m.direction).toBe('下转');
    // 下转康复：无专家号，但承接方向合理
    expect(m.accepted).toBe(true);
    expect(m.sharedExpertSlot).toBe(0);
  });

  it('同级互转：二级 -> 二级 判定为「双向」', () => {
    const m = matchReferral(
      patientOf('hA_base', '二级', '糖尿病随访'),
      { hospitalId: 'hB_topo', name: '某二院', level: '二级', specialties: ['内分泌科'], expertSlots: 3 },
      '糖尿病随访',
    );
    expect(m.direction).toBe('双向');
    expect(m.accepted).toBe(true);
    expect(m.sharedExpertSlot).toBe(1); // 双向且有号源 -> 占号
  });

  it('数据隔离红线：本院转本院直接拒收，accepted=false', () => {
    const m = matchReferral(
      patientOf('hA_topo', '三级', '胸痛'),
      { hospitalId: 'hA_topo', name: '集团A总院', level: '三级', specialties: ['心血管内科'], expertSlots: 10 },
      '胸痛',
    );
    expect(m.accepted).toBe(false);
    expect(m.reason).toMatch(/本院转本院/);
  });

  it('目标院既不命中专科又无专家号源：拒收', () => {
    const m = matchReferral(
      patientOf('hA_base', '一级', '急性胸痛'),
      { hospitalId: 'hB_topo', name: '集团B总院', level: '三级', specialties: ['骨科'], expertSlots: 0 },
      '急性胸痛',
    );
    expect(m.accepted).toBe(false);
    expect(m.sharedExpertSlot).toBe(0);
  });

  it('matchSpecialty：胸痛->心血管内科，脑梗->神经外科，未命中返回 null', () => {
    expect(matchSpecialty('急性胸痛')).toBe('心血管内科');
    expect(matchSpecialty('突发脑梗')).toBe('神经外科');
    expect(matchSpecialty('随便一个不舒服')).toBeNull();
  });
});

describe('互认校验 verifyCrossHospitalResult', () => {
  it('互认通过：名录内 + 合格 + 5 天前检验（30 天窗口内）', () => {
    const r = verifyCrossHospitalResult(
      {
        resultId: 'EX-1', sourceHospitalId: 'hA_base', patientId: 'P01234523',
        examType: '检验', examDate: daysAgoIso(5), accredited: true, qualityFlag: '合格',
      },
      '心血管内科',
      todayIso(),
    );
    expect(r.recognized).toBe(true);
    expect(r.needReexam).toBe(false);
    expect(r.validDaysLeft).toBe(25); // 30 - 5
    expect(r.reason).toMatch(/互认通过/);
  });

  it('已过期：影像 90 天窗口，120 天前出具 -> 不互认、需重查', () => {
    const r = verifyCrossHospitalResult(
      {
        resultId: 'EX-2', sourceHospitalId: 'hA_base', patientId: 'P01234523',
        examType: '影像', examDate: daysAgoIso(120), accredited: true, qualityFlag: '合格',
      },
      '放射科',
      todayIso(),
    );
    expect(r.recognized).toBe(false);
    expect(r.needReexam).toBe(true);
    expect(r.validDaysLeft).toBeLessThan(0);
    expect(r.reason).toMatch(/有效期/);
  });

  it('未入互认名录：accredited=false -> 不互认', () => {
    const r = verifyCrossHospitalResult(
      {
        resultId: 'EX-3', sourceHospitalId: 'hX', patientId: 'P01234523',
        examType: '检验', examDate: daysAgoIso(3), accredited: false, qualityFlag: '合格',
      },
      '心血管内科',
      todayIso(),
    );
    expect(r.recognized).toBe(false);
    expect(r.needReexam).toBe(true);
    expect(r.reason).toMatch(/互认名录/);
  });

  it('结果质量存疑：qualityFlag=存疑 -> 需复核', () => {
    const r = verifyCrossHospitalResult(
      {
        resultId: 'EX-4', sourceHospitalId: 'hA_base', patientId: 'P01234523',
        examType: '超声', examDate: daysAgoIso(10), accredited: true, qualityFlag: '存疑',
      },
      '心内科',
      todayIso(),
    );
    expect(r.recognized).toBe(false);
    expect(r.needReexam).toBe(true);
    expect(r.reason).toMatch(/存疑/);
  });

  it('出检日期非法：直接判重查', () => {
    const r = verifyCrossHospitalResult(
      {
        resultId: 'EX-5', sourceHospitalId: 'hA_base', patientId: 'P01234523',
        examType: '检验', examDate: 'not-a-date', accredited: true, qualityFlag: '合格',
      },
      '全科',
      todayIso(),
    );
    expect(r.recognized).toBe(false);
    expect(r.needReexam).toBe(true);
  });
});

describe('资源调配 dispatchCrossHospitalResource', () => {
  beforeEach(() => seedTwoGroups());

  it('同集团内设备支援：放行并留痕', () => {
    const d = dispatchCrossHospitalResource({
      resourceType: '设备支援', resourceName: '64排CT',
      fromHospitalId: 'hA_topo', toHospitalId: 'hA_base', groupId: 'grp_A',
      reason: '基层急诊夜间支援',
    });
    expect(d.dispatchId).toBe('disp_0001');
    expect(d.fromHospitalId).toBe('hA_topo');
    expect(d.toHospitalId).toBe('hA_base');
    expect(d.groupId).toBe('grp_A');
  });

  it('数据隔离：跨集团调配（A->B）直接抛错', () => {
    expect(() =>
      dispatchCrossHospitalResource({
        resourceType: '专家支援', resourceName: '心内科主任',
        fromHospitalId: 'hA_topo', toHospitalId: 'hB_topo', groupId: 'grp_A',
        reason: '跨集团会诊',
      }),
    ).toThrow(/不属于同一医疗集团/);
  });

  it('数据隔离：groupId 与医院实际所属不一致直接抛错', () => {
    expect(() =>
      dispatchCrossHospitalResource({
        resourceType: '设备支援', resourceName: '彩超',
        fromHospitalId: 'hA_topo', toHospitalId: 'hA_base', groupId: 'grp_WRONG',
        reason: '伪造集团',
      }),
    ).toThrow(/数据隔离/);
  });

  it('数据隔离：院内支援（from===to）不属跨院调配，抛错', () => {
    expect(() =>
      dispatchCrossHospitalResource({
        resourceType: '专家支援', resourceName: '主任',
        fromHospitalId: 'hA_topo', toHospitalId: 'hA_topo', groupId: 'grp_A',
        reason: '院内',
      }),
    ).toThrow(/院内支援/);
  });
});

describe('数据隔离 buildRegionalCollaboration（不串院）', () => {
  beforeEach(() => seedTwoGroups());

  it('grp_A 地图只含 A 集团医院，B 集团医院 / 号源 / 设备不泄漏', () => {
    const mapA = buildRegionalCollaboration('grp_A');
    expect(mapA.total).toBe(2);
    expect(mapA.hospitals.every((h) => h.groupId === 'grp_A')).toBe(true);
    expect(mapA.hospitals.find((h) => h.hospitalId === 'hB_topo')).toBeUndefined();
    // A 集团号源 = 总院10 + 基层0 = 10；设备 = 2(CT+MR) + 1(彩超) = 3
    expect(mapA.totalExpertSlots).toBe(10);
    expect(mapA.totalDevices).toBe(3);
  });

  it('grp_B 地图只含 B 集团医院，A 集团数据不串进来', () => {
    const mapB = buildRegionalCollaboration('grp_B');
    expect(mapB.total).toBe(1);
    expect(mapB.hospitals[0].hospitalId).toBe('hB_topo');
    expect(mapB.totalExpertSlots).toBe(5);
    expect(mapB.totalDevices).toBe(1);
  });

  it('资源调配单隔离：A 集团调配单只出现在 A 地图，不进 B 地图', () => {
    dispatchCrossHospitalResource({
      resourceType: '设备支援', resourceName: '64排CT',
      fromHospitalId: 'hA_topo', toHospitalId: 'hA_base', groupId: 'grp_A', reason: '支援',
    });
    const mapA = buildRegionalCollaboration('grp_A');
    const mapB = buildRegionalCollaboration('grp_B');
    expect(mapA.dispatches).toHaveLength(1);
    expect(mapB.dispatches).toHaveLength(0);
  });

  it('空集团安全兜底：无医院时聚合为 0', () => {
    const empty = buildRegionalCollaboration('grp_EMPTY');
    expect(empty.total).toBe(0);
    expect(empty.totalBeds).toBe(0);
    expect(empty.hospitals).toEqual([]);
  });

  it('groupId 为空抛错（隔离键缺失）', () => {
    expect(() => buildRegionalCollaboration('')).toThrow(/groupId/);
  });
});

describe('患者隐私 maskPatientId', () => {
  it('跨院共享 patient_id 脱敏：P01234523 -> P0****23', () => {
    expect(maskPatientId('P01234523')).toBe('P0****23');
    expect(maskPatientId('AB')).toBe('****');
  });
});

// ---- 时间工具：让互认时效用例确定性 ------------------------------------------------
function todayIso(): string {
  return '2026-10-16T00:00:00.000Z';
}
function daysAgoIso(n: number): string {
  const d = new Date('2026-10-16T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
