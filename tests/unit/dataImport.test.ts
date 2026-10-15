/**
 * 健澜科技 jlmedaios - M129-C 标准数据导入单测（【系统集成】）
 *
 * 验证纯函数层「模板 -> 校验 -> 导入分拣」闭环：
 *  - 模板生成：三段字段说明 + 示例信封齐备；
 *  - 数据校验：必填/枚举/日期/主键唯一/跨表引用在包内闭环；
 *  - 导入逻辑：importPatientData 分拣 accepted / rejected，收数与拒收数准确；
 *  - 错误报告：rejected 带行号/字段/原值，信封级硬错误抛错被路由层捕获。
 * 全部为纯函数断言，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  generateImportTemplate,
  IMPORT_TOOL,
  IMPORT_VERSION,
  importPatientData,
  validateImportData,
} from '../../src/bff/aggregators/dataImportAggregator';
import type { PatientImportEnvelope } from '../../src/bff/aggregators/dataImportAggregator';

/** 构造一份全合法信封，供各用例按需改坏某一行 */
function makeValidEnvelope(): PatientImportEnvelope {
  return {
    tool: IMPORT_TOOL,
    version: IMPORT_VERSION,
    kind: 'patient-import',
    patients: [
      { patientNo: 'P001', name: '张三', gender: '男', birthDate: '1985-06-15', phone: '13800000001' },
      { patientNo: 'P002', name: '李四', gender: '女', birthDate: '1990-01-20' },
    ],
    visits: [
      { visitId: 'V001', patientNo: 'P001', visitType: 'outpatient', deptName: '心血管内科', visitDate: '2026-10-16', diagnosis: '高血压' },
      { visitId: 'V002', patientNo: 'P002', visitType: 'inpatient', deptName: '呼吸内科', visitDate: '2026-10-15' },
    ],
    prescriptions: [
      { prescriptionId: 'RX001', visitId: 'V001', drugName: '苯磺酸氨氯地平片', quantity: 1 },
      { prescriptionId: 'RX002', visitId: 'V002', drugName: '头孢克肟胶囊' },
    ],
  };
}

describe('M129-C 标准数据导入 - 模板生成', () => {
  it('模板格式：tool/kind/version 固定，三段字段说明齐备', () => {
    const tpl = generateImportTemplate();
    expect(tpl.tool).toBe(IMPORT_TOOL);
    expect(tpl.version).toBe(IMPORT_VERSION);
    expect(tpl.kind).toBe('patient-import-template');
    expect(tpl.sections.map((s) => s.key)).toEqual(['patients', 'visits', 'prescriptions']);
    // 每段字段说明含必填标记与示例行
    for (const s of tpl.sections) {
      expect(s.fields.length).toBeGreaterThan(0);
      expect(s.sample).toBeTruthy();
      expect(s.fields.some((f) => f.required)).toBe(true);
    }
  });

  it('模板格式：示例信封可直接通过校验（generateImportTemplate.example 合法）', () => {
    const tpl = generateImportTemplate();
    const v = validateImportData(tpl.example);
    expect(v.valid).toBe(true);
    expect(v.errors.filter((e) => e.row > 0)).toEqual([]);
  });
});

