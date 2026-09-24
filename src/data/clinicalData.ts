/**
 * 健澜科技数智医院智能体 - 统一临床数据访问层
 *
 * 对上层医疗工具（src/medical-tools/）屏蔽"演示内存数据"与"真实 PostgreSQL"的差异：
 *   - DEMO_MODE=1（或 true）：走 src/medical-tools/mockData.ts 内存数据（保留不动，作为后备）
 *   - 真实模式：走 src/db/repositories/ 下的 Repository，并在本层把数据库行映射成
 *     与 Mock 数据完全一致的 DTO，保证工具对外返回契约不变。
 *
 * 设计原则：
 *   1. 真实模式下绝不静默返回空数组冒充"没有数据"——DB 连接/查询失败直接抛错。
 *   2. 写操作（开医嘱/处方/病历）在真实模式下必须落到 Repository；演示模式下写入本层内存
 *      追加存储，使"写入→查询"闭环在两种模式下都成立。
 *   3. 所有映射集中在本文件，工具层只换数据源、不改对外字段。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  MOCK_DRUG_INTERACTIONS,
  MOCK_IMAGE_REPORTS,
  MOCK_LAB_REPORTS,
  MOCK_MEDICAL_RECORDS,
  MOCK_ORDERS,
  MOCK_PATIENTS,
  MOCK_VISITS,
  type MockDrugInteraction,
  type MockImageReport,
  type MockLabReport,
  type MockMedicalRecord,
  type MockOrder,
  type MockPatient,
  type MockVisit,
} from '../medical-tools/mockData.js';
import {
  PRESCRIPTION_STORE,
  type MockPrescription,
  type PrescriptionItem,
} from '../medical-tools/pharmacy/drugCatalog.js';

import * as patientRepo from '../db/repositories/patientRepo.js';
import * as visitRepo from '../db/repositories/visitRepo.js';
import * as orderRepo from '../db/repositories/orderRepo.js';
import * as prescriptionRepo from '../db/repositories/prescriptionRepo.js';
import * as medicalRecordRepo from '../db/repositories/medicalRecordRepo.js';
import * as labResultRepo from '../db/repositories/labResultRepo.js';
import * as drugRepo from '../db/repositories/drugRepo.js';

// ============================================================================
// 运行模式判定
// ============================================================================

/** 是否为演示模式（DEMO_MODE=1 / true）。演示模式跳过 PostgreSQL，使用内存数据。 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/** 数据来源标记：演示模式 demo / 真实库 database。 */
export function sourceTag(): 'demo' | 'database' {
  return isDemoMode() ? 'demo' : 'database';
}

// ============================================================================
// 演示模式内存追加存储
// ----------------------------------------------------------------------------
// mockData.ts / drugCatalog.ts 作为只读后备保留不动；演示模式下"新写入"的医嘱/病历
// 追加到这里，与既有种子数据合并后对外提供，保证写入→查询闭环。
// （处方的演示写入继续复用 PRESCRIPTION_STORE，与既有 getPrescriptionList 行为一致。）
// ============================================================================

const MEM_ORDERS: MockOrder[] = [];
const MEM_MEDICAL_RECORDS: MockMedicalRecord[] = [];

// ============================================================================
// 中英枚举映射（DB 英文枚举 ↔ 工具对外中文枚举）
// ============================================================================

function mapOrderType(eng: string): string {
  switch (eng) {
    case 'drug':
      return '药品';
    case 'lab':
      return '检验';
    case 'imaging':
      return '检查';
    case 'treatment':
      return '治疗';
    case 'nursing':
      return '护理';
    case 'diet':
      return '饮食';
    default:
      return '其他';
  }
}

function mapOrderStatus(eng: string): string {
  switch (eng) {
    case 'active':
      return '执行中';
    case 'executed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    case 'audited':
      return '待审核';
    default:
      return '执行中';
  }
}

function mapOrderPriority(eng: string): string {
  switch (eng) {
    case 'urgent':
      return '急';
    case 'stat':
      return '即刻';
    default:
      return '普通';
  }
}

