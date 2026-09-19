/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 测试数据工厂：生成符合医疗业务场景的可信测试数据
 * 所有工厂函数均支持 partial 覆盖，便于定制断言场景
 */
import type { Patient, Patient360, Encounter, VitalSign } from '@/types/patient';
import type {
  LabResultItem,
  LabReport,
  MedicalOrder,
  Prescription,
  TimelineEvent,
  Alert,
} from '@/types/medical';
import type { StatCardData, TodoItem, Notification, DashboardData } from '@/types/dashboard';
import type { Conversation, ChatMessage } from '@/types/chat';
import type { AuthTokens } from '@/types/user';
import type { Gender, MedicalLevel } from '@/types/common';

let seq = 0;
function nextId(prefix = 'id'): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

/* ---------------- 用户 / 认证 ---------------- */
export function createAuthTokens(overrides?: Partial<AuthTokens>): AuthTokens {
  return {
    accessToken: 'jt-test-access-token',
    refreshToken: 'jr-test-refresh-token',
    expiresIn: 7200,
    ...overrides,
  };
}

/* ---------------- 患者 ---------------- */
export function createPatient(overrides?: Partial<Patient>): Patient {
  const id = nextId('p');
  return {
    id,
    patientNo: `ZY${Date.now()}${id.slice(-4)}`,
    name: '张建国',
    gender: 'male',
    age: 58,
    birthDate: '1968-03-15',
    idCardMasked: '3301**********1234',
    phoneMasked: '138****5678',
    address: '浙江省杭州市西湖区文三路 100 号',
    bedNo: '12-3',
    diagnosis: '2型糖尿病',
    deptName: '内分泌科',
    careLevel: 'first',
    allergies: ['青霉素'],
    ...overrides,
  };
}

export function createEncounter(overrides?: Partial<Encounter>): Encounter {
  const id = nextId('enc');
  return {
    id,
    patientId: overrides?.patientId ?? 'p-1',
    encounterNo: `ENC${Date.now()}`,
    type: 'inpatient',
    deptName: '内分泌科',
    doctorName: '李医生',
    startTime: '2026-09-15T08:00:00+08:00',
    chiefComplaint: '口干多饮多尿 10 年，加重 1 周',
    status: 'ongoing',
    ...overrides,
  };
}

export function createVitalSign(overrides?: Partial<VitalSign>): VitalSign {
  return {
    id: nextId('vs'),
    encounterId: 'enc-1',
    measureTime: '2026-09-16T08:00:00+08:00',
    temperature: 36.5,
    heartRate: 78,
    respiration: 16,
    systolic: 128,
    diastolic: 82,
    spo2: 98,
    ...overrides,
  };
}

export function createPatient360(overrides?: Partial<Patient360>): Patient360 {
  const patient = createPatient(overrides?.patient ? overrides.patient : undefined);
  return {
    encounters: [createEncounter()],
    vitalSigns: [createVitalSign()],
    alertCount: 0,
    labReports: [],
    orders: [],
    documents: [],
    imagings: [],
    ...overrides,
    patient,
  };
}

/* ---------------- 检验 / 检查 / 医嘱 / 处方 ---------------- */
export function createLabResultItem(overrides?: Partial<LabResultItem>): LabResultItem {
  return {
    id: nextId('lab'),
    reportId: 'rpt-1',
    itemCode: 'GLU',
    itemName: '空腹血糖',
    value: '8.6',
    unit: 'mmol/L',
    refRange: '3.9-6.1',
    level: 'abnormal',
    sampleTime: '2026-09-16T07:30:00+08:00',
    ...overrides,
  };
}

export function createLabReport(overrides?: Partial<LabReport>): LabReport {
  return {
    id: nextId('rpt'),
    patientId: 'p-1',
    reportNo: 'L20260916001',
    reportName: '生化全套',
    reportTime: '2026-09-16T09:00:00+08:00',
    items: [createLabResultItem()],
    hasCritical: false,
    ...overrides,
  };
}

export function createOrder(overrides?: Partial<MedicalOrder>): MedicalOrder {
  return {
    id: nextId('ord'),
    patientId: 'p-1',
    orderNo: 'ORD001',
    type: 'drug',
    name: '二甲双胍片 0.5g po bid',
    dosage: '0.5g',
    frequency: 'bid',
    doctorName: '李医生',
    status: 'executing',
    orderTime: '2026-09-15T10:00:00+08:00',
    ...overrides,
  };
}

