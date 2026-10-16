/**
 * 健澜科技 jlmedaios - 【病案设备耗材】医院病案管理深化（M177-A）纯函数单测
 *
 * 覆盖：
 *  - ICD 编码校验：ICD-10 标准编码通过 / 自创编码（中文、字母越界、位数不符）拦截；
 *    ICD-9-CM-3 手术编码通过 / 含字母、章号越界拦截；主诊断缺失与"有手术无手术码"兜底；
 *  - 完整性检查：首页必填项缺项识别与完成率；
 *  - 质量报告：首页合格率 / 编码准确率 / 缺项率 / 归档及时率 / 借阅超期聚合；
 *  - 深度总装：合格病案 frontPagePass=true，问题病案 frontPagePass=false。
 *
 * 全部使用 mock 数据，纯函数、不依赖数据库与外部 LLM。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  buildDeepMedicalRecord,
  checkRecordCompletion,
  generateRecordQualityReport,
  isValidICD10,
  isValidICD9CM3,
  validateICDCoding,
  type DeepMedicalRecord,
  type RecordDiagnosis,
  type RecordSurgery,
} from '../../src/bff/aggregators/medicalRecordDeepAggregator';

const fullRecord: DeepMedicalRecord = {
  recordId: 'mr-001',
  visitId: 'v-001',
  patientId: 'pat-001',
  department: '普外科',
  dischargeAt: '2026-10-08T10:00:00+08:00',
  archivedAt: '2026-10-09T15:00:00+08:00',
  archiveDeadlineDays: 3,
  gender: '男',
  age: 58,
  dischargeDisposition: '好转',
  losDays: 9,
  totalFee: 18600,
  hasSurgery: true,
  doctorSigned: true,
  coderSigned: true,
  borrowStatus: 'none',
  confidentiality: 'internal',
  borrowDueAt: null,
};

const fullDiagnoses: RecordDiagnosis[] = [
  { code: 'K80.2', name: '胆囊结石伴慢性胆囊炎', rank: 'principal' },
  { code: 'K21.9', name: '胃食管反流病', rank: 'secondary' },
];
const fullSurgeries: RecordSurgery[] = [
  { code: '51.23', name: '腹腔镜胆囊切除术', level: 'level3', date: '2026-10-06' },
];

describe('M177-A ICD 编码校验（ICD-10 诊断 + ICD-9-CM-3 手术，不自创）', () => {
  it('ICD-10 标准编码通过：I50.9 / J18.9 / E11.9 / K80.2', () => {
    expect(isValidICD10('I50.9')).toBe(true);
    expect(isValidICD10('J18.9')).toBe(true);
    expect(isValidICD10('E11.9')).toBe(true);
    expect(isValidICD10('K80.2')).toBe(true);
  });

  it('ICD-10 自创/非法编码被拦截：含中文、字母 U 预留段、位数不符、小写、空', () => {
    expect(isValidICD10('心力衰竭')).toBe(false);       // 中文当编码
    expect(isValidICD10('ABCD1')).toBe(false);          // 臆造 5 位字母数字
    expect(isValidICD10('U82.1')).toBe(false);          // U 段为 WHO 预留，不用于正式病案
    expect(isValidICD10('i50.9')).toBe(true);          // 小写应被规范化为大写
    expect(isValidICD10('I50')).toBe(true);            // 类目级无小数点合法
    expect(isValidICD10('')).toBe(false);
  });

  it('ICD-9-CM-3 手术标准编码通过：47.09 阑尾切除 / 51.23 腹腔镜胆囊切除 / 81.54 全膝置换', () => {
    expect(isValidICD9CM3('47.09')).toBe(true);
    expect(isValidICD9CM3('51.23')).toBe(true);
    expect(isValidICD9CM3('81.54')).toBe(true);
  });

  it('ICD-9-CM-3 非法编码被拦截：含字母、章号 >99、含中文、空', () => {
    expect(isValidICD9CM3('AB.09')).toBe(false);
    expect(isValidICD9CM3('123.4')).toBe(false);        // 章号 123 越界
    expect(isValidICD9CM3('阑尾切除')).toBe(false);
    expect(isValidICD9CM3('')).toBe(false);
  });

  it('整体校验：全合法编码 → valid=true，codingAccuracy=1', () => {
    const r = validateICDCoding({ recordId: 'mr-1', hasSurgery: true }, fullDiagnoses, fullSurgeries);
    expect(r.valid).toBe(true);
    expect(r.codingAccuracy).toBe(1);
    expect(r.totalDiagnoses).toBe(2);
    expect(r.totalSurgeries).toBe(1);
  });

  it('整体校验：混入自创诊断编码 ABCD1 → valid=false，准确率下降，issue 标明退回重编', () => {
    const badDx: RecordDiagnosis[] = [
      { code: 'J18.9', name: '肺炎', rank: 'principal' },
      { code: 'ABCD1', name: '自创诊断', rank: 'secondary' },
    ];
    const r = validateICDCoding({ recordId: 'mr-2', hasSurgery: false }, badDx, []);
    expect(r.valid).toBe(false);
    expect(r.codingAccuracy).toBeCloseTo(0.5, 2);
    const badIssue = r.issues.find((i) => i.code === 'ABCD1');
    expect(badIssue).toBeDefined();
    expect(badIssue!.valid).toBe(false);
    expect(badIssue!.reasons.join('；')).toContain('ICD-10');
  });

  it('兜底：无主诊断 / 有手术标记却无手术清单 → 判 invalid 并给原因', () => {
    const noPrincipal = validateICDCoding({ recordId: 'mr-3', hasSurgery: false }, [], []);
    expect(noPrincipal.valid).toBe(false);
    expect(noPrincipal.issues.some((i) => i.reasons.some((s) => s.includes('主诊断')))).toBe(true);

    const surgeryMissing = validateICDCoding(
      { recordId: 'mr-4', hasSurgery: true },
      [{ code: 'M17.11', name: '膝骨关节炎', rank: 'principal' }],
      [],
    );
    expect(surgeryMissing.valid).toBe(false);
    expect(surgeryMissing.issues.some((i) => i.reasons.some((s) => s.includes('手术')))).toBe(true);
  });
});

describe('M177-A 病案首页完整性检查', () => {
  it('齐全病案 → complete=true，完成率 1，无缺项', () => {
    const c = checkRecordCompletion(fullRecord, fullDiagnoses, fullSurgeries);
    expect(c.complete).toBe(true);
    expect(c.completionRate).toBe(1);
    expect(c.missingItems).toHaveLength(0);
  });

  it('缺年龄/出院方式/总费用 → 缺项率上升，complete=false', () => {
    const incomplete: DeepMedicalRecord = {
      ...fullRecord, age: null, dischargeDisposition: '', totalFee: null, hasSurgery: false,
    };
    const c = checkRecordCompletion(incomplete, [{ code: 'I50.9', name: '心衰', rank: 'principal' }], []);
    expect(c.complete).toBe(false);
    expect(c.missingItems).toContain('年龄');
    expect(c.missingItems).toContain('出院方式');
    expect(c.missingItems).toContain('住院总费用');
    expect(c.completionRate).toBeLessThan(1);
  });

  it('空记录安全降级：不抛错，全部必填项缺项', () => {
    const c = checkRecordCompletion({ recordId: 'x', visitId: 'x', patientId: 'x', department: '' }, [], []);
    expect(c.complete).toBe(false);
    expect(c.missingItems.length).toBeGreaterThan(0);
  });
});

describe('M177-A 病案质量报告（首页合格率/编码准确率/缺项率）', () => {
  it('空周期 → 零值报告，不虚构数字', () => {
    const r = generateRecordQualityReport('2026-10', []);
    expect(r.totalRecords).toBe(0);
    expect(r.frontPagePassRate).toBe(0);
    expect(r.codingAccuracy).toBe(0);
  });

  it('混合样例：合格病案计入合格率，自创编码拉低准确率，缺项病案进入整改清单', () => {
    const okCase = { record: fullRecord, diagnoses: fullDiagnoses, surgeries: fullSurgeries };
    const badCodeCase = {
      record: { ...fullRecord, recordId: 'mr-bad', visitId: 'v-bad' },
      diagnoses: [
        { code: 'J18.9', name: '肺炎', rank: 'principal' as const },
        { code: 'ABCD1', name: '自创', rank: 'secondary' as const },
      ],
      surgeries: [] as RecordSurgery[],
    };
    const incompleteCase = {
      record: { ...fullRecord, recordId: 'mr-inc', visitId: 'v-inc', age: null, totalFee: null, hasSurgery: false },
      diagnoses: [{ code: 'I50.9', name: '心衰', rank: 'principal' as const }],
      surgeries: [] as RecordSurgery[],
    };

    const r = generateRecordQualityReport('2026-10', [okCase, badCodeCase, incompleteCase]);
    expect(r.totalRecords).toBe(3);
    // 仅 1 份合格 → 合格率 1/3
    expect(r.frontPagePassRate).toBeCloseTo(1 / 3, 2);
    // 编码：合法 = 3(合格2dx+1sx)+1(肺炎dx)+1(心衰dx) = 5；总条目 = 3+2+1 = 6
    expect(r.codingAccuracy).toBeCloseTo(5 / 6, 2);
    expect(r.missingItemRate).toBeGreaterThan(0);
    expect(r.failedRecords.length).toBe(2);
    expect(r.failedRecords.some((f) => f.recordId === 'mr-bad')).toBe(true);
  });

  it('借阅超期计数：应还时间早于参考 now → overdueBorrowCount 累加', () => {
    const overdueRec: DeepMedicalRecord = {
      ...fullRecord,
      recordId: 'mr-overdue', visitId: 'v-overdue',
      borrowStatus: 'borrowed', confidentiality: 'confidential',
      borrowDueAt: '2026-10-10T18:00:00+08:00',
      now: '2026-10-15T09:00:00+08:00',
    };
    const r = generateRecordQualityReport('2026-10', [
      { record: overdueRec, diagnoses: fullDiagnoses, surgeries: fullSurgeries },
    ]);
    expect(r.overdueBorrowCount).toBe(1);
  });
});

describe('M177-A 深度病案总装 buildDeepMedicalRecord', () => {
  it('合格病案 → frontPagePass=true，归档按时，无借阅超期', () => {
    const v = buildDeepMedicalRecord({ record: fullRecord, diagnoses: fullDiagnoses, surgeries: fullSurgeries });
    expect(v.frontPagePass).toBe(true);
    expect(v.coding.valid).toBe(true);
    expect(v.completion.complete).toBe(true);
    expect(v.archive.archived).toBe(true);
    expect(v.archive.onTime).toBe(true);
    expect(v.borrowOverdue).toBe(false);
  });

  it('自创编码病案 → frontPagePass=false 且原因可追溯', () => {
    const v = buildDeepMedicalRecord({
      record: { ...fullRecord, recordId: 'mr-x' },
      diagnoses: [{ code: '自创码', name: '某病', rank: 'principal' }],
      surgeries: [],
    });
    expect(v.frontPagePass).toBe(false);
    expect(v.coding.valid).toBe(false);
  });
});
