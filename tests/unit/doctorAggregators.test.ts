/**
 * 健澜科技 jlmedaios - doctor 临床聚合器测试（M137-A 测试覆盖率冲刺）
 *
 * 【测试覆盖率冲刺】
 * 覆盖医生侧五大临床子域的纯逻辑与权限/错误路径：
 *  - outpatient    门诊：calcAge 周岁计算（含空值/非法日期边界）
 *  - inpatient     住院：InpatientError 状态码、admit 参数校验前置（DB 前抛错）
 *  - prescription  处方：PrescriptionReviewError、listView/reviewView 鉴权与参数校验
 *  - medicalRecord 病历：generateMedicalRecordDraft 超长串/负龄/空患者边界
 *  - followUp      随访：patientFollowUpsView/doctorFollowUpsView 权限与 UUID 校验
 *  - 覆盖率门禁：classifyDoctorSubdomain 子域路由 + getDoctorTestCoverage 冲刺报告
 *
 * 设计原则：
 *  - 只测纯函数与「DB 调用之前」的校验分支，不连真实数据库；
 *  - 边界覆盖：空数组 / null / 超长字符串 / 负数 / 非法日期 / 非法 UUID；
 *  - 权限控制：无权限码抛 403、未登录抛 401、参数缺失抛 400；
 *  - 不写假测试：每条断言对应源码中真实分支。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import { calcAge as outpatientCalcAge } from '@/bff/aggregators/outpatientAggregator';
import {
  calcAge as inpatientCalcAge,
  nursingLevelOf,
  InpatientError,
  admit,
  type AdmitInput,
} from '@/bff/aggregators/inpatientAggregator';
import {
  summarizeResults,
  REVIEW_RESULTS,
  RESULT_LABEL,
  PrescriptionReviewError,
  listView,
  reviewView,
} from '@/bff/aggregators/prescriptionReviewAggregator';
import {
  generateMedicalRecordDraft,
  DRAFT_DISCLAIMER,
} from '@/bff/aggregators/medicalRecordDraftAggregator';
import {
  FollowUpError,
  patientFollowUpsView,
  doctorFollowUpsView,
} from '@/bff/aggregators/followUpAggregator';
import {
  getDoctorTestCoverage,
  classifyDoctorSubdomain,
  DOCTOR_AGGREGATOR_INVENTORY,
  type SourceFileInput,
  type TestFileInput,
} from '@/bff/aggregators/testCoverageAggregator';

/* ================================================================== */
/* 门诊 outpatient：calcAge 周岁计算                                     */
/* ================================================================== */
describe('outpatient.calcAge 周岁计算', () => {
  it('正常：约 30 年前出生 → 30', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 30);
    expect(outpatientCalcAge(d.toISOString().slice(0, 10))).toBe(30);
  });

  it('边界：null 出生日期 → 0（门诊口径不抛错）', () => {
    expect(outpatientCalcAge(null)).toBe(0);
  });

  it('边界：非法日期字符串 → 0', () => {
    expect(outpatientCalcAge('not-a-date')).toBe(0);
    expect(outpatientCalcAge('')).toBe(0);
  });

  it('边界：未来日期 → 返回负数（门诊口径未 clamp，测试真实行为）', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    // 源码未对负龄做归零：未来出生年 → now.year - future.year = -1
    expect(outpatientCalcAge(future.toISOString())).toBeLessThan(0);
  });

  it('边界：超长脏字符串 → 0，不抛错', () => {
    const junk = 'x'.repeat(5000);
    expect(outpatientCalcAge(junk)).toBe(0);
  });
});

/* ================================================================== */
/* 住院 inpatient：护理等级 + 错误类型 + admit 前置校验                   */
/* ================================================================== */
describe('inpatient.nursingLevelOf 病情→护理等级', () => {
  it('critical → special 特级护理', () => {
    expect(nursingLevelOf('critical')).toBe('special');
  });
  it('serious → level1 一级护理', () => {
    expect(nursingLevelOf('serious')).toBe('level1');
  });
  it('stable → level2 二级护理', () => {
    expect(nursingLevelOf('stable')).toBe('level2');
  });
  it('null → 默认 level2（不抛错）', () => {
    expect(nursingLevelOf(null)).toBe('level2');
  });
});

