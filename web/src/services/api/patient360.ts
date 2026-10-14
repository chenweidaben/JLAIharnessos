/**
 * 健澜科技 jlmedaios - 患者360综合时间线 API
 *
 * 复用既有聚合接口 GET /patients/:id/360（mock 模式走 web/src/mock/patient360），
 * 前端将「基本信息 / 在院状态 / 医嘱 / 检验 / 病历 / 费用」按时间倒序归一化为统一时间线事件。
 * 当前聚合缺「病情变化 / 费用流水」明细类别时，补齐确定性演示行（demo: true），
 * 待 BFF 对应聚合端点补齐后删除对应 mock 分支即可，页面无需改动。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { fetchPatient360 } from './patient';

/* ------------------------------ 视图模型 ------------------------------ */

export type TimelineCategory =
  | 'admission' // 入院
  | 'condition' // 病情变化
  | 'order' // 医嘱下达
  | 'lab' // 检验结果
  | 'document' // 病历书写
  | 'cost'; // 费用发生

export interface TimelineEvent {
  id: string;
  category: TimelineCategory;
  /** ISO 时间 */
  time: string;
  /** 标题，如「医嘱下达 · 阿司匹林肠溶片 100mg」 */
  title: string;
  /** 补充描述（异常指标摘要 / 主诉等） */
  description?: string;
  /** 经办人：开嘱医生 / 检验技师 / 书写医师 */
  author?: string;
  /** 右侧 meta：金额 / 状态 Tag 文案 */
  meta?: string;
  /** mock 演示行标记（聚合缺该类别明细时由前端补齐） */
  demo?: boolean;
}

export interface Patient360Summary {
  patientId: string;
  patientNo: string;
  name: string;
  genderText: string;
  age: number;
  bedNo?: string;
  deptName?: string;
  diagnosis?: string;
  encounterNo?: string;
  /** 是否在院（存在进行中的住院就诊） */
  inHospital: boolean;
}

export interface Patient360Metrics {
  /** 住院天数（在院就诊开始日至今） */
  hospitalDays: number;
  /** 累计费用（元）；聚合无 billing 明细时为演示估值 */
  totalCost: number;
  /** 未审 / 待执行医嘱数 */
  pendingOrders: number;
  /** 指标是否来自演示估值 */
  totalCostDemo: boolean;
  hospitalDaysDemo: boolean;
}

export interface Patient360TimelineView {
  summary: Patient360Summary;
  events: TimelineEvent[];
  metrics: Patient360Metrics;
}

/* --------------------------- BFF/历史数据兼容层 --------------------------- */
/* 前端历史视图模型字段为 labReports/documents/imagings；
   BFF 聚合器（src/bff/aggregators/patient360Aggregator）字段为
   labResults/medicalRecords/imagingReports/billing。此处两种形态均兼容读取。 */

interface RawEncounter {
  id?: string;
  encounterNo?: string;
  type?: string;
  deptName?: string;
  doctorName?: string;
  startTime?: string;
  chiefComplaint?: string;
  status?: string;
}

interface RawOrder {
  id?: string;
  category?: string;
  content?: string;
  dosage?: string;
  frequency?: string;
  startDate?: string;
  doctorName?: string;
  status?: string;
  priority?: string;
}

interface RawLabItem {
  name?: string;
  value?: number | string;
  unit?: string;
  flag?: string;
}

interface RawLab {
  id?: string;
  category?: string;
  reportNo?: string;
  reportTime?: string;
  status?: string;
  reporter?: string;
  items?: RawLabItem[];
}

interface RawDoc {
  id?: string;
  docType?: string;
  title?: string;
  authorName?: string;
  author?: string;
  recordTime?: string;
  createdAt?: string;
  status?: string;
  summary?: string;
}

interface RawBilling {
  totalCost?: number;
}

type Raw360 = Record<string, unknown> & {
  patient?: {
    id?: string;
    patientNo?: string;
    name?: string;
    gender?: string;
    age?: number;
    bedNo?: string;
    deptName?: string;
    diagnosis?: string;
  };
  encounters?: RawEncounter[];
  orders?: RawOrder[];
  labReports?: RawLab[];
  labResults?: RawLab[];
  documents?: RawDoc[];
  medicalRecords?: RawDoc[];
  billing?: RawBilling;
};

/* ------------------------------ 归一化 ------------------------------ */

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR).toISOString();

const GENDER_TEXT: Record<string, string> = {
  male: '男',
  female: '女',
  M: '男',
  F: '女',
};

const ORDER_STATUS_TEXT: Record<string, string> = {
  active: '执行中',
  stopped: '已停止',
  completed: '已完成',
  pending: '待审核',
};

