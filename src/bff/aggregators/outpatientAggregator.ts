/**
 * 健澜科技 jlmedaios - 门诊聚合器
 *
 * 串联 iam/clinical 各 Repository，为门诊工作台提供：
 *  候诊队列、就诊快照（encounter bundle）、问诊保存、诊断 CRUD、
 *  医嘱开立/撤销、处方审方与创建/药师审核、病历保存/签名、统计。
 *
 * 所有交易数据真实读写 PostgreSQL；服务端做权威处方审核与 CDS。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '@/db/pool';
import {
  getPatientById,
  type Patient,
} from '@/db/repositories/patientRepo';
import {
  getVisitById,
  updateVisitConsultation,
  type Visit,
} from '@/db/repositories/visitRepo';
import {
  createOrder,
  cancelOrder,
  getOrdersByVisit,
  type OrderType,
  type OrderPriority,
} from '@/db/repositories/orderRepo';
import {
  createPrescription,
  auditPrescription,
  getPrescriptionsByVisit,
  type PrescriptionItem,
} from '@/db/repositories/prescriptionRepo';
import {
  createMedicalRecord,
  getMedicalRecordsByVisit,
  updateMedicalRecordStatus,
  updateMedicalRecordContent,
} from '@/db/repositories/medicalRecordRepo';
import {
  createDiagnosis,
  deleteDiagnosis,
  getDiagnosesByVisit,
  updateDiagnosisConfirmed,
  type DiagnosisKind,
} from '@/db/repositories/diagnosisRepo';
import {
  getDrugByCode,
  searchDrugs,
  type Drug,
} from '@/db/repositories/drugRepo';
import { getLabResultsByPatient } from '@/db/repositories/labResultRepo';

/* ------------------------------------------------------------------ */
/* 通用映射                                                            */
/* ------------------------------------------------------------------ */