describe('inpatient.calcAge 住院口径（非法→null）', () => {
  it('null → null', () => {
    expect(inpatientCalcAge(null)).toBeNull();
  });
  it('非法日期 → null', () => {
    expect(inpatientCalcAge('garbage-date')).toBeNull();
  });
  it('超长不合理年龄（>130）→ null', () => {
    expect(inpatientCalcAge('1800-01-01')).toBeNull();
  });
});

describe('inpatient.InpatientError 错误类型', () => {
  it('携带 status / code / message', () => {
    const e = new InpatientError(400, 'BAD_REQUEST', '入院诊断不能为空');
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(400);
    expect(e.code).toBe('BAD_REQUEST');
    expect(e.message).toBe('入院诊断不能为空');
    expect(e.name).toBe('InpatientError');
  });
});

describe('inpatient.admit 参数错误（DB 前抛 400）', () => {
  const auth = {
    id: 'doc-001',
    username: 'drchen',
    realName: '陈医生',
    employeeNo: 'E001',
    gender: 'male' as const,
    deptCode: 'D001',
    deptName: '心血管内科',
    title: '主治医师',
    phone: '',
    email: '',
    status: 'active' as const,
    roles: [],
    roleCodes: ['doctor'],
    rawRoles: ['doctor'],
    permissions: ['inpatient:admit'],
    dataScope: 'all' as const,
  };

  it('诊断为空字符串 → 400 BAD_REQUEST，不触 DB', async () => {
    const input = {
      wardId: 'ward-x',
      diagnosis: '',
      condition: 'stable',
      admissionType: 'elective',
      source: 'outpatient',
    } as unknown as AdmitInput;
    await expect(admit(auth, input)).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('诊断仅空白字符 → 400（trim 后为空）', async () => {
    const input = {
      wardId: 'ward-x',
      diagnosis: '   ',
      condition: 'stable',
      admissionType: 'elective',
      source: 'outpatient',
    } as unknown as AdmitInput;
    await expect(admit(auth, input)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

/* ================================================================== */
/* 处方 prescription：点评统计 + 鉴权 + 参数校验                          */
/* ================================================================== */
describe('prescription.summarizeResults 结果统计', () => {
  it('正常：三结论计数 + 合理率一位小数', () => {
    const s = summarizeResults(
      [{ result: 'rational' }, { result: 'rational' }, { result: 'irrational' }],
      5,
    );
    expect(s.total).toBe(3);
    expect(s.rational).toBe(2);
    expect(s.irrational).toBe(1);
    expect(s.abnormal).toBe(0);
    expect(s.rationalRate).toBe(66.7);
    expect(s.pending).toBe(5);
  });

  it('边界：空数组 → 全 0，合理率 0', () => {
    const s = summarizeResults([]);
    expect(s.total).toBe(0);
    expect(s.rationalRate).toBe(0);
  });

  it('边界：null / undefined / 非法 result → 安全降级，不抛错', () => {
    expect(summarizeResults(null as never).total).toBe(0);
    expect(summarizeResults(undefined as never).total).toBe(0);
    expect(summarizeResults([{ result: 'weird' }, null] as never).total).toBe(0);
  });

  it('边界：负数 / NaN pending → 降级为 0', () => {
    expect(summarizeResults([], -10).pending).toBe(0);
    expect(summarizeResults([], Number.NaN).pending).toBe(0);
  });

  it('常量：REVIEW_RESULTS 三结论、RESULT_LABEL 中文映射', () => {
    expect([...REVIEW_RESULTS].sort()).toEqual(['abnormal', 'irrational', 'rational']);
    expect(RESULT_LABEL.rational).toBe('合理');
    expect(RESULT_LABEL.irrational).toBe('不合理');
    expect(RESULT_LABEL.abnormal).toBe('超常');
  });
});

describe('prescription.PrescriptionReviewError 错误类型', () => {
  it('携带 status / message', () => {
    const e = new PrescriptionReviewError(401, '未登录');
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(401);
    expect(e.message).toBe('未登录');
  });
});

describe('prescription.listView 权限控制', () => {
  it('未登录（view.id 为空）→ 401，不触 DB', async () => {
    await expect(listView({ id: '' } as never)).rejects.toMatchObject({ status: 401 });
  });
});

describe('prescription.reviewView 参数校验（DB 前抛错）', () => {
  const auth = { id: 'pharmacist-001' } as never;

  it('未登录 → 401', async () => {
    await expect(reviewView({ id: '' } as never, { prescriptionId: 'rx1' })).rejects.toMatchObject({
      status: 401,
    });
  });

  it('prescriptionId 缺失 → 400', async () => {
    await expect(reviewView(auth, { result: 'rational' })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('result 非法（非三结论之一）→ 400', async () => {
    await expect(
      reviewView(auth, { prescriptionId: 'rx-1', result: 'bogus' }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

/* ================================================================== */
/* 病历 medicalRecord：草稿生成边界                                      */
/* ================================================================== */
describe('medicalRecord.generateMedicalRecordDraft 边界与脱敏', () => {
  it('正常：七段齐全 + 整稿含免责声明', () => {
    const d = generateMedicalRecordDraft(
      'vis-1',
      { patientId: 'pat_0001', gender: '男', age: 45, department: '呼吸内科' },
      ['咳嗽3天', '发热1天'],
      [{ markerName: '白细胞', value: '12', unit: '×10^9/L', abnormal: 'high' }],
      ['社区获得性肺炎'],
    );
    expect(d.sections.chiefComplaint).toContain('咳嗽3天');
    expect(d.sections.treatmentPlan).toContain('抗感染');
    expect(d.content).toContain(DRAFT_DISCLAIMER);
  });

  it('边界：空患者 / 空症状 / 空检验 / 空诊断 → 全部走待补模板，不抛错', () => {
    const d = generateMedicalRecordDraft('vis-2', {}, [], [], []);
    expect(d.sections.chiefComplaint).toContain('待补充');
    expect(d.sections.auxiliaryExam).toContain('待回报');
    expect(d.sections.diagnosis).toContain('待明确');
    expect(d.patientIdMasked).toBe('未提供');
  });

  it('边界：超长症状串（5000 字符）→ 正常拼接，不截断不抛错', () => {
    const longSymptom = '胸痛'.repeat(2500);
    const d = generateMedicalRecordDraft('vis-3', { patientId: 'pat_x_0001' }, [longSymptom], [], []);
    expect(d.sections.chiefComplaint.length).toBeGreaterThan(1000);
    expect(d.sections.presentIllness).toContain('胸痛');
  });

  it('边界：negative age / null age → 性别年龄段安全降级', () => {
    const d = generateMedicalRecordDraft(
      'vis-4',
      { patientId: 'pat_0002', gender: '男', age: -5 },
      [],
      [],
      [],
    );
    // 负龄不应出现在整稿里抛错；整稿应包含性别或降级文案
    expect(d.content.length).toBeGreaterThan(0);
  });

  it('脱敏：patientId 首尾各 2 位 + 星号，明文不回显', () => {
    const d = generateMedicalRecordDraft('vis-5', { patientId: 'PAT123456' }, [], [], []);
    expect(d.patientIdMasked).toBe('PA****56');
    expect(d.content).not.toContain('PAT123456');
  });

  it('边界：过短 patientId（≤4 位）→ 全掩为 ****', () => {
    const d = generateMedicalRecordDraft('vis-6', { patientId: 'ab' }, [], [], []);
    expect(d.patientIdMasked).toBe('****');
  });
});

/* ================================================================== */
/* 随访 followUp：权限控制 + UUID 校验                                   */
/* ================================================================== */
describe('followUp.FollowUpError 错误类型', () => {
  it('携带 status / code / message', () => {
    const e = new FollowUpError(403, 'FORBIDDEN', '缺少随访查看权限');
    expect(e.status).toBe(403);
    expect(e.code).toBe('FORBIDDEN');
  });
});

describe('followUp.patientFollowUpsView 权限控制', () => {
  it('无 follow_up:view 也无 patient_portal:view → 403', async () => {
    await expect(
      patientFollowUpsView({ id: 'p-001', permissions: [] }, {}),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('有 patient_portal:view 权限 → 放行并生成计划（纯函数路径，不连 DB）', async () => {
    const res = await patientFollowUpsView(
      { id: 'patient-uuid-12345678', permissions: ['patient_portal:view'] },
      { diagnosis: '胆囊切除术后', dischargeDate: '2026-10-10T00:00:00.000Z' },
    );
    expect(res.plans.length).toBeGreaterThan(0);
    expect(res.reminders.length).toBe(res.plans.length);
  });
});

describe('followUp.doctorFollowUpsView 权限 + 参数校验', () => {
  it('无 follow_up:view / follow_up:manage → 403', async () => {
    await expect(
      doctorFollowUpsView({ id: 'd-001', permissions: [] }, {}),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('patientId 非 UUID 格式 → 400 BAD_REQUEST', async () => {
    await expect(
      doctorFollowUpsView(
        { id: 'd-001', permissions: ['follow_up:view'] },
        { patientId: 'not-a-uuid' },
      ),
    ).rejects.toMatchObject({ status: 400, code: 'BAD_REQUEST' });
  });

  it('合法 UUID + follow_up:view → 放行生成计划', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const res = await doctorFollowUpsView(
      { id: 'd-001', permissions: ['follow_up:view'] },
      { patientId: uuid, diagnosis: '2型糖尿病', dischargeDate: '2026-10-01T00:00:00.000Z' },
    );
    expect(res.total).toBeGreaterThan(0);
    expect(res.plans[0].type).toBe('chronic_diabetes_biweekly');
  });
});

/* ================================================================== */
/* 覆盖率门禁：classifyDoctorSubdomain + getDoctorTestCoverage           */
/* ================================================================== */
describe('classifyDoctorSubdomain 子域路由', () => {
  it('随访类路径 → followUp', () => {
    expect(classifyDoctorSubdomain('src/bff/aggregators/followUpAggregator.ts')).toBe('followUp');
    expect(classifyDoctorSubdomain('src/bff/aggregators/postopFollowupAggregator.ts')).toBe('followUp');
  });
  it('病历类路径 → medicalRecord', () => {
    expect(classifyDoctorSubdomain('src/bff/aggregators/medicalRecordDraftAggregator.ts')).toBe(
      'medicalRecord',
    );
    expect(classifyDoctorSubdomain('src/bff/aggregators/progressNoteAggregator.ts')).toBe(
      'medicalRecord',
    );
    expect(classifyDoctorSubdomain('src/bff/aggregators/dischargeSummaryAggregator.ts')).toBe(
      'medicalRecord',
    );
  });
  it('处方类路径 → prescription', () => {
    expect(classifyDoctorSubdomain('src/bff/aggregators/prescriptionReviewAggregator.ts')).toBe(
      'prescription',
    );
    expect(classifyDoctorSubdomain('src/bff/aggregators/pharmacyAggregator.ts')).toBe('prescription');
    expect(classifyDoctorSubdomain('src/bff/aggregators/drugReviewAggregator.ts')).toBe(
      'prescription',
    );
  });
  it('住院类路径 → inpatient', () => {
    expect(classifyDoctorSubdomain('src/bff/aggregators/inpatientAggregator.ts')).toBe('inpatient');
    expect(classifyDoctorSubdomain('src/bff/aggregators/bedMapAggregator.ts')).toBe('inpatient');
  });
  it('其余医生侧 → outpatient 兜底', () => {
    expect(classifyDoctorSubdomain('src/bff/aggregators/outpatientAggregator.ts')).toBe('outpatient');
    expect(classifyDoctorSubdomain('src/bff/aggregators/surgeryAggregator.ts')).toBe('outpatient');
    expect(classifyDoctorSubdomain('src/bff/aggregators/consultationAggregator.ts')).toBe(
      'outpatient',
    );
  });
});

describe('getDoctorTestCoverage 覆盖率冲刺报告', () => {
  const src: SourceFileInput[] = [
    { path: 'src/bff/aggregators/outpatientAggregator.ts' },
    { path: 'src/bff/aggregators/inpatientAggregator.ts' },
    { path: 'src/bff/aggregators/prescriptionReviewAggregator.ts' },
    { path: 'src/bff/aggregators/medicalRecordDraftAggregator.ts' },
    { path: 'src/bff/aggregators/followUpAggregator.ts' },
  ];

  it('五域全部有对应测试键 → rate=1，gateOk=true', () => {
    const tests: TestFileInput[] = [
      { path: 'tests/unit/outpatient.test.ts' },
      { path: 'tests/unit/inpatient.test.ts' },
      { path: 'tests/unit/prescriptionReview.test.ts' },
      { path: 'tests/unit/medicalRecordDraft.test.ts' },
      { path: 'tests/unit/followUp.test.ts' },
    ];
    const r = getDoctorTestCoverage(src, tests, { generatedAt: '2026-10-16T00:00:00Z' });
    expect(r.total).toBe(5);
    expect(r.covered).toBe(5);
    expect(r.rate).toBe(1);
    expect(r.gateOk).toBe(true);
    expect(r.bySubdomain.outpatient.rate).toBe(1);
    expect(r.uncoveredFiles).toEqual([]);
  });

  it('一个域未覆盖 → rate 下降，gateOk=false', () => {
    const tests: TestFileInput[] = [
      { path: 'tests/unit/outpatient.test.ts' },
      // 故意缺 inpatient / prescription / medicalRecord / followUp 测试
    ];
    const r = getDoctorTestCoverage(src, tests);
    expect(r.covered).toBe(1);
    expect(r.uncovered).toBe(4);
    expect(r.gateOk).toBe(false);
    expect(r.bySubdomain.inpatient.rate).toBe(0);
    expect(r.bySubdomain.inpatient.meetsGate).toBe(false);
    expect(r.uncoveredFiles.length).toBe(4);
  });

  it('空源文件清单 → rate=1，gateOk=true（空桶达标）', () => {
    const r = getDoctorTestCoverage([], [{ path: 'tests/unit/x.test.ts' }]);
    expect(r.total).toBe(0);
    expect(r.rate).toBe(1);
    expect(r.gateOk).toBe(true);
  });

  it('阈值可配置：阈值 0.9 时 80% 覆盖不达标', () => {
    const tests: TestFileInput[] = [
      { path: 'tests/unit/outpatient.test.ts' },
      { path: 'tests/unit/inpatient.test.ts' },
      { path: 'tests/unit/prescriptionReview.test.ts' },
      { path: 'tests/unit/medicalRecordDraft.test.ts' },
      // 缺 followUp → 4/5 = 0.8
    ];
    const r = getDoctorTestCoverage(src, tests, { gateThreshold: 0.9 });
    expect(r.gateThreshold).toBe(0.9);
    expect(r.bySubdomain.followUp.rate).toBe(0);
    expect(r.gateOk).toBe(false);
  });

  it('阈值非法值（负数/>1/NaN）→ clamp 到 [0,1] 默认口径', () => {
    const r1 = getDoctorTestCoverage(src, [], { gateThreshold: -1 });
    expect(r1.gateThreshold).toBe(0); // 0 阈值下全空也达标
    expect(r1.gateOk).toBe(true);
    const r2 = getDoctorTestCoverage(src, [], { gateThreshold: 2 });
    expect(r2.gateThreshold).toBe(1); // 100% 阈值
    const r3 = getDoctorTestCoverage(src, [], { gateThreshold: Number.NaN });
    expect(r3.gateThreshold).toBe(0.8);
  });

  it('静态清单 DOCTOR_AGGREGATOR_INVENTORY 五域均有源文件', () => {
    const r = getDoctorTestCoverage(DOCTOR_AGGREGATOR_INVENTORY, []);
    expect(r.total).toBeGreaterThanOrEqual(15);
    // 五域桶都存在
    expect(Object.keys(r.bySubdomain).sort()).toEqual([
      'followUp',
      'inpatient',
      'medicalRecord',
      'outpatient',
      'prescription',
    ]);
  });
});