/** 由患者号做确定性伪随机，保证演示估值每次打开一致 */
function seededCost(patientNo: string): number {
  let h = 2166136261;
  for (let i = 0; i < patientNo.length; i += 1) {
    h ^= patientNo.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 8600 + Math.abs(h % 21400); // 8600 ~ 30000
}

function abnormalSummary(items?: RawLabItem[]): string | undefined {
  if (!items || items.length === 0) return undefined;
  const bad = items.filter((it) => it.flag === 'high' || it.flag === 'low' || it.flag === 'critical');
  if (bad.length === 0) return '全部指标在参考范围内';
  return bad
    .slice(0, 3)
    .map((it) => `${it.name} ${it.value}${it.unit ?? ''}${it.flag === 'high' ? ' ↑' : it.flag === 'low' ? ' ↓' : ' ⚠'}`)
    .join(' · ');
}

/**
 * 加载患者360综合时间线：概要 + 倒序事件 + 关键指标
 */
export async function loadPatient360Timeline(patientId: string): Promise<Patient360TimelineView> {
  const raw = (await fetchPatient360(patientId)) as unknown as Raw360;
  const p = raw.patient ?? {};
  const patientNo = p.patientNo ?? p.id ?? patientId;

  const encounters = raw.encounters ?? [];
  const orders = raw.orders ?? [];
  const labs = raw.labReports ?? raw.labResults ?? [];
  const docs = raw.documents ?? raw.medicalRecords ?? [];
  const billing = raw.billing;

  const ongoing = encounters.find((e) => e.status === 'ongoing' && (e.type ?? 'inpatient') === 'inpatient');

  const events: TimelineEvent[] = [];

  /* 1. 入院 */
  if (ongoing?.startTime) {
    events.push({
      id: 'evt-admission',
      category: 'admission',
      time: ongoing.startTime,
      title: `办理入院 · ${ongoing.deptName ?? p.deptName ?? ''}`,
      description: ongoing.chiefComplaint ? `主诉：${ongoing.chiefComplaint}` : undefined,
      author: ongoing.doctorName,
      meta: ongoing.encounterNo,
    });
  }

  /* 2. 医嘱下达 */
  for (const o of orders) {
    events.push({
      id: `evt-order-${o.id ?? events.length}`,
      category: 'order',
      time: o.startDate ?? hoursAgo(24),
      title: `医嘱下达 · ${o.content ?? '未命名医嘱'}`,
      description: [o.dosage, o.frequency].filter(Boolean).join(' · ') || undefined,
      author: o.doctorName,
      meta: ORDER_STATUS_TEXT[o.status ?? ''] ?? o.status,
    });
  }

  /* 3. 检验结果 */
  for (const r of labs) {
    events.push({
      id: `evt-lab-${r.id ?? events.length}`,
      category: 'lab',
      time: r.reportTime ?? hoursAgo(12),
      title: `检验报告 · ${r.category ?? '检验'}`,
      description: abnormalSummary(r.items),
      author: r.reporter,
      meta: r.status === 'critical' ? '危急值' : r.status === 'final' ? '已审核' : r.status,
    });
  }

  /* 4. 病历书写 */
  for (const d of docs) {
    events.push({
      id: `evt-doc-${d.id ?? events.length}`,
      category: 'document',
      time: d.recordTime ?? d.createdAt ?? hoursAgo(20),
      title: `病历书写 · ${d.title ?? '未命名文书'}`,
      description: d.summary,
      author: d.authorName ?? d.author,
      meta: d.status === 'audited' ? '已质控' : d.status === 'signed' ? '已签名' : d.status === 'draft' ? '草稿' : undefined,
    });
  }

  /* 5. 病情变化（聚合暂无该类别明细 → 演示行） */
  events.push({
    id: 'evt-condition-demo',
    category: 'condition',
    time: hoursAgo(12),
    title: '病情变化 · 生命体征趋稳',
    description: '患者神志清楚，症状较前缓解，继续当前治疗方案，护理级别与饮食按医嘱执行。',
    author: '陈*（住院医师）',
    demo: true,
  });

  /* 6. 费用发生（聚合暂无费用流水 → 演示行；有 billing 总额时给真实金额提示） */
  const costEstimate = billing?.totalCost ?? seededCost(patientNo);
  events.push({
    id: 'evt-cost-demo',
    category: 'cost',
    time: hoursAgo(6),
    title: '住院费用发生 · 床位 / 药品 / 检查汇总',
    description: billing ? undefined : '演示行：费用流水聚合端点接入后替换为真实明细',
    author: '住院处',
    meta: `¥ ${costEstimate.toLocaleString('zh-CN')}`,
    demo: !billing,
  });

  /* 倒序：最新在前 */
  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  /* ------------------------------ 指标 ------------------------------ */
  let hospitalDays = 0;
  let hospitalDaysDemo = false;
  if (ongoing?.startTime) {
    hospitalDays = Math.max(1, Math.ceil((Date.now() - new Date(ongoing.startTime).getTime()) / DAY));
  } else {
    hospitalDays = 5;
    hospitalDaysDemo = true;
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending').length;

  return {
    summary: {
      patientId: p.id ?? patientId,
      patientNo,
      name: p.name ?? '未命名',
      genderText: GENDER_TEXT[p.gender ?? ''] ?? p.gender ?? '—',
      age: p.age ?? 0,
      bedNo: p.bedNo,
      deptName: p.deptName,
      diagnosis: p.diagnosis,
      encounterNo: ongoing?.encounterNo,
      inHospital: Boolean(ongoing),
    },
    events,
    metrics: {
      hospitalDays,
      totalCost: costEstimate,
      pendingOrders,
      totalCostDemo: !billing,
      hospitalDaysDemo,
    },
  };
}