export function createPrescription(overrides?: Partial<Prescription>): Prescription {
  return {
    id: nextId('rx'),
    patientId: 'p-1',
    items: [
      { drugName: '二甲双胍片', spec: '0.5g*30片', dose: '0.5g', frequency: 'bid', days: 7 },
    ],
    doctorName: '李医生',
    status: 'draft',
    createdAt: '2026-09-16T10:00:00+08:00',
    ...overrides,
  };
}

export function createTimelineEvent(overrides?: Partial<TimelineEvent>): TimelineEvent {
  return {
    id: nextId('tl'),
    time: '2026-09-16T08:00:00+08:00',
    type: 'order',
    title: '开具二甲双胍片',
    description: '0.5g po bid',
    level: 'normal',
    ...overrides,
  };
}

export function createAlert(overrides?: Partial<Alert>): Alert {
  return {
    id: nextId('alt'),
    type: 'critical-value',
    level: 'critical',
    title: '危急值告警',
    content: '血钾 6.8 mmol/L，超出危急值上限',
    patientId: 'p-1',
    createdAt: '2026-09-16T08:15:00+08:00',
    acknowledged: false,
    ...overrides,
  };
}

/* ---------------- 对话 ---------------- */
export function createConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: nextId('conv'),
    title: '糖尿病管理咨询',
    patientId: 'p-1',
    lastMessageAt: '2026-09-16T10:00:00+08:00',
    messageCount: 5,
    createdAt: '2026-09-16T09:00:00+08:00',
    ...overrides,
  };
}

export function createMessage(overrides?: Partial<ChatMessage>): ChatMessage {
  return {
    id: nextId('msg'),
    conversationId: 'conv-1',
    role: 'user',
    content: '患者最近空腹血糖偏高怎么办？',
    status: 'done',
    createdAt: '2026-09-16T10:00:00+08:00',
    ...overrides,
  };
}

/* ---------------- 工作台 ---------------- */
export function createStatCard(overrides?: Partial<StatCardData>): StatCardData {
  return {
    key: nextId('stat'),
    title: '今日门诊量',
    value: 326,
    unit: '人次',
    icon: '🏥',
    trend: 5.2,
    trendLabel: '较昨日',
    ...overrides,
  };
}

export function createTodo(overrides?: Partial<TodoItem>): TodoItem {
  return {
    id: nextId('todo'),
    type: 'prescription',
    title: '处方待审核',
    patientName: '张建国',
    bedNumber: '12-3',
    department: '内分泌科',
    priority: 'high',
    deadline: '2026-09-16T12:00:00+08:00',
    done: false,
    createdAt: '2026-09-16T08:00:00+08:00',
    ...overrides,
  };
}

export function createNotification(overrides?: Partial<Notification>): Notification {
  return {
    id: nextId('ntf'),
    type: 'critical_alert',
    title: '危急值通知',
    content: '患者张建国血钾危急值',
    time: '2026-09-16T08:15:00+08:00',
    read: false,
    ...overrides,
  };
}

export function createDashboardData(overrides?: Partial<DashboardData>): DashboardData {
  return {
    stats: [createStatCard()],
    visitTrend: [],
    departmentLoad: [],
    waitingTimes: [],
    todos: [createTodo()],
    notifications: [createNotification()],
    announcements: [],
    doctorProfile: {
      name: '李医生',
      title: '副主任医师',
      department: '内分泌科',
      shifts: { morning: 'morning', afternoon: 'off', night: 'off' },
      monthlyStats: { outpatientVisits: 320, surgeries: 12, medicalRecords: 280 },
      performance: { recordQualityRate: 96.5, patientSatisfaction: 94, avgStayDays: 6.2 },
    },
    quickAccess: [],
    recentPatients: [],
    ...overrides,
  };
}

/* ---------------- 辅助 ---------------- */
export function resetSeq(): void {
  seq = 0;
}

export function createGender(): Gender {
  return Math.random() > 0.5 ? 'male' : 'female';
}

export function createLevel(): MedicalLevel {
  const levels: MedicalLevel[] = ['critical', 'abnormal', 'normal', 'pending'];
  return levels[Math.floor(Math.random() * levels.length)];
}
