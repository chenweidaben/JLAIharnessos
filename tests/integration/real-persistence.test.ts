/**
 * 健澜科技数智医院智能体 - 真实链路集成测试
 *
 * 测试核心业务实体的真实 CRUD 与状态流转，验证数据真落库、刷新不丢。
 * 需要可用的 PostgreSQL（DATABASE_URL）；无 DB 时自动跳过。
 *
 * 运行：bun test tests/integration/real-persistence.test.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection, withTx } from '../../src/db/pool.js';
import * as patientRepo from '../../src/db/repositories/patientRepo.js';
import * as visitRepo from '../../src/db/repositories/visitRepo.js';
import * as orderRepo from '../../src/db/repositories/orderRepo.js';
import * as prescriptionRepo from '../../src/db/repositories/prescriptionRepo.js';
import * as medicalRecordRepo from '../../src/db/repositories/medicalRecordRepo.js';
import * as labResultRepo from '../../src/db/repositories/labResultRepo.js';
import * as conversationRepo from '../../src/db/repositories/conversationRepo.js';

let dbAvailable = false;
// 测试用真实医生/药师用户（外键 signed_by / reviewer_id / author_id 必须指向 iam.users）
let doctorId = '';
let pharmacistId = '';

beforeAll(async () => {
  try {
    await verifyDbConnection(2, 1000);
    dbAvailable = true;
    // 创建测试医生与药师，拿到真实 uuid 贯穿全流程（验证外键完整性）
    const sql = getDb();
    const ts = Date.now();
    const dr = await sql`INSERT INTO iam.users (username, name, role) VALUES (${`TEST_DOC_${ts}`}, '测试医生', 'doctor') RETURNING id`;
    const ph = await sql`INSERT INTO iam.users (username, name, role) VALUES (${`TEST_PHAR_${ts}`}, '测试药师', 'pharmacist') RETURNING id`;
    doctorId = String(dr[0].id);
    pharmacistId = String(ph[0].id);
    console.log('[test] PostgreSQL 可用，执行真实链路集成测试');
  } catch (e) {
    dbAvailable = false;
    console.log('[test] PostgreSQL 不可用，跳过真实链路集成测试（设置 DATABASE_URL 后可运行）', String(e));
  }
});

afterAll(async () => {
  if (dbAvailable) {
    // 不能调用生产语义的 closeDb()：它会把模块级 _shuttingDown 永久置真，
    // bun test 同进程内后续测试文件再取连接会全部失败（测试隔离缺陷）。
    // closeDbForTest 结束物理连接的同时重置关闭标志，不泄漏全局状态。
    await closeDbForTest();
  }
});

describe('真实持久化 - 患者', () => {
  it('创建患者后可按 ID 和 MRN 查回', async () => {
    if (!dbAvailable) return;
    const mrn = `TEST_${Date.now()}`;
    const created = await patientRepo.createPatient({
      mrn,
      nameMasked: '测*三',
      gender: '男',
      birthDate: '1980-01-01',
      bloodType: 'O型',
      allergies: [{ allergen: '青霉素', reaction: '皮疹', severity: '中度' }],
      tags: ['测试'],
    });
    expect(created.id).toBeTruthy();
    expect(created.mrn).toBe(mrn);

    const byId = await patientRepo.getPatientById(created.id);
    expect(byId).not.toBeNull();
    expect(byId?.mrn).toBe(mrn);

    const byMrn = await patientRepo.getPatientByMrn(mrn);
    expect(byMrn).not.toBeNull();
    expect(byMrn?.id).toBe(created.id);
  });

  it('查询患者列表支持关键词搜索', async () => {
    if (!dbAvailable) return;
    const mrn = `SRCH_${Date.now()}`;
    await patientRepo.createPatient({ mrn, nameMasked: '搜*索', gender: '女' });
    const results = await patientRepo.queryPatients({ keyword: '搜' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.mrn === mrn)).toBe(true);
  });
});

describe('真实持久化 - 就诊与医嘱', () => {
  it('创建就诊→开医嘱→查回→状态流转 完整闭环', async () => {
    if (!dbAvailable) return;
    // 1. 创建患者
    const patient = await patientRepo.createPatient({
      mrn: `ORD_${Date.now()}`,
      nameMasked: '医*嘱',
      gender: '男',
    });

    // 2. 创建就诊
    const visit = await visitRepo.createVisit({
      patientId: patient.id,
      visitType: 'outpatient',
      department: '心血管内科',
      chiefComplaint: '测试医嘱闭环',
    });
    expect(visit.id).toBeTruthy();

    // 3. 开医嘱
    const order = await orderRepo.createOrder({
      visitId: visit.id,
      orderType: 'drug',
      content: '阿司匹林肠溶片 100mg qd',
      detail: { drug: '阿司匹林', dosage: '100mg' },
    });
    expect(order.status).toBe('active');

    // 4. 按就诊查回医嘱
    const orders = await orderRepo.getOrdersByVisit(visit.id);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.some((o) => o.id === order.id)).toBe(true);

    // 5. 按患者查回医嘱
    const patientOrders = await orderRepo.getOrdersByPatient(patient.id);
    expect(patientOrders.some((o) => o.id === order.id)).toBe(true);

    // 6. 医嘱状态流转：active → executed
    const executed = await orderRepo.updateOrderStatus(order.id, 'executed');
    expect(executed?.status).toBe('executed');

    // 7. 取消医嘱（带原因）
    const order2 = await orderRepo.createOrder({
      visitId: visit.id,
      orderType: 'lab',
      content: '血常规',
    });
    const cancelled = await orderRepo.cancelOrder(order2.id, '患者拒绝');
    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled?.detail.cancelReason).toBe('患者拒绝');
  });
});

describe('真实持久化 - 处方与审核', () => {
  it('开处方→药师审核→发药 状态流转', async () => {
    if (!dbAvailable) return;
    const patient = await patientRepo.createPatient({
      mrn: `RX_${Date.now()}`,
      nameMasked: '处*方',
      gender: '女',
    });
    const visit = await visitRepo.createVisit({
      patientId: patient.id,
      visitType: 'outpatient',
      department: '内分泌科',
    });

    // 1. 开处方（含明细）
    const rx = await prescriptionRepo.createPrescription({
      visitId: visit.id,
      items: [
        { drugCode: null, drugName: '二甲双胍片', specification: '0.5g', dosage: 0.5, dosageUnit: 'g', frequency: 'tid', route: '口服', daysSupply: 30, quantity: 90, quantityUnit: '片', skinTest: false, remark: null },
      ],
      counsel: '随餐服用',
    });
    expect(rx.status).toBe('pending_review');
    expect(rx.items.length).toBe(1);

    // 2. 按 ID 查回
    const fetched = await prescriptionRepo.getPrescriptionById(rx.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.items.length).toBe(1);

    // 3. 药师审核通过
    const approved = await prescriptionRepo.auditPrescription(
      rx.id, 'approved', pharmacistId, { riskLevel: 'pass', comments: '用药合理' },
    );
    expect(approved?.status).toBe('approved');

    // 4. 发药
    const dispensed = await prescriptionRepo.dispensePrescription(rx.id);
    expect(dispensed?.status).toBe('dispensed');

    // 5. 按就诊查到处方
    const visitRx = await prescriptionRepo.getPrescriptionsByVisit(visit.id);
    expect(visitRx.some((r) => r.id === rx.id)).toBe(true);
  });
});

describe('真实持久化 - 病历文书', () => {
  it('写病历→查回→状态流转', async () => {
    if (!dbAvailable) return;
    const patient = await patientRepo.createPatient({
      mrn: `EMR_${Date.now()}`, nameMasked: '病*历', gender: '男',
    });
    const visit = await visitRepo.createVisit({
      patientId: patient.id, visitType: 'outpatient', department: '内科',
    });

    const record = await medicalRecordRepo.createMedicalRecord({
      visitId: visit.id,
      recordType: 'outpatient',
      title: '门诊病历',
      content: { chiefComplaint: '测试', diagnosis: '测试诊断' },
      plainText: '测试门诊病历内容',
      aiGenerated: true,
      aiModel: 'deepseek-chat',
    });
    expect(record.status).toBe('draft');
    expect(record.aiGenerated).toBe(true);

    const fetched = await medicalRecordRepo.getMedicalRecordById(record.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('门诊病历');

    const signed = await medicalRecordRepo.updateMedicalRecordStatus(record.id, 'signed', doctorId);
    expect(signed?.status).toBe('signed');

    const visitRecords = await medicalRecordRepo.getMedicalRecordsByVisit(visit.id);
    expect(visitRecords.some((r) => r.id === record.id)).toBe(true);
  });
});

describe('真实持久化 - 检验结果与危急值', () => {
  it('写入检验结果→危急值查询', async () => {
    if (!dbAvailable) return;
    const patient = await patientRepo.createPatient({
      mrn: `LAB_${Date.now()}`, nameMasked: '检*验', gender: '男',
    });
    const visit = await visitRepo.createVisit({
      patientId: patient.id, visitType: 'emergency', department: '急诊科',
    });

    // 写入危急值
    const critical = await labResultRepo.createLabResult({
      visitId: visit.id, patientId: patient.id,
      panelName: '心肌损伤标志物', itemName: '肌钙蛋白I', itemCode: 'cTnI',
      value: '0.15', numericValue: 0.15, unit: 'ng/mL',
      refLow: 0, refHigh: 0.04, abnormalFlag: 'HH', isCritical: true,
    });
    expect(critical.isCritical).toBe(true);

    // 写入正常值
    await labResultRepo.createLabResult({
      visitId: visit.id, patientId: patient.id,
      panelName: '血常规', itemName: '白细胞', itemCode: 'WBC',
      value: '6.5', numericValue: 6.5, unit: '10^9/L',
      refLow: 3.5, refHigh: 9.5, abnormalFlag: 'N', isCritical: false,
    });

    // 危急值查询
    const criticals = await labResultRepo.getCriticalLabResults(patient.id);
    expect(criticals.some((r) => r.id === critical.id)).toBe(true);

    // 按就诊查询
    const visitLabs = await labResultRepo.getLabResultsByVisit(visit.id);
    expect(visitLabs.length).toBe(2);
  });
});

describe('真实持久化 - 对话会话与消息', () => {
  it('创建会话→追加消息→拉取历史 刷新不丢', async () => {
    if (!dbAvailable) return;
    // 1. 创建会话
    const conv = await conversationRepo.createConversation({
      title: '测试对话',
      metadata: { test: true },
    });
    expect(conv.messageCount).toBe(0);

    // 2. 追加用户消息
    const userMsg = await conversationRepo.appendMessage(conv.id, {
      role: 'user',
      content: '你好，请帮我分析患者情况',
    });
    expect(userMsg.role).toBe('user');

    // 3. 追加助手消息（含工具调用）
    const assistantMsg = await conversationRepo.appendMessage(conv.id, {
      role: 'assistant',
      content: '已为您查询患者数据，建议...',
      toolCalls: [{ id: 'tc_1', name: 'query_patient', args: { patientId: '123' } }],
      tokensIn: 150, tokensOut: 80, latencyMs: 2500,
    });
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.toolCalls.length).toBe(1);

    // 4. 会话消息计数更新
    const convAfter = await conversationRepo.getConversationById(conv.id);
    expect(convAfter?.messageCount).toBe(2);

    // 5. 拉取历史（正序）
    const messages = await conversationRepo.getMessagesByConversation(conv.id);
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');

    // 6. 最近消息（倒序取再正序）
    const recent = await conversationRepo.getRecentMessages(conv.id, 10);
    expect(recent.length).toBe(2);
    expect(recent[0].role).toBe('user');

    // 7. 会话列表可见
    const list = await conversationRepo.listConversations();
    expect(list.some((c) => c.id === conv.id)).toBe(true);
  });
});

describe('事务一致性', () => {
  it('处方创建在事务中，明细与头一致', async () => {
    if (!dbAvailable) return;
    const patient = await patientRepo.createPatient({
      mrn: `TX_${Date.now()}`, nameMasked: '事*务', gender: '男',
    });
    const visit = await visitRepo.createVisit({
      patientId: patient.id, visitType: 'outpatient', department: '内科',
    });

    const rx = await prescriptionRepo.createPrescription({
      visitId: visit.id,
      items: [
        { drugCode: null, drugName: '药A', specification: '10mg', dosage: 10, dosageUnit: 'mg', frequency: 'qd', route: '口服', daysSupply: 7, quantity: 7, quantityUnit: '片', skinTest: false, remark: null },
        { drugCode: null, drugName: '药B', specification: '20mg', dosage: 20, dosageUnit: 'mg', frequency: 'bid', route: '口服', daysSupply: 7, quantity: 14, quantityUnit: '片', skinTest: false, remark: null },
      ],
    });

    const fetched = await prescriptionRepo.getPrescriptionById(rx.id);
    expect(fetched?.items.length).toBe(2);
    expect(fetched?.items[0].drugName).toBe('药A');
    expect(fetched?.items[1].drugName).toBe('药B');
  });
});