describe('M129-C 标准数据导入 - 数据校验', () => {
  it('全合法信封：valid=true，无行级错误，行数统计准确', () => {
    const v = validateImportData(makeValidEnvelope());
    expect(v.valid).toBe(true);
    expect(v.errors.filter((e) => e.row > 0)).toEqual([]);
    expect(v.counts).toEqual({ patients: 2, visits: 2, prescriptions: 2 });
  });

  it('必填缺失：patientNo/name/gender/birthDate 缺失逐字段报错', () => {
    const env = makeValidEnvelope();
    (env.patients[0] as unknown as Record<string, unknown>) = { name: '王五', gender: '未知' }; // 缺 patientNo/birthDate
    const v = validateImportData(env);
    const fields = v.errors.map((e) => e.field);
    expect(fields).toContain('patientNo');
    expect(fields).toContain('birthDate');
  });

  it('枚举非法：gender / visitType 取值越界被拒', () => {
    const env = makeValidEnvelope();
    (env.patients[0] as unknown as Record<string, unknown>).gender = '男童';
    (env.visits[0] as unknown as Record<string, unknown>).visitType = 'online';
    const v = validateImportData(env);
    const genderErr = v.errors.find((e) => e.section === 'patients' && e.field === 'gender');
    const typeErr = v.errors.find((e) => e.section === 'visits' && e.field === 'visitType');
    expect(genderErr?.message).toContain('gender');
    expect(typeErr?.message).toContain('visitType');
  });

  it('日期非法：格式错误与语义错误日期（2026-02-30）均被拒', () => {
    const env = makeValidEnvelope();
    (env.patients[0] as unknown as Record<string, unknown>).birthDate = '2026-02-30';
    (env.visits[0] as unknown as Record<string, unknown>).visitDate = '2026/10/16';
    const v = validateImportData(env);
    expect(v.errors.some((e) => e.field === 'birthDate')).toBe(true);
    expect(v.errors.some((e) => e.field === 'visitDate')).toBe(true);
  });

  it('主键唯一：patientNo / visitId / prescriptionId 重复第二行起被拒', () => {
    const env = makeValidEnvelope();
    env.patients.push({ patientNo: 'P001', name: '重复', gender: '男', birthDate: '2000-01-01' });
    const v = validateImportData(env);
    const dupPid = v.errors.filter((e) => e.section === 'patients' && e.field === 'patientNo' && /重复/.test(e.message));
    expect(dupPid.length).toBe(1);
    expect(dupPid[0].row).toBe(3); // 1-based 第三行
  });

  it('跨表引用：visits.patientNo 悬空 -> 就诊行拒收', () => {
    const env = makeValidEnvelope();
    (env.visits[0] as unknown as Record<string, unknown>).patientNo = 'P999';
    const v = validateImportData(env);
    const dangling = v.errors.find((e) => e.section === 'visits' && e.field === 'patientNo');
    expect(dangling?.message).toContain('P999');
  });

  it('跨表引用：prescriptions.visitId 悬空 -> 处方行拒收，挂接有效就诊的处方仍通过', () => {
    const env = makeValidEnvelope();
    (env.prescriptions[0] as unknown as Record<string, unknown>).visitId = 'V999';
    const v = validateImportData(env);
    const dangling = v.errors.find((e) => e.section === 'prescriptions' && e.field === 'visitId');
    expect(dangling?.message).toContain('V999');
    // RX002 挂接 V002（有效）-> 不应有处方错误
    expect(v.errors.filter((e) => e.section === 'prescriptions' && e.row === 2)).toEqual([]);
  });

  it('行级结构：非对象行（数组/标量）整行拒收并带行号', () => {
    const env = makeValidEnvelope();
    (env.patients as unknown[]).push('我不是对象');
    const v = validateImportData(env);
    const rowErr = v.errors.find((e) => e.section === 'patients' && e.row === 3 && e.field === '@row');
    expect(rowErr).toBeTruthy();
  });

  it('信封级结构：非对象 / tool 不符 / kind 不符 -> errors(row=0) 且不抛异常', () => {
    const bad1 = validateImportData('not-an-object');
    expect(bad1.errors[0].field).toBe('@envelope');
    const bad2 = validateImportData({ ...makeValidEnvelope(), tool: 'other-tool' });
    expect(bad2.errors[0].field).toBe('tool');
    const bad3 = validateImportData({ ...makeValidEnvelope(), kind: 'other-kind' });
    expect(bad3.errors[0].field).toBe('kind');
  });

  it('段缺失兜底：三段非数组按空集处理并记 row=0 提示', () => {
    const v = validateImportData({ tool: IMPORT_TOOL, version: '1.0.0', kind: 'patient-import' });
    expect(v.counts).toEqual({ patients: 0, visits: 0, prescriptions: 0 });
    expect(v.errors.filter((e) => e.row === 0 && ['patients', 'visits', 'prescriptions'].includes(e.field)).length).toBe(3);
  });
});