function mapVisitType(eng: string): string {
  switch (eng) {
    case 'outpatient':
      return '门诊';
    case 'emergency':
      return '急诊';
    case 'inpatient':
      return '住院';
    case 'checkup':
      return '体检';
    default:
      return '门诊';
  }
}

function mapRxStatus(eng: string): MockPrescription['status'] {
  switch (eng) {
    case 'pending_review':
      return '待审核';
    case 'approved':
      return '已审核';
    case 'dispensed':
      return '已发药';
    case 'rejected':
      return '已驳回';
    case 'cancelled':
    case 'draft':
    default:
      return '已退回';
  }
}

function mapEmrStatus(eng: string): MockMedicalRecord['status'] {
  switch (eng) {
    case 'submitted':
      return '待复核';
    case 'reviewed':
    case 'signed':
      return '已确认';
    case 'archived':
      return '已归档';
    default:
      return '草稿';
  }
}

// ============================================================================
// 通用小工具
// ============================================================================

function calcAge(birthDate: string | null): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function toDateOnly(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

/** 把 DB 里以 jsonb 存的过敏史归一化为 MockPatient.allergies 结构。 */
function normalizeAllergies(
  raw: Array<Record<string, unknown>>,
): MockPatient['allergies'] {
  return raw.map((r) => ({
    allergen: String(r.allergen ?? ''),
    reaction: String(r.reaction ?? ''),
    severity: (r.severity as MockPatient['allergies'][number]['severity']) ?? '轻度',
    recordedAt: r.recordedAt ? String(r.recordedAt) : '',
  }));
}

function normalizePastHistory(
  raw: Array<Record<string, unknown>>,
): MockPatient['pastHistory'] {
  return raw.map((r) => ({
    disease: String(r.disease ?? ''),
    diagnosedAt: r.diagnosedAt ? String(r.diagnosedAt) : null,
    status: (r.status as MockPatient['pastHistory'][number]['status']) ?? '未愈',
  }));
}

// ============================================================================
// 真实模式：Repository 行 → Mock DTO 映射
// ============================================================================

/**
 * 由 DB Patient + 其最新就诊 + 在用药医嘱，组装成与 MockPatient 一致的 DTO。
 * 真实库未存储的字段（身份证/手机/地址明文、生命体征）按安全策略留空，不编造。
 */
async function mapDbPatientToDto(
  p: patientRepo.Patient,
): Promise<MockPatient> {
  const visits = await visitRepo.getVisitsByPatient(p.id, { limit: 1 });
  const latest = visits[0] ?? null;

  // 当前用药：取 active 状态的药品医嘱
  const drugOrders = await orderRepo.getOrdersByPatient(p.id, { status: 'active' });
  const currentMedications = drugOrders
    .filter((o) => o.orderType === 'drug')
    .map((o) => ({
      drugName: String(o.detail.drug ?? o.content.split(' ')[0] ?? o.content),
      dosage: String(o.detail.dosage ?? ''),
      frequency: String(o.detail.frequency ?? ''),
      startDate: toDateOnly(o.startAt) ?? new Date().toISOString().slice(0, 10),
      prescribingDoctor: o.doctorId ? String(o.doctorId) : '医生',
    }));

  return {
    patientId: p.id,
    name: p.nameMasked,
    gender: (p.gender as MockPatient['gender']) ?? '未知',
    age: calcAge(p.birthDate),
    birthDate: p.birthDate ?? '',
    // DB 仅保存身份证哈希/手机号密文，本层不具备解密能力，按脱敏视图留空。
    idCard: '',
    phone: '',
    address: '',
    bloodType: p.bloodType ?? '',
    medicalRecordNo: p.mrn,
    department: latest?.department ?? '',
    currentDiagnosis: null,
    lastVisitDate: toDateOnly(latest?.admitAt) ?? '',
    isEmergency: latest?.visitType === 'emergency',
    allergies: normalizeAllergies(p.allergies),
    pastHistory: normalizePastHistory(p.pastHistory),
    currentMedications,
    // 生命体征未在临床库建模，留空（前端/AgentLoop 字段保留，值为 null）。
    latestVitals: {
      temperature: null,
      pulse: null,
      respiration: null,
      bloodPressure: null,
      spo2: null,
      measuredAt: null,
    },
  };
}

async function mapDbOrderToDto(o: orderRepo.Order): Promise<MockOrder> {
  const visit = await visitRepo.getVisitById(o.visitId);
  const detail = (o.detail ?? {}) as Record<string, unknown>;
  return {
    orderId: o.id,
    patientId: visit?.patientId ?? '',
    encounterId: o.visitId,
    orderType: mapOrderType(o.orderType),
    itemName: o.content,
    dosage: detail.dosage ? String(detail.dosage) : null,
    frequency: detail.frequency ? String(detail.frequency) : null,
    status: mapOrderStatus(o.status),
    priority: mapOrderPriority(o.priority),
    startDate: toDateOnly(o.startAt) ?? new Date().toISOString().slice(0, 10),
    endDate: toDateOnly(o.stopAt),
    prescribingDoctor: o.doctorId ? String(o.doctorId) : '医生',
    executedBy: null,
    clinicalIndication: detail.clinicalIndication ? String(detail.clinicalIndication) : o.content,
  };
}

// ============================================================================
// 门面：统一临床数据访问接口
// ============================================================================

export const clinicalData = {
  // --------------------------------------------------------------------------
  // 患者
  // --------------------------------------------------------------------------

  /**
   * 按患者ID或病历号(EMRN)解析患者。真实模式下先按主键、再按病历号尝试。
   * 找不到返回 null（由工具转成 PATIENT_NOT_FOUND）；DB 故障直接抛错。
   */
  async getPatient(patientId: string): Promise<MockPatient | null> {
    if (isDemoMode()) {
      return MOCK_PATIENTS.find((p) => p.patientId === patientId) ?? null;
    }
    let row = await patientRepo.getPatientById(patientId);
    if (!row) row = await patientRepo.getPatientByMrn(patientId);
    if (!row) return null;
    return mapDbPatientToDto(row);
  },

  /** 患者列表查询（演示模式按关键字过滤；真实模式走 patientRepo）。 */
  async searchPatients(keyword?: string, gender?: string): Promise<MockPatient[]> {
    if (isDemoMode()) {
      return MOCK_PATIENTS.filter((p) => {
        if (keyword && !p.name.includes(keyword) && !p.patientId.includes(keyword)) return false;
        if (gender && p.gender !== gender) return false;
        return true;
      });
    }
    const rows = await patientRepo.queryPatients({ keyword, gender, limit: 50 });
    return Promise.all(rows.map(mapDbPatientToDto));
  },

  // --------------------------------------------------------------------------
  // 就诊
  // --------------------------------------------------------------------------

  async getVisitsByPatient(patientId: string): Promise<MockVisit[]> {
    if (isDemoMode()) {
      return MOCK_VISITS.filter((v) => v.patientId === patientId);
    }
    const me = await this.resolvePatientId(patientId);
    if (!me) return [];
    const visits = await visitRepo.getVisitsByPatient(me, { limit: 50 });
    // 真实库不存储诊断/出院摘要字段，按可获得信息映射，缺失字段置空。
    return visits.map((v) => ({
      encounterId: v.id,
      patientId: v.patientId,
      visitType: mapVisitType(v.visitType),
      visitDate: toDateOnly(v.admitAt) ?? '',
      department: v.department,
      doctor: v.attendingDoctorId ? String(v.attendingDoctorId) : '医生',
      primaryDiagnosis: v.chiefComplaint,
      secondaryDiagnosis: [],
      dischargeSummary: null,
      hasRecords: false,
    }));
  },

  // --------------------------------------------------------------------------
  // 医嘱
  // --------------------------------------------------------------------------

  /**
   * 医嘱列表。传入 encounterId 时按就诊查，否则按患者查。
   * 演示模式合并种子医嘱与本会话内存新建医嘱。
   */
  async getOrders(patientId: string, encounterId?: string): Promise<MockOrder[]> {
    if (isDemoMode()) {
      let list = [...MOCK_ORDERS, ...MEM_ORDERS].filter((o) => o.patientId === patientId);
      if (encounterId) list = list.filter((o) => o.encounterId === encounterId);
      return list;
    }
    if (encounterId) {
      const rows = await orderRepo.getOrdersByVisit(encounterId, { limit: 200 });
      return Promise.all(rows.map(mapDbOrderToDto));
    }
    const me = await this.resolvePatientId(patientId);
    if (!me) return [];
    const rows = await orderRepo.getOrdersByPatient(me, { limit: 200 });
    return Promise.all(rows.map(mapDbOrderToDto));
  },

  /** 按医嘱ID取单条（返回真实 Order 行，供取消/审核做状态流转）。 */
  async getOrderById(orderId: string): Promise<orderRepo.Order | null> {
    if (isDemoMode()) return null; // 演示模式取消/审核仍走内存逻辑，不查库
    return orderRepo.getOrderById(orderId);
  },

  /**
   * 按医嘱ID取单条 DTO（MockOrder 形状，含中文状态/优先级/患者ID）。
   * 演示模式在 MOCK_ORDERS+本会话内存医嘱中查找；真实模式查 orderRepo 后映射。
   */
  async findOrderDto(orderId: string): Promise<MockOrder | null> {
    if (isDemoMode()) {
      return (
        MOCK_ORDERS.find((o) => o.orderId === orderId) ??
        MEM_ORDERS.find((o) => o.orderId === orderId) ??
        null
      );
    }
    const row = await orderRepo.getOrderById(orderId);
    return row ? mapDbOrderToDto(row) : null;
  },

  /**
   * 新开医嘱。真实模式写 orderRepo.createOrder；演示模式追加内存医嘱。
   * 返回真实 Order 行（演示模式返回 null，由工具自行生成对外ID）。
   */
  async createOrder(input: {
    visitId: string;
    orderType: orderRepo.OrderType;
    content: string;
    detail?: Record<string, unknown>;
    priority?: orderRepo.OrderPriority;
    doctorId?: string | null;
  }): Promise<{ id: string } | null> {
    if (isDemoMode()) {
      const orderId = `O${Date.now()}${Math.floor(Math.random() * 900000)}`;
      MEM_ORDERS.push({
        orderId,
        patientId: '',
        encounterId: input.visitId,
        orderType: mapOrderType(input.orderType),
        itemName: input.content,
        dosage: (input.detail?.dosage as string) ?? null,
        frequency: (input.detail?.frequency as string) ?? null,
        status: '执行中',
        priority: mapOrderPriority(input.priority ?? 'routine'),
        startDate: new Date().toISOString().slice(0, 10),
        endDate: null,
        prescribingDoctor: input.doctorId ? String(input.doctorId) : '医生',
        executedBy: null,
        clinicalIndication: input.content,
      });
      return { id: orderId };
    }
    return orderRepo.createOrder(input);
  },

  async cancelOrder(orderId: string, reason: string): Promise<orderRepo.Order | null> {
    if (isDemoMode()) return null;
    return orderRepo.cancelOrder(orderId, reason);
  },

  async updateOrderStatus(orderId: string, status: orderRepo.OrderStatus): Promise<orderRepo.Order | null> {
    if (isDemoMode()) return null;
    return orderRepo.updateOrderStatus(orderId, status);
  },

  // --------------------------------------------------------------------------
  // 处方
  // --------------------------------------------------------------------------

  /**
   * 处方列表。真实模式按就诊取（getPrescriptionsByVisit），并补充所属患者信息。
   * 演示模式直接读 PRESCRIPTION_STORE（与既有工具一致）。
   */
  async getPrescriptions(patientId: string, encounterId?: string): Promise<MockPrescription[]> {
    if (isDemoMode()) {
      let list = PRESCRIPTION_STORE.filter((r) => r.patientId === patientId);
      if (encounterId) list = list.filter((r) => r.encounterId === encounterId);
      return list;
    }
    // 真实模式：先定位患者，再取其就诊下的处方。
    const me = await this.resolvePatientId(patientId);
    if (!me) return [];
    const visitIds = encounterId ? [encounterId] : (await visitRepo.getVisitsByPatient(me)).map((v) => v.id);
    const result: MockPrescription[] = [];
    for (const vid of visitIds) {
      const rxs = await prescriptionRepo.getPrescriptionsByVisit(vid, { limit: 50 });
      for (const rx of rxs) {
        result.push({
          prescriptionId: rx.id,
          patientId: me,
          encounterId: rx.visitId,
          prescriptionType: '西药',
          status: mapRxStatus(rx.status),
          items: rx.items.map((it) => ({
            drugName: it.drugName,
            specification: it.specification ?? '',
            dosage: it.dosage != null ? String(it.dosage) : '',
            frequency: it.frequency ?? '',
            days: it.daysSupply ?? 0,
            quantity: it.quantity ?? 0,
            usage: it.route ?? '',
          })),
          diagnosis: rx.counsel,
          doctorId: rx.prescriberId ?? '',
          doctorName: rx.prescriberId ? String(rx.prescriberId) : '医生',
          pharmacist: rx.reviewerId ? String(rx.reviewerId) : null,
          totalFee: rx.totalFee ?? 0,
          safetyCheckSummary: '',
          createdAt: rx.createdAt,
          auditedAt: rx.status === 'pending_review' ? null : rx.updatedAt,
          auditComment: rx.auditResult.comment ? String(rx.auditResult.comment) : null,
        });
      }
    }
    return result;
  },

  async getPrescriptionById(id: string): Promise<prescriptionRepo.Prescription | null> {
    if (isDemoMode()) return null;
    return prescriptionRepo.getPrescriptionById(id);
  },

  async createPrescription(input: prescriptionRepo.PrescriptionCreateInput): Promise<prescriptionRepo.Prescription> {
    if (isDemoMode()) {
      // 演示模式：写入既有内存处方存储，使 getPrescriptionList / prescriptionAudit 闭环。
      const items: PrescriptionItem[] = input.items.map((it) => ({
        drugName: it.drugName,
        specification: it.specification ?? '',
        dosage: it.dosage != null ? String(it.dosage) : '',
        frequency: it.frequency ?? '',
        days: it.daysSupply ?? 0,
        quantity: it.quantity ?? 0,
        usage: it.route ?? '',
      }));
      const record: MockPrescription = {
        prescriptionId: `RX${Date.now()}`,
        patientId: '',
        encounterId: input.visitId,
        prescriptionType: '西药',
        status: '待审核',
        items,
        diagnosis: input.counsel ?? null,
        doctorId: input.prescriberId ?? '',
        doctorName: '医生',
        pharmacist: null,
        totalFee: 0,
        safetyCheckSummary: '',
        createdAt: new Date().toISOString(),
        auditedAt: null,
        auditComment: null,
      };
      PRESCRIPTION_STORE.push(record);
      // 演示仓库返回结构与真实 Prescription 对齐，仅作占位。
      return {
        id: record.prescriptionId,
        visitId: input.visitId,
        rxNo: record.prescriptionId,
        prescriberId: input.prescriberId ?? null,
        status: 'pending_review',
        reviewerId: null,
        reviewLevel: null,
        riskLevel: null,
        auditResult: {},
        counsel: input.counsel ?? null,
        totalFee: 0,
        items: [],
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
      };
    }
    return prescriptionRepo.createPrescription(input);
  },

  async auditPrescription(
    id: string,
    decision: 'approved' | 'rejected',
    reviewerId: string,
    auditResult: Record<string, unknown>,
  ): Promise<prescriptionRepo.Prescription | null> {
    if (isDemoMode()) return null;
    return prescriptionRepo.auditPrescription(id, decision, reviewerId, auditResult);
  },

  // --------------------------------------------------------------------------
  // 病历文书
  // --------------------------------------------------------------------------

  async getMedicalRecords(patientId: string, encounterId?: string): Promise<MockMedicalRecord[]> {
    if (isDemoMode()) {
      let list = [...MOCK_MEDICAL_RECORDS, ...MEM_MEDICAL_RECORDS].filter(
        (r) => r.patientId === patientId,
      );
      if (encounterId) list = list.filter((r) => r.encounterId === encounterId);
      return list;
    }
    if (encounterId) {
      const rows = await medicalRecordRepo.getMedicalRecordsByVisit(encounterId, { limit: 50 });
      return rows.map((r) => ({
        recordId: r.id,
        encounterId: r.visitId,
        patientId,
        recordType: r.title,
        title: r.title,
        content: r.plainText ?? '',
        status: mapEmrStatus(r.status),
        createdAt: r.createdAt,
        createdBy: r.authorId ? String(r.authorId) : '医生',
        confirmedAt: r.signedAt,
        confirmedBy: r.signedBy,
        qcScore: r.qualityScore,
      }));
    }
    // 按患者：先取就诊，再合并各就诊病历
    const me = await this.resolvePatientId(patientId);
    if (!me) return [];
    const visits = await visitRepo.getVisitsByPatient(me, { limit: 50 });
    const out: MockMedicalRecord[] = [];
    for (const v of visits) {
      const rows = await medicalRecordRepo.getMedicalRecordsByVisit(v.id, { limit: 50 });
      out.push(
        ...rows.map((r) => ({
          recordId: r.id,
          encounterId: r.visitId,
          patientId: me,
          recordType: r.title,
          title: r.title,
          content: r.plainText ?? '',
          status: mapEmrStatus(r.status),
          createdAt: r.createdAt,
          createdBy: r.authorId ? String(r.authorId) : '医生',
          confirmedAt: r.signedAt,
          confirmedBy: r.signedBy,
          qcScore: r.qualityScore,
        })),
      );
    }
    return out;
  },

  async createMedicalRecord(input: medicalRecordRepo.MedicalRecordCreateInput): Promise<medicalRecordRepo.MedicalRecord> {
    if (isDemoMode()) {
      MEM_MEDICAL_RECORDS.push({
        recordId: `R${Date.now()}`,
        encounterId: input.visitId,
        patientId: '',
        recordType: input.recordType,
        title: input.title,
        content: input.plainText ?? '',
        status: '草稿',
        createdAt: new Date().toISOString(),
        createdBy: input.authorId ? String(input.authorId) : '医生',
        confirmedAt: null,
        confirmedBy: null,
        qcScore: null,
      });
      // 占位返回（演示模式工具不消费此结构）
      return {
        id: `R${Date.now()}`,
        visitId: input.visitId,
        recordType: input.recordType,
        title: input.title,
        content: input.content,
        plainText: input.plainText ?? null,
        authorId: input.authorId ?? null,
        aiGenerated: input.aiGenerated ?? false,
        aiModel: input.aiModel ?? null,
        status: 'draft',
        qualityScore: null,
        qualityIssues: [],
        signedAt: null,
        signedBy: null,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return medicalRecordRepo.createMedicalRecord(input);
  },

  // --------------------------------------------------------------------------
  // 检验结果
  // --------------------------------------------------------------------------

  async getLabReports(patientId: string, encounterId?: string): Promise<MockLabReport[]> {
    if (isDemoMode()) {
      let list = MOCK_LAB_REPORTS.filter((r) => r.patientId === patientId);
      if (encounterId) list = list.filter((r) => r.encounterId === encounterId);
      return list;
    }
    const me = await this.resolvePatientId(patientId);
    if (!me) return [];
    const rows = encounterId
      ? await labResultRepo.getLabResultsByVisit(encounterId, { limit: 500 })
      : await labResultRepo.getLabResultsByPatient(me, { limit: 500 });

    // 把扁平的检验明细按 panelName 聚合成报告
    const byPanel = new Map<string, MockLabReport>();
    for (const r of rows) {
      const key = r.reportNo ?? r.panelName ?? r.id;
      if (!byPanel.has(key)) {
        byPanel.set(key, {
          reportId: r.reportNo ?? r.id,
          patientId: me,
          encounterId: r.visitId,
          testName: r.panelName ?? '检验',
          testCategory: r.panelName ?? '检验',
          specimen: r.specimen ?? '',
          collectedAt: r.resultTime ?? r.createdAt,
          reportedAt: r.resultTime ?? r.createdAt,
          reportingDoctor: '检验科',
          status: '已审核',
          hasCriticalValue: false,
          items: [],
          reportNotes: null,
        });
      }
      const rep = byPanel.get(key)!;
      if (r.isCritical) rep.hasCriticalValue = true;
      const flagText = r.abnormalFlag === 'H' ? '偏高' : r.abnormalFlag === 'L' ? '偏低' : '正常';
      rep.items.push({
        itemName: r.itemName,
        result: r.value ?? '',
        unit: r.unit,
        referenceRange:
          r.refLow != null && r.refHigh != null ? `${r.refLow}-${r.refHigh}` : null,
        abnormalFlag: r.isCritical
          ? r.abnormalFlag === 'H'
            ? '危急高'
            : r.abnormalFlag === 'L'
              ? '危急低'
              : '正常'
          : (flagText as MockLabReport['items'][number]['abnormalFlag']),
      });
    }
    return Array.from(byPanel.values());
  },

  async getCriticalLabResults(patientId?: string): Promise<labResultRepo.LabResult[]> {
    if (isDemoMode()) return [];
    return labResultRepo.getCriticalLabResults(patientId, 50);
  },

  /**
   * 影像报告。演示模式走 MOCK_IMAGE_REPORTS；真实模式暂无 imagingReportRepo，
   * 先按 imaging 类医嘱生成报告壳（检查所见/结论如实标注"待PACS回传归档"，不编造诊断）。
   */
  async getImageReports(patientId: string, encounterId?: string): Promise<MockImageReport[]> {
    if (isDemoMode()) {
      let list = MOCK_IMAGE_REPORTS.filter((r) => r.patientId === patientId);
      if (encounterId) list = list.filter((r) => r.encounterId === encounterId);
      return list;
    }
    const me = await this.resolvePatientId(patientId);
    if (!me) return [];
    const rows = encounterId
      ? await orderRepo.getOrdersByVisit(encounterId, { limit: 100 })
      : await orderRepo.getOrdersByPatient(me, { limit: 100 });
    return rows
      .filter((o) => o.orderType === 'imaging')
      .map((o) => ({
        reportId: o.id,
        patientId: me,
        encounterId: o.visitId,
        examType: '其他',
        examSite: o.content,
        examDate: toDateOnly(o.startAt) ?? '',
        reportDate: toDateOnly(o.updatedAt) ?? '',
        modality: '',
        finding: '影像报告待PACS/RIS回传归档，暂无结构化检查所见。',
        diagnosis: '影像诊断待报告医师出具。',
        reportingDoctor: o.doctorId ? String(o.doctorId) : '',
        reviewingDoctor: null,
        status: o.status === 'executed' ? '已审核' : '初步报告',
        hasImages: false,
        dicomRef: null,
        keyFindings: [],
      }));
  },

  // --------------------------------------------------------------------------
  // 药品目录
  // --------------------------------------------------------------------------

  async searchDrugs(keyword: string, limit = 20): Promise<drugRepo.Drug[]> {
    if (isDemoMode()) return [];
    return drugRepo.searchDrugs(keyword, limit);
  },

  async getDrugByCode(code: string): Promise<drugRepo.Drug | null> {
    if (isDemoMode()) return null;
    return drugRepo.getDrugByCode(code);
  },

  /**
   * 药物相互作用规则表（静态临床知识库，非按患者变化的记录型数据）。
   * 演示/真实模式下均返回该规则表供 CDS 计算；真实模式后续可替换为 drugRepo.interactions 聚合。
   */
  getDrugInteractionRules(): MockDrugInteraction[] {
    return MOCK_DRUG_INTERACTIONS;
  },

  // --------------------------------------------------------------------------
  // 内部辅助：把工具传入的 patientId（可能是 UUID 或病历号）解析为数据库主键
  // --------------------------------------------------------------------------

  async resolvePatientId(patientId: string): Promise<string | null> {
    const byId = await patientRepo.getPatientById(patientId);
    if (byId) return byId.id;
    const byMrn = await patientRepo.getPatientByMrn(patientId);
    return byMrn?.id ?? null;
  },
};

export type ClinicalData = typeof clinicalData;