export function calcAge(birthDate: string | null): number {
  if (!birthDate) return 0;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function mapGender(g: string): 'male' | 'female' | 'unknown' {
  if (g === '男') return 'male';
  if (g === '女') return 'female';
  return 'unknown';
}

/** 从 jsonb 过敏数组提取物质名称 */
function mapAllergies(list: Array<Record<string, unknown>>): string[] {
  return list.map((a) =>
    String(a.substance ?? a.drug ?? a.allergen ?? a.name ?? ''),
  ).filter(Boolean);
}

/** 从既往史提取慢性病 */
function mapChronic(list: Array<Record<string, unknown>>): string[] {
  return list.map((h) => String(h.disease ?? h.name ?? h.diagnosis ?? '')).filter(Boolean);
}

/** 库存数量 */
async function getStock(drugId: string): Promise<number> {
  const db = getDb();
  const rows = await db`
    SELECT COALESCE(SUM(quantity),0)::float AS qty
    FROM clinical.drug_inventory WHERE drug_id = ${drugId}
  `;
  return Number(rows[0]?.qty ?? 0);
}

/** DB Drug → 前端 DrugInfo */
export async function mapDrugInfo(d: Drug) {
  const isAntibiotic = /青霉素|头孢|阿莫西林|呋辛|抗菌|抗生素/.test(d.genericName);
  return {
    drugId: d.drugCode,
    genericName: d.brandName ?? d.genericName,
    pinyin: '',
    spec: d.specification,
    dosageForm: d.dosageForm,
    manufacturer: d.manufacturer ?? '',
    unit: d.unit,
    price: d.price ?? 0,
    stock: await getStock(d.id),
    antibiotics: isAntibiotic,
    highRisk: d.controlled,
    pregnancyCategory: d.pregnancyCat ?? undefined,
  };
}

/** 患者简要视图 */
async function mapPatientBrief(p: Patient, full: boolean) {
  const allergies = mapAllergies(p.allergies);
  const chronic = mapChronic(p.pastHistory);
  const brief = {
    patientId: p.id,
    nameMasked: p.nameMasked,
    gender: mapGender(p.gender),
    age: calcAge(p.birthDate),
    birthday: p.birthDate ?? undefined,
    insurance: 'self' as const,
    allergies,
    chronicConditions: chronic,
    currentMedications: [] as string[],
  };
  if (!full) return brief;

  const labs = await getLabResultsByPatient(p.id, { limit: 8 });
  const recentLabs = labs
    .filter((l) => l.value !== null)
    .map((l) => ({
      itemName: l.itemName,
      value: l.value ?? '',
      unit: l.unit ?? '',
      refRange:
        l.refLow !== null && l.refHigh !== null ? `${l.refLow}-${l.refHigh}` : '',
      abnormal:
        l.isCritical ? 'critical' : l.abnormalFlag === 'H' ? 'high' : l.abnormalFlag === 'L' ? 'low' : undefined,
      reportDate: l.resultTime ?? l.createdAt,
    }));
  return { ...brief, recentLabs };
}

/* ------------------------------------------------------------------ */
/* 候诊队列                                                            */
/* ------------------------------------------------------------------ */

function mapQueueStatus(v: Visit): 'waiting' | 'in_consult' | 'visited' | 'passed' | 'stopped' {
  switch (v.status) {
    case 'discharged': return 'visited';
    case 'cancelled': return 'stopped';
    case 'transferred': return 'passed';
    default: return 'waiting';
  }
}

/**
 * 今日门诊候诊队列。
 * @param dept 科室名；dataScope=all 且 dept 为空时返回全院。
 */
export async function getWaitingQueue(dept: string | null): Promise<unknown[]> {
  const db = getDb();
  const rows = dept
    ? await db`
        SELECT id FROM clinical.visits
        WHERE visit_type IN ('outpatient','emergency')
          AND admit_at::date = CURRENT_DATE AND department = ${dept}
        ORDER BY admit_at ASC`
    : await db`
        SELECT id FROM clinical.visits
        WHERE visit_type IN ('outpatient','emergency')
          AND admit_at::date = CURRENT_DATE
        ORDER BY admit_at ASC`;

  const queue = [];
  let queueNo = 0;
  for (const r of rows) {
    const visit = await getVisitById(String(r.id));
    if (!visit) continue;
    queueNo++;
    const patient = await getPatientById(visit.patientId);
    if (!patient) continue;
    const brief = await mapPatientBrief(patient, false);
    const waitMinutes = Math.max(
      0,
      Math.round((Date.now() - new Date(visit.admitAt ?? visit.createdAt).getTime()) / 60000),
    );
    queue.push({
      encounterId: visit.id,
      queueNo,
      ticketNo: visit.visitNo,
      patient: brief,
      visitType: 'normal' as const,
      registerTime: visit.admitAt ?? visit.createdAt,
      status: mapQueueStatus(visit),
      doctorName: '',
      deptName: visit.department,
      chiefComplaint: visit.chiefComplaint ?? undefined,
      waitMinutes,
    });
  }
  return queue;
}

/* ------------------------------------------------------------------ */
/* 就诊快照 encounter bundle                                           */
/* ------------------------------------------------------------------ */

/** 医嘱 → OrderItem */
function mapOrder(o: Awaited<ReturnType<typeof getOrdersByVisit>>[number]) {
  const statusMap = {
    active: 'pending', executed: 'reported', audited: 'reported', cancelled: 'cancelled',
  } as const;
  return {
    orderId: o.id,
    kind: (['lab', 'imaging', 'treatment'].includes(o.orderType) ? o.orderType : 'lab') as 'lab' | 'imaging' | 'treatment',
    catalogId: String(o.detail.catalogId ?? ''),
    name: o.content,
    bodyPart: o.detail.bodyPart ? String(o.detail.bodyPart) : undefined,
    price: Number(o.detail.price ?? 0),
    status: statusMap[o.status],
    clinicalReason: String(o.detail.clinicalReason ?? ''),
    note: o.detail.note ? String(o.detail.note) : undefined,
    createdAt: o.createdAt,
  };
}

/** 诊断 → DiagnosisItem */
function mapDiagnosis(d: Awaited<ReturnType<typeof getDiagnosesByVisit>>[number]) {
  return {
    id: d.id, code: d.code ?? '', name: d.name,
    kind: d.kind, confirmed: d.confirmed, note: d.note ?? undefined,
  };
}

/** 处方 → 前端 Prescription */
async function mapPrescription(
  rx: Awaited<ReturnType<typeof getPrescriptionsByVisit>>[number],
) {
  const lines = [];
  let total = 0;
  for (const it of rx.items) {
    const drug = it.drugCode ? await getDrugByCode(it.drugCode) : null;
    const info = drug ? await mapDrugInfo(drug) : null;
    const subtotal = Number((it.quantity ?? 0) * (drug?.price ?? 0));
    total += subtotal;
    lines.push({
      lineId: it.id ?? `${rx.id}-${Math.random()}`,
      drug: info ?? {
        drugId: it.drugCode ?? '', genericName: it.drugName, pinyin: '',
        spec: it.specification ?? '', dosageForm: '', manufacturer: '', unit: '',
        price: 0, stock: 0, antibiotics: false, highRisk: false,
      },
      dose: it.dosage ?? 0,
      doseUnit: it.dosageUnit ?? '',
      frequency: it.frequency ?? 'tid',
      route: it.route ?? 'po',
      days: it.daysSupply ?? 0,
      quantity: it.quantity ?? 0,
      instruction: it.remark ?? '',
      subtotal,
    });
  }
  const warnings = Array.isArray(rx.auditResult.warnings)
    ? (rx.auditResult.warnings as unknown[])
    : [];
  return {
    prescriptionId: rx.id,
    type: 'western' as const,
    lines,
    warnings,
    totalFee: rx.totalFee ?? total,
    signed: true,
    status: rx.status,
    createdAt: rx.createdAt,
  };
}

/** 病历 → 前端 MedicalRecord */
function mapMedicalRecord(
  rec: Awaited<ReturnType<typeof getMedicalRecordsByVisit>>[number],
  visitId: string,
) {
  const c = rec.content;
  const content = {
    chiefComplaint: String(c.chiefComplaint ?? ''),
    presentIllness: String(c.presentIllness ?? ''),
    pastHistory: String(c.pastHistory ?? ''),
    physicalExam: String(c.physicalExam ?? ''),
    auxiliaryExam: String(c.auxiliaryExam ?? ''),
    diagnosis: String(c.diagnosis ?? ''),
    treatment: String(c.treatment ?? ''),
    healthEducation: String(c.healthEducation ?? ''),
  };
  return {
    recordId: rec.id,
    encounterId: visitId,
    content,
    qualityIssues: rec.qualityIssues ?? [],
    signed: rec.status === 'signed' || rec.status === 'archived',
    status: rec.status === 'draft' ? 'draft' : 'submitted',
    updatedAt: rec.updatedAt,
  };
}

/** 问诊记录 → ConsultationRecord */
function mapConsultation(v: Visit) {
  const d = v.consultationDetail ?? {};
  return {
    encounterId: v.id,
    chiefComplaint: v.chiefComplaint ?? '',
    presentIllness: (d.presentIllness ?? {}) as Record<string, string>,
    pastHistory: (d.pastHistory ?? {}) as Record<string, string>,
    physicalExam: (d.physicalExam ?? {}) as Record<string, string>,
    auxiliaryExams: Array.isArray(d.auxiliaryExams) ? d.auxiliaryExams : [],
    updatedAt: v.updatedAt,
  };
}

/** 计算 CDS 提醒（确定性规则） */
type MappedDiagnosis = ReturnType<typeof mapDiagnosis>;
type MappedOrder = ReturnType<typeof mapOrder>;
type MappedPrescription = Awaited<ReturnType<typeof mapPrescription>>;

function computeCds(
  patient: Patient,
  diagnoses: MappedDiagnosis[],
  orders: MappedOrder[],
  prescriptions: MappedPrescription[],
) {
  const reminders: unknown[] = [];
  const allergies = mapAllergies(patient.allergies);
  const chronic = mapChronic(patient.pastHistory);
  const push = (level: string, title: string, detail: string): void => {
    reminders.push({ level, title, detail });
  };

  if (allergies.length > 0) {
    push('warning', '过敏史提醒', `患者过敏：${allergies.join('、')}；开具相关药物前务必核对。`);
  }

  // 当前处方药品名聚合
  const drugNames = prescriptions.flatMap((p) => p.lines.map((l) => l.drug.genericName)).join(' ');
  const has = (re: RegExp): boolean => re.test(drugNames);
  if (has(/阿司匹林/) && has(/氯吡格雷/)) {
    push('warning', '双联抗血小板（DAPT）', '阿司匹林+氯吡格雷增加出血风险，请评估疗程并关注黑便/瘀斑。');
  }
  if ((has(/阿司匹林/) || has(/氯吡格雷/)) && (has(/华法林/) || has(/达比加群/))) {
    push('danger', '抗血小板 + 抗凝联用', '显著增加出血风险，须严格评估并监测凝血。');
  }
  if (chronic.includes('2 型糖尿病') && orders.some((o) => o.kind === 'imaging' && /CT|造影/.test(o.name))) {
    push('warning', '造影前评估肾功能', '糖尿病患者使用碘造影剂前须查 eGFR 并充分水化。');
  }
  if (chronic.some((c2) => c2.includes('高血压')) && has(/布洛芬/)) {
    push('warning', 'NSAID 影响血压', '布洛芬可能升高血压、增加心血管事件风险，建议短期使用。');
  }
  if (diagnoses.length === 0) {
    push('info', '诊断待完善', '请至少添加并确认一个主要诊断。');
  }
  return reminders;
}

/** 完整就诊快照 */
export async function getEncounter(visitId: string): Promise<unknown> {
  const visit = await getVisitById(visitId);
  if (!visit) return null;
  const patient = await getPatientById(visit.patientId);
  if (!patient) return null;

  const [diagRows, orderRows, rxRows, recordRows] = await Promise.all([
    getDiagnosesByVisit(visitId),
    getOrdersByVisit(visitId),
    getPrescriptionsByVisit(visitId),
    getMedicalRecordsByVisit(visitId),
  ]);

  const diagnoses = diagRows.map(mapDiagnosis);
  const orders = orderRows.map(mapOrder);
  const prescriptions = [];
  for (const rx of rxRows) prescriptions.push(await mapPrescription(rx));

  // 当前用药（取最近处方药品）
  const currentMedications = Array.from(
    new Set(prescriptions.flatMap((p) => p.lines.map((l) => l.drug.genericName))),
  );
  const brief = await mapPatientBrief(patient, true);
  brief.currentMedications = currentMedications;

  const medicalRecord = recordRows.length > 0 ? mapMedicalRecord(recordRows[0], visitId) : null;
  const cdsReminders = computeCds(patient, diagnoses, orders, prescriptions);

  return {
    encounterId: visitId,
    patient: brief,
    consultation: mapConsultation(visit),
    diagnoses,
    orders,
    prescriptions,
    medicalRecord,
    cdsReminders,
  };
}

/* ------------------------------------------------------------------ */
/* 问诊保存                                                            */
/* ------------------------------------------------------------------ */

export async function saveConsultation(
  visitId: string,
  data: {
    chiefComplaint?: string;
    presentIllness?: Record<string, string>;
    pastHistory?: Record<string, string>;
    physicalExam?: Record<string, string>;
    auxiliaryExams?: unknown[];
  },
): Promise<unknown> {
  await updateVisitConsultation(visitId, {
    chiefComplaint: data.chiefComplaint,
    detail: {
      presentIllness: data.presentIllness ?? {},
      pastHistory: data.pastHistory ?? {},
      physicalExam: data.physicalExam ?? {},
      auxiliaryExams: data.auxiliaryExams ?? [],
    },
  });
  return getEncounter(visitId);
}

/* ------------------------------------------------------------------ */
/* 诊断 CRUD                                                           */
/* ------------------------------------------------------------------ */

export async function addDiagnosis(
  visitId: string,
  data: { code?: string; name: string; kind?: DiagnosisKind; doctorId?: string },
): Promise<unknown> {
  const visit = await getVisitById(visitId);
  if (!visit) return null;
  await createDiagnosis({
    visitId,
    patientId: visit.patientId,
    code: data.code ?? null,
    name: data.name,
    kind: data.kind ?? 'primary',
    doctorId: data.doctorId ?? null,
  });
  return getEncounter(visitId);
}

export async function removeDiagnosis(visitId: string, diagnosisId: string): Promise<unknown> {
  await deleteDiagnosis(diagnosisId);
  return getEncounter(visitId);
}

export async function confirmDiagnosis(
  visitId: string, diagnosisId: string, confirmed: boolean,
): Promise<unknown> {
  await updateDiagnosisConfirmed(diagnosisId, confirmed);
  return getEncounter(visitId);
}

/* ------------------------------------------------------------------ */
/* 医嘱                                                                */
/* ------------------------------------------------------------------ */

export async function addOrder(
  visitId: string,
  data: {
    kind: 'lab' | 'imaging' | 'treatment';
    catalogId: string; name: string; bodyPart?: string; price: number;
    clinicalReason: string; note?: string; priority?: OrderPriority; doctorId?: string;
  },
): Promise<unknown> {
  const visit = await getVisitById(visitId);
  if (!visit) return null;
  await createOrder({
    visitId,
    orderType: data.kind as OrderType,
    content: data.name,
    detail: {
      catalogId: data.catalogId,
      bodyPart: data.bodyPart ?? null,
      price: data.price,
      clinicalReason: data.clinicalReason,
      note: data.note ?? null,
    },
    priority: data.priority ?? 'routine',
    doctorId: data.doctorId ?? null,
  });
  return getEncounter(visitId);
}

export async function cancelVisitOrder(
  visitId: string, orderId: string, reason: string,
): Promise<unknown> {
  await cancelOrder(orderId, reason);
  return getEncounter(visitId);
}

/* ------------------------------------------------------------------ */
/* 处方审方（服务端权威）                                               */
/* ------------------------------------------------------------------ */

interface SubmitLine {
  drugId: string;
  dose: number; doseUnit: string; frequency: string; route: string;
  days: number; quantity: number; instruction: string; skinTest?: boolean;
}

function ruleWarn(title: string, detail: string, relatedDrug?: string) {
  return { level: 'warning', title, detail, relatedDrug };
}
function ruleDanger(title: string, detail: string, relatedDrug?: string) {
  return { level: 'danger', title, detail, relatedDrug };
}

/** 服务端处方审核：返回 warnings 与 riskLevel */
async function reviewPrescription(
  patient: Patient,
  lines: SubmitLine[],
): Promise<{ warnings: Record<string, unknown>[]; riskLevel: 'normal' | 'medium' | 'high' }> {
  const warnings: Record<string, unknown>[] = [];
  const drugs: Drug[] = [];
  for (const ln of lines) {
    const d = await getDrugByCode(ln.drugId);
    if (d) drugs.push(d);
  }
  const names = drugs.map((d) => d.genericName);
  const hasName = (re: RegExp): boolean => names.some((n) => re.test(n));

  // 1) 过敏
  for (const a of patient.allergies) {
    const substance = String(a.substance ?? a.drug ?? '');
    const hit = drugs.find((d) =>
      substance && (d.genericName.includes(substance) || substance.includes(d.genericName.slice(0, 2))),
    );
    if (hit) {
      warnings.push(ruleDanger('药物过敏', `患者对 ${substance} 过敏，禁用 ${hit.genericName}。`, hit.genericName));
    }
  }

  // 2) 皮试
  for (let i = 0; i < drugs.length; i++) {
    const d = drugs[i];
    if (/青霉素|头孢|阿莫西林|呋辛/.test(d.genericName) && !lines[i].skinTest) {
      warnings.push(ruleDanger('需先做皮试', `${d.genericName} 用药前须皮试并确认阴性。`, d.genericName));
    }
  }

  // 3) 相互作用
  if (hasName(/阿司匹林/) && hasName(/氯吡格雷/)) {
    warnings.push(ruleWarn('双联抗血小板', '阿司匹林+氯吡格雷为 DAPT，出血风险升高，需明确疗程。'));
  }
  if ((hasName(/阿司匹林/) || hasName(/氯吡格雷/)) && (hasName(/华法林/) || hasName(/达比加群/))) {
    warnings.push(ruleDanger('抗血小板+抗凝', '联用显著增加出血风险，须严密监测。'));
  }
  const statins = names.filter((n) => /他汀/.test(n));
  if (statins.length > 1) warnings.push(ruleWarn('重复同类药', `不建议同时使用 ${statins.join('、')}。`));
  if (hasName(/美托洛尔/) && hasName(/氨氯地平/) === false) {
    // no-op，保留扩展位
  }
  const nsaids = names.filter((n) => /布洛芬|双氯芬酸/.test(n));
  if (nsaids.length > 1) warnings.push(ruleWarn('重复 NSAID', '不建议联用两种非甾体抗炎药。'));

  // 4) 管制药 / 疗程
  for (let i = 0; i < drugs.length; i++) {
    if (drugs[i].controlled && lines[i].days > 14) {
      warnings.push(ruleWarn('管控药疗程偏长', `${drugs[i].genericName} 为管控药品，单次处方 ${lines[i].days} 天，请核对。`, drugs[i].genericName));
    }
  }

  const hasDanger = warnings.some((w) => w.level === 'danger');
  const hasWarning = warnings.some((w) => w.level === 'warning');
  return {
    warnings,
    riskLevel: hasDanger ? 'high' : hasWarning ? 'medium' : 'normal',
  };
}

/** 提交处方（医师签名 → pending_review） */
export async function submitPrescription(
  visitId: string,
  data: { lines: SubmitLine[]; counsel?: string; prescriberId?: string },
): Promise<unknown> {
  const visit = await getVisitById(visitId);
  if (!visit) return null;
  const patient = await getPatientById(visit.patientId);
  if (!patient) return null;

  const { warnings, riskLevel } = await reviewPrescription(patient, data.lines);

  const items: PrescriptionItem[] = [];
  for (const ln of data.lines) {
    const d = await getDrugByCode(ln.drugId);
    items.push({
      drugCode: ln.drugId,
      drugName: d ? d.brandName ?? d.genericName : ln.drugId,
      specification: d?.specification ?? null,
      dosage: ln.dose,
      dosageUnit: ln.doseUnit,
      frequency: ln.frequency,
      route: ln.route,
      daysSupply: ln.days,
      quantity: ln.quantity,
      quantityUnit: d?.unit ?? null,
      skinTest: Boolean(ln.skinTest),
      remark: ln.instruction,
    });
  }

  await createPrescription({
    visitId,
    prescriberId: data.prescriberId ?? null,
    items,
    counsel: data.counsel ?? null,
    riskLevel: ({ normal: 'pass', medium: 'warn', high: 'reject' } as const)[riskLevel],
    auditResult: { warnings, reviewedAt: new Date().toISOString(), source: 'server-review' },
  });
  return getEncounter(visitId);
}

/** 药师审核 */
export async function reviewRx(
  visitId: string, prescriptionId: string,
  data: { decision: 'approved' | 'rejected'; comment?: string; reviewerId: string },
): Promise<unknown> {
  await auditPrescription(prescriptionId, data.decision, data.reviewerId, {
    comment: data.comment ?? '',
    reviewedAt: new Date().toISOString(),
  });
  return getEncounter(visitId);
}

/* ------------------------------------------------------------------ */
/* 病历保存 / 签名                                                      */
/* ------------------------------------------------------------------ */

export async function saveRecord(
  visitId: string,
  data: { content: Record<string, string>; signed?: boolean; authorId?: string },
): Promise<unknown> {
  const existing = await getMedicalRecordsByVisit(visitId);
  if (existing.length === 0) {
    await createMedicalRecord({
      visitId,
      recordType: 'outpatient',
      title: '门诊病历',
      content: data.content,
      authorId: data.authorId ?? null,
    });
  } else {
    await updateMedicalRecordContent(existing[0].id, { content: data.content });
  }
  if (data.signed && existing.length > 0) {
    await updateMedicalRecordStatus(existing[0].id, 'signed', data.authorId);
  } else if (data.signed) {
    // 刚创建的记录需要重新取一次再签名
    const re = await getMedicalRecordsByVisit(visitId);
    if (re[0]) await updateMedicalRecordStatus(re[0].id, 'signed', data.authorId);
  }
  return getEncounter(visitId);
}

/* ------------------------------------------------------------------ */
/* 药品检索（DB）                                                       */
/* ------------------------------------------------------------------ */

export async function findDrugs(keyword: string): Promise<unknown[]> {
  const list = await searchDrugs(keyword, 20);
  return Promise.all(list.map(mapDrugInfo));
}

/* ------------------------------------------------------------------ */
/* 统计                                                                */
/* ------------------------------------------------------------------ */

export async function getOutpatientStats(dept: string): Promise<Record<string, number>> {
  const db = getDb();
  const today = await db`
    SELECT
      count(*) FILTER (WHERE admit_at::date = CURRENT_DATE) AS registered,
      count(*) FILTER (WHERE status='discharged' AND discharge_at::date = CURRENT_DATE) AS visited,
      count(*) FILTER (WHERE status='ongoing') AS waiting,
      COALESCE(AVG(EXTRACT(EPOCH FROM (now()-admit_at))/60) FILTER (WHERE status='ongoing'),0) AS avg_wait
    FROM clinical.visits WHERE department = ${dept}
  `;
  const month = await db`
    SELECT count(*) AS visits,
      COALESCE(AVG(total_fee),0) AS avg_fee
    FROM clinical.visits
    WHERE department = ${dept} AND date_trunc('month', admit_at) = date_trunc('month', now())
  `;
  const rxToday = await db`
    SELECT count(*) AS c FROM clinical.prescriptions pr
    JOIN clinical.visits v ON v.id = pr.visit_id
    WHERE v.department = ${dept} AND pr.created_at::date = CURRENT_DATE
  `;
  const ordToday = await db`
    SELECT count(*) AS c FROM clinical.orders o
    JOIN clinical.visits v ON v.id = o.visit_id
    WHERE v.department = ${dept} AND o.created_at::date = CURRENT_DATE
  `;
  const recMonth = await db`
    SELECT count(*) AS c FROM clinical.medical_records mr
    JOIN clinical.visits v ON v.id = mr.visit_id
    WHERE v.department = ${dept} AND date_trunc('month', mr.created_at) = date_trunc('month', now())
  `;
  const rxMonth = await db`
    SELECT count(*) AS c FROM clinical.prescriptions pr
    JOIN clinical.visits v ON v.id = pr.visit_id
    WHERE v.department = ${dept} AND date_trunc('month', pr.created_at) = date_trunc('month', now())
  `;

  const t = today[0];
  return {
    todayRegistered: Number(t.registered),
    todayVisited: Number(t.visited),
    todayWaiting: Number(t.waiting),
    todayPassed: 0,
    avgWaitMinutes: Math.round(Number(t.avg_wait)),
    avgVisitMinutes: 12,
    prescriptionCount: Number(rxToday[0].c),
    orderCount: Number(ordToday[0].c),
    monthVisits: Number(month[0].visits),
    monthPrescriptions: Number(rxMonth[0].c),
    monthRecords: Number(recMonth[0].c),
    avgPrescriptionFee: Math.round(Number(month[0].avg_fee) * 100) / 100,
  };
}