describe('M129-C 标准数据导入 - 导入逻辑与错误报告', () => {
  it('导入逻辑：全合法信封 accepted 原样保留，rejected 为空', () => {
    const env = makeValidEnvelope();
    const result = importPatientData(env);
    expect(result.accepted.patients).toEqual(env.patients);
    expect(result.accepted.visits).toEqual(env.visits);
    expect(result.accepted.prescriptions).toEqual(env.prescriptions);
    expect(result.counts).toEqual({ patients: 2, visits: 2, prescriptions: 2, rejectedRows: 0 });
  });

  it('导入逻辑：同时接受 JSON 字符串与已解析对象，结果一致', () => {
    const env = makeValidEnvelope();
    const fromStr = importPatientData(JSON.stringify(env));
    const fromObj = importPatientData(env);
    expect(fromStr.accepted).toEqual(fromObj.accepted);
    expect(fromStr.counts).toEqual(fromObj.counts);
  });

  it('导入逻辑：坏行整行剔除进入 rejected，好行照常受理', () => {
    const env = makeValidEnvelope();
    // 第 3 行患者：缺 name -> 整行拒收；其挂接的 V003 因患者悬空一并被拒
    env.patients.push({ patientNo: 'P003', gender: '男', birthDate: '2000-01-01' } as never);
    env.visits.push({ visitId: 'V003', patientNo: 'P003', visitType: 'outpatient', deptName: '内科', visitDate: '2026-10-16' });
    const result = importPatientData(env);
    // 好患者 P001/P002 保留；坏行 P003 剔除
    expect(result.accepted.patients.map((p) => p.patientNo)).toEqual(['P001', 'P002']);
    // V001/V002 保留，V003 因 patientNo 悬空被拒
    expect(result.accepted.visits.map((v) => v.visitId)).toEqual(['V001', 'V002']);
    expect(result.counts.patients).toBe(2);
    expect(result.counts.visits).toBe(2);
    expect(result.counts.rejectedRows).toBeGreaterThan(0);
  });

  it('错误报告：rejected 带数据段/行号/字段/可读消息', () => {
    const env = makeValidEnvelope();
    (env.prescriptions[0] as unknown as Record<string, unknown>).drugName = '';
    const result = importPatientData(env);
    const rxErr = result.rejected.find((r) => r.section === 'prescriptions' && r.field === 'drugName');
    expect(rxErr).toBeTruthy();
    expect(rxErr?.row).toBe(1);
    expect(rxErr?.message).toContain('drugName');
  });

  it('错误报告：同一行多字段错误合并计为一行拒收（rejectedRows 按行去重）', () => {
    const env = makeValidEnvelope();
    (env.visits[0] as unknown as Record<string, unknown>) = { visitId: '', patientNo: 'NOPE', visitType: 'xx', deptName: '', visitDate: 'bad' };
    // 清空处方段，避免 V001 行失败连带 RX001 悬空，聚焦「同一行多字段」计数
    env.prescriptions = [];
    const result = importPatientData(env);
    // V001 行：visitId/patientNo/visitType/deptName/visitDate 均有错 -> 5 条 issue，但 rejectedRows=1
    expect(result.counts.rejectedRows).toBe(1);
    expect(result.rejected.filter((r) => r.section === 'visits' && r.row === 1).length).toBe(5);
  });

  it('异常拦截：空内容 / 非法 JSON / 非对象 / 异系统信封被抛错拒绝', () => {
    expect(() => importPatientData('')).toThrow(/为空/);
    expect(() => importPatientData('{oops')).toThrow(/合法 JSON/);
    expect(() => importPatientData(JSON.stringify(123))).toThrow(/对象信封/);
    expect(() => importPatientData(JSON.stringify({ tool: 'other' }))).toThrow(/非本系统/);
    expect(() => importPatientData(JSON.stringify({ tool: IMPORT_TOOL, kind: 'backup' }))).toThrow(/种类错误/);
  });
});
