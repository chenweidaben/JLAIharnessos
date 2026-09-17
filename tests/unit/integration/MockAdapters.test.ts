/**
 * 健澜科技数智医院智能体 - Mock适配器单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { HISMockAdapter } from '../../../src/integration/adapters/his/HISMockAdapter';
import { EMRMockAdapter } from '../../../src/integration/adapters/emr/EMRMockAdapter';
import { LISMockAdapter } from '../../../src/integration/adapters/lis/LISMockAdapter';
import { PACSMockAdapter } from '../../../src/integration/adapters/pacs/PACSMockAdapter';

describe('HISMockAdapter', () => {
  let adapter: HISMockAdapter;

  beforeAll(async () => {
    adapter = new HISMockAdapter({ patientCount: 20 });
    await adapter.init();
    await adapter.connect();
  });

  it('应返回正确的元信息', () => {
    const metadata = adapter.getMetadata();
    expect(metadata.vendor).toBe('mock');
    expect(metadata.type).toBe('his');
  });

  it('应能搜索患者', async () => {
    const result = await adapter.searchPatients({ page: 1, pageSize: 10 });
    expect(result.total).toBe(20);
    expect(result.patients).toHaveLength(10);
    expect(result.patients[0].patientId).toBeTruthy();
    expect(result.patients[0].name).toBeTruthy();
  });

  it('应能按姓名搜索患者', async () => {
    const all = await adapter.searchPatients({ pageSize: 100 });
    const firstName = all.patients[0].name;
    const result = await adapter.searchPatients({ name: firstName.charAt(0) });
    expect(result.total).toBeGreaterThan(0);
  });

  it('应能获取患者信息', async () => {
    const all = await adapter.searchPatients({ pageSize: 1 });
    const patientId = all.patients[0].patientId;
    const patient = await adapter.getPatientInfo(patientId);
    expect(patient.patientId).toBe(patientId);
  });

  it('获取不存在的患者应抛出错误', async () => {
    try {
      await adapter.getPatientInfo('NONEXISTENT');
      throw new Error('应抛出错误');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('应能创建医嘱', async () => {
    const all = await adapter.searchPatients({ pageSize: 1 });
    const patientId = all.patients[0].patientId;
    const result = await adapter.createOrder({
      patientId,
      orderType: 'drug',
      orderName: '硝苯地平缓释片',
      dosage: '20mg',
      frequency: 'QD',
      route: '口服',
      orderedBy: '王医生',
      orderedById: 'DOC001',
    });
    expect(result.orderId).toBeTruthy();
    expect(result.status).toBe('active');
    expect(result.message).toContain('成功');
  });

  it('应能查询医嘱列表', async () => {
    const all = await adapter.searchPatients({ pageSize: 1 });
    const patientId = all.patients[0].patientId;
    await adapter.createOrder({
      patientId,
      orderType: 'lab',
      orderName: '血常规',
      orderedBy: '王医生',
      orderedById: 'DOC001',
    });
    const orders = await adapter.getOrderList(patientId);
    expect(orders.length).toBeGreaterThanOrEqual(1);
  });

  it('应能取消医嘱', async () => {
    const all = await adapter.searchPatients({ pageSize: 1 });
    const patientId = all.patients[0].patientId;
    const created = await adapter.createOrder({
      patientId,
      orderType: 'drug',
      orderName: '测试药品',
      orderedBy: '王医生',
      orderedById: 'DOC001',
    });
    const cancelled = await adapter.cancelOrder(created.orderId, '测试取消');
    expect(cancelled).toBe(true);
    const status = await adapter.getOrderStatus(created.orderId);
    expect(status).toBe('cancelled');
  });

  it('应能查询费用信息', async () => {
    const all = await adapter.searchPatients({ pageSize: 1 });
    const patientId = all.patients[0].patientId;
    const billing = await adapter.getPatientCost(patientId);
    expect(billing.totalAmount).toBeGreaterThan(0);
    expect(billing.insuranceAmount + billing.selfPayAmount).toBe(billing.totalAmount);
  });

  it('应能查询医保信息', async () => {
    const all = await adapter.searchPatients({ pageSize: 1 });
    const insurance = await adapter.getInsuranceInfo(all.patients[0].patientId);
    expect(insurance.insuranceType).toBeTruthy();
    expect(insurance.coverageStatus).toBe('active');
  });

  it('应能查询医生排班', async () => {
    const schedules = await adapter.getDoctorSchedule('DOC001', {
      start: '2024-06-01',
      end: '2024-06-30',
    });
    expect(Array.isArray(schedules)).toBe(true);
  });

  it('应能查询可用号源', async () => {
    const slots = await adapter.getAvailableSlots('DEPT001', '2024-06-15');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].startTime).toBeTruthy();
  });

  it('应支持事件订阅', async () => {
    let receivedEvent: unknown = null;
    const unsubscribe = adapter.onPatientEvent((event) => {
      receivedEvent = event;
    });
    adapter.emitPatientEvent({
      eventType: 'admitted',
      patientId: 'P001',
      timestamp: new Date().toISOString(),
    });
    expect(receivedEvent).not.toBeNull();
    unsubscribe();
  });

  it('应能健康检查', async () => {
    const health = await adapter.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.adapterType).toBe('his');
  });
});

describe('EMRMockAdapter', () => {
  let adapter: EMRMockAdapter;

  beforeAll(async () => {
    adapter = new EMRMockAdapter();
    await adapter.init();
    await adapter.connect();
  });

  it('应能获取病历', async () => {
    const record = await adapter.getMedicalRecord('REC000001');
    expect(record.recordId).toBe('REC000001');
    expect(record.recordType).toBe('outpatient_note');
    expect(record.patientId).toBe('P20240001');
    expect(record.structuredData.chiefComplaint).toBeTruthy();
  });

  it('应能查询病历列表', async () => {
    const result = await adapter.getRecordList({ patientId: 'P20240002' });
    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.records[0].recordType).toBeTruthy();
  });

  it('应能按类型筛选病历', async () => {
    const result = await adapter.getRecordList({
      patientId: 'P20240002',
      recordType: 'progress_note',
    });
    expect(result.records.every((r) => r.recordType === 'progress_note')).toBe(true);
  });

  it('应能写入病历', async () => {
    const record = await adapter.writeMedicalRecord({
      patientId: 'P001',
      encounterId: 'E001',
      recordType: 'progress_note',
      title: '测试病程记录',
      freeText: '患者病情稳定，继续当前治疗方案。',
      structuredData: { presentIllness: '病情稳定' },
      createdBy: '王医生',
      aiGenerated: true,
    });
    expect(record.recordId).toBeTruthy();
    expect(record.status).toBe('draft');
    expect(record.aiGenerated).toBe(true);
  });

  it('应能更新病历', async () => {
    const updated = await adapter.updateMedicalRecord('REC000001', {
      title: '更新后的标题',
      freeText: '更新后的病历内容',
      createdBy: '李医生',
    });
    expect(updated.title).toBe('更新后的标题');
    expect(updated.updatedBy).toBe('李医生');
  });

  it('应能获取病历模板', async () => {
    const templates = await adapter.getTemplateList('outpatient_note');
    expect(templates.length).toBeGreaterThan(0);
    expect(templates[0].recordType).toBe('outpatient_note');
  });

  it('应能获取单个模板', async () => {
    const template = await adapter.getTemplate('TPL0001');
    expect(template.templateId).toBe('TPL0001');
  });

  it('应能电子签名', async () => {
    const signed = await adapter.signRecord({
      recordId: 'REC000001',
      signerId: 'DOC001',
      signerName: '王医生',
    });
    expect(signed.status).toBe('signed');
    expect(signed.signedBy).toBe('王医生');
    expect(signed.caSignature).toBeTruthy();
  });

  it('应能验证签名', async () => {
    await adapter.signRecord({
      recordId: 'REC000002',
      signerId: 'DOC002',
      signerName: '李医生',
    });
    const verification = await adapter.verifySignature('REC000002');
    expect(verification.valid).toBe(true);
    expect(verification.signedBy).toBe('李医生');
  });

  it('获取不存在的病历应抛出错误', async () => {
    try {
      await adapter.getMedicalRecord('NONEXISTENT');
      throw new Error('应抛出错误');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe('LISMockAdapter', () => {
  let adapter: LISMockAdapter;

  beforeAll(async () => {
    adapter = new LISMockAdapter();
    await adapter.init();
    await adapter.connect();
  });

  it('应能获取检验报告', async () => {
    const report = await adapter.getLabResult('RPT000001');
    expect(report.reportId).toBe('RPT000001');
    expect(report.reportType).toBe('血常规');
    expect(report.results.length).toBeGreaterThan(0);
  });

  it('应能查询检验报告列表', async () => {
    const reports = await adapter.getLabResultList('P20240001');
    expect(reports.length).toBeGreaterThanOrEqual(2);
  });

  it('血常规报告应包含正常结果', async () => {
    const report = await adapter.getLabResult('RPT000001');
    const wbc = report.results.find((r) => r.itemCode === 'CBC001');
    expect(wbc).toBeDefined();
    expect(wbc!.abnormalFlag).toBe('normal');
    expect(wbc!.numericValue).toBe(6.5);
  });

  it('生化报告应包含异常结果', async () => {
    const report = await adapter.getLabResult('RPT000002');
    const glucose = report.results.find((r) => r.itemCode === 'BIO005');
    expect(glucose).toBeDefined();
    expect(glucose!.abnormalFlag).toBe('high');
    expect(glucose!.numericValue).toBe(7.8);
  });

  it('心肌酶报告应包含危急值', async () => {
    const report = await adapter.getLabResult('RPT000003');
    const troponin = report.results.find((r) => r.itemCode === 'CAR001');
    expect(troponin).toBeDefined();
    expect(troponin!.abnormalFlag).toBe('critical');
    expect(troponin!.numericValue).toBe(5.8);
    expect(troponin!.remarks).toContain('危急值');
  });

  it('应能创建检验申请', async () => {
    const result = await adapter.orderLabTest({
      patientId: 'P001',
      testItems: [{ itemCode: 'CBC001', itemName: '血常规' }],
      urgency: 'routine',
      orderedBy: '王医生',
      orderedById: 'DOC001',
    });
    expect(result.orderId).toBeTruthy();
    expect(result.status).toBe('pending');
  });

  it('应能取消检验申请', async () => {
    const result = await adapter.cancelLabTest('ORD001', '测试取消');
    expect(result).toBe(true);
  });

  it('应能查询检验项目目录', async () => {
    const catalog = await adapter.getTestCatalog();
    expect(catalog.length).toBeGreaterThan(10);
  });

  it('应能按类别筛选检验项目', async () => {
    const catalog = await adapter.getTestCatalog('血常规');
    expect(catalog.every((i) => i.category === '血常规')).toBe(true);
  });

  it('应能按关键词搜索检验项目', async () => {
    const catalog = await adapter.getTestCatalog(undefined, '肌钙');
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog[0].itemName).toContain('肌钙');
  });

  it('应支持危急值订阅', () => {
    let received = false;
    const unsubscribe = adapter.subscribeCriticalValues(() => {
      received = true;
    });
    adapter.emitCriticalValue({
      eventId: 'evt001',
      patientId: 'P001',
      patientName: '张三',
      orderId: 'ORD001',
      reportId: 'RPT001',
      testItemCode: 'CAR001',
      testItemName: '肌钙蛋白I',
      resultValue: '5.8',
      unit: 'ng/mL',
      referenceRange: '0-0.04',
      criticalHigh: '0.5',
      reportedAt: new Date().toISOString(),
      reportedBy: '张检验师',
    });
    expect(received).toBe(true);
    unsubscribe();
  });
});

describe('PACSMockAdapter', () => {
  let adapter: PACSMockAdapter;

  beforeAll(async () => {
    adapter = new PACSMockAdapter();
    await adapter.init();
    await adapter.connect();
  });

  it('应能获取影像报告', async () => {
    const report = await adapter.getImageReport('IMG000001');
    expect(report.reportId).toBe('IMG000001');
    expect(report.modality).toBe('CT');
    expect(report.bodyPart).toBe('胸部');
    expect(report.finding).toBeTruthy();
    expect(report.impression).toBeTruthy();
  });

  it('应能查询影像报告列表', async () => {
    const reports = await adapter.getReportList('P20240001');
    expect(reports.length).toBeGreaterThanOrEqual(1);
  });

  it('应能按模态筛选报告', async () => {
    const reports = await adapter.getReportList('P20240003', undefined, 'MRI');
    expect(reports.every((r) => r.modality === 'MRI')).toBe(true);
  });

  it('头颅MRI报告应提示脑梗死', async () => {
    const report = await adapter.getImageReport('IMG000002');
    expect(report.impression).toContain('脑梗死');
    expect(report.modality).toBe('MRI');
  });

  it('应能创建影像检查申请', async () => {
    const result = await adapter.orderImagingExam({
      patientId: 'P001',
      modality: 'CT',
      bodyPart: '胸部',
      examName: '胸部CT平扫',
      urgency: 'routine',
      orderedBy: '王医生',
      orderedById: 'DOC001',
    });
    expect(result.examId).toBeTruthy();
    expect(result.status).toBe('scheduled');
  });

  it('应能查询DICOM Study列表', async () => {
    const studies = await adapter.getStudyList('P20240001');
    expect(studies.length).toBeGreaterThanOrEqual(1);
    expect(studies[0].studyInstanceUid).toBeTruthy();
  });

  it('应能获取DICOM影像', async () => {
    const studies = await adapter.getStudyList('P20240001');
    const instances = await adapter.getDicomImage(studies[0].studyInstanceUid);
    expect(instances.length).toBeGreaterThan(0);
    expect(instances[0].sopInstanceUid).toBeTruthy();
    expect(instances[0].rows).toBe(512);
  });

  it('应能触发AI分析', async () => {
    const result = await adapter.triggerAIAnalysis({
      examId: 'EXAM001',
      analysisType: 'lung_nodule',
    });
    expect(result.analysisId).toBeTruthy();
    expect(result.status).toBe('processing');
  });

  it('应能获取AI分析结果', async () => {
    const result = await adapter.getAIResult('AI000001');
    expect(result.analysisId).toBe('AI000001');
    expect(result.status).toBe('completed');
    expect(result.findings!.length).toBeGreaterThan(0);
    expect(result.findings![0].confidence).toBeGreaterThan(0.9);
  });

  it('应支持影像事件订阅', async () => {
    let received = false;
    const unsubscribe = adapter.onImagingEvent(() => {
      received = true;
    });
    await adapter.orderImagingExam({
      patientId: 'P001',
      modality: 'DR',
      bodyPart: '胸部',
      examName: '胸片',
      urgency: 'routine',
      orderedBy: '王医生',
      orderedById: 'DOC001',
    });
    expect(received).toBe(true);
    unsubscribe();
  });
});
