/**
 * 健澜科技 jlmedaios - 患者端（小程序/演示）API（M3-Q）
 *
 * 患者登录、就诊人、代办授权；相对路径。
 * 真实载体为微信小程序，Web 端提供演示登录入口。
 * 患者端简化工作台（portal workbench）：合并调用已有 M3-L/M3-M/M3-N 端点，
 *   不新建后端路由；任一子项缺数据时降级为演示行并标 demo:true。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { PatientProfileView } from '@/types/internetHospital';
import type { PortalView } from '@/types/patientPortal';

/** 患者端首页门户聚合（M80-A）。 */
export function getPatientPortalApi() {
  return get<PortalView>('/patient/portal');
}

/** 患者登录（微信 code；本地演示任意 code 派生账号）。 */
export async function patientLoginApi(code: string): Promise<{
  token: string;
  accountId: string;
  isDemoLogin: boolean;
  profileCount: number;
}> {
  return post(`/internet/patient/login`, { code });
}

/** 列出当前账号下就诊人。 */
export async function listMyProfilesApi(): Promise<PatientProfileView[]> {
  return get(`/internet/patient/profiles`);
}

/** 添加就诊人（演示）。 */
export async function addProfileApi(input: {
  relation: PatientProfileView['relation'];
  name: string;
  gender?: '男' | '女' | '未知';
  birthDate?: string;
}): Promise<{ id: string; authLevel: number }> {
  return post(`/internet/patient/profiles`, input);
}

/* ====================================================================== */
/* 患者端简化工作台（portal workbench）：合并已有 internet 端点                */
/* ====================================================================== */

/** 待支付处方行（已审方通过、尚未支付，来自 M3-M /internet/payment/payable）。 */
export interface WorkbenchPayableItem {
  id: string;
  rxNo: string;
  totalFee: number;
  /** 演示行：后端无数据或请求失败时置 true */
  demo?: boolean;
}

/** 待取药行（来自 M3-N /internet/delivery/my，status=packed 表示已配药待取/待发）。 */
export interface WorkbenchPickupItem {
  deliveryNo: string;
  channel: 'self_pick' | 'express';
  statusLabel: string | null;
  pickupCode: string | null;
  demo?: boolean;
}

/** 随访提醒行（当前无患者端随访端点，默认演示行；后端补齐后改为真实数据）。 */
export interface WorkbenchFollowupItem {
  id: string;
  title: string;
  dueDate: string;
  demo?: boolean;
}

/** 在线咨询入口（来自 M3-J /internet/practitioners 可用医生数）。 */
export interface WorkbenchConsult {
  availableDoctors: number;
  entryPath: string;
  demo?: boolean;
}

/** 工作台聚合视图。 */
export interface PatientWorkbenchView {
  patientId: string | null;
  payable: { totalAmount: number; count: number; items: WorkbenchPayableItem[]; demo: boolean };
  pickup: { count: number; items: WorkbenchPickupItem[]; demo: boolean };
  followups: WorkbenchFollowupItem[];
  consult: WorkbenchConsult;
}

/** 在线咨询入口路由（患者端页面待上级在 router/index.tsx 注册，默认 /portal/consult）。 */
export const PATIENT_CONSULT_ENTRY_PATH = '/portal/consult';

/** 解析当前账号实名患者 ID（M3-M /internet/payment/patient-profile）。 */
async function resolvePatientId(): Promise<string | null> {
  try {
    const res = await get<{ accountId: string; patientId: string }>(
      `/internet/payment/patient-profile`,
    );
    return res?.patientId ?? null;
  } catch {
    return null;
  }
}

/** 待支付金额：M3-M 可支付处方列表聚合。 */
async function loadPayable(patientId: string | null): Promise<PatientWorkbenchView['payable']> {
  if (!patientId) {
    return {
      totalAmount: 0,
      count: 1,
      items: [{ id: 'demo-payable', rxNo: 'DEMO-0001', totalFee: 0, demo: true }],
      demo: true,
    };
  }
  try {
    const res = await get<{ payable: Array<{ id: string; rxNo: string; totalFee?: number | null }> }>(
      `/internet/payment/payable`,
      { patientId },
    );
    const items: WorkbenchPayableItem[] = (res?.payable ?? []).map((rx) => ({
      id: rx.id,
      rxNo: rx.rxNo,
      totalFee: Number(rx.totalFee ?? 0),
    }));
    return {
      totalAmount: items.reduce((sum, it) => sum + it.totalFee, 0),
      count: items.length,
      items,
      demo: false,
    };
  } catch {
    return {
      totalAmount: 0,
      count: 1,
      items: [{ id: 'demo-payable', rxNo: 'DEMO-0001', totalFee: 0, demo: true }],
      demo: true,
    };
  }
}

/** 待取药数：M3-N 我的配送单中已配药（packed）的行数。 */
async function loadPickup(patientId: string | null): Promise<PatientWorkbenchView['pickup']> {
  if (!patientId) {
    return {
      count: 1,
      items: [
        {
          deliveryNo: 'DEMO-D-0001',
          channel: 'self_pick',
          statusLabel: '已配药待取',
          pickupCode: '8801',
          demo: true,
        },
      ],
      demo: true,
    };
  }
  try {
    const res = await get<{
      deliveries: Array<{
        deliveryNo: string;
        channel: 'self_pick' | 'express';
        status: string;
        statusLabel?: string | null;
        pickupCode: string | null;
      }>;
    }>(`/internet/delivery/my`, { patientId });
    const items: WorkbenchPickupItem[] = (res?.deliveries ?? [])
      .filter((d) => d.status === 'packed')
      .map((d) => ({
        deliveryNo: d.deliveryNo,
        channel: d.channel,
        statusLabel: d.statusLabel ?? (d.status === 'packed' ? '已配药待取' : d.status),
        pickupCode: d.pickupCode,
      }));
    return { count: items.length, items, demo: false };
  } catch {
    return {
      count: 1,
      items: [
        {
          deliveryNo: 'DEMO-D-0001',
          channel: 'self_pick',
          statusLabel: '已配药待取',
          pickupCode: '8801',
          demo: true,
        },
      ],
      demo: true,
    };
  }
}

/** 随访提醒：患者端随访端点尚未建设，当前固定演示行（demo:true）。 */
function loadFollowups(): WorkbenchFollowupItem[] {
  return [
    { id: 'demo-fu-1', title: '慢病复诊随访（血压/血糖登记）', dueDate: '3 天后', demo: true },
    { id: 'demo-fu-2', title: '出院后 7 天健康回访', dueDate: '明天', demo: true },
  ];
}

/** 在线咨询入口：M3-J 在线可用医生数。 */
async function loadConsult(): Promise<WorkbenchConsult> {
  try {
    const doctors = await get<Array<{ id: string }>>(`/internet/practitioners`, {
      status: 'approved',
    });
    return {
      availableDoctors: Array.isArray(doctors) ? doctors.length : 0,
      entryPath: PATIENT_CONSULT_ENTRY_PATH,
      demo: false,
    };
  } catch {
    return { availableDoctors: 0, entryPath: PATIENT_CONSULT_ENTRY_PATH, demo: true };
  }
}

/**
 * 患者端简化工作台聚合：并行拉取待支付 / 待取药 / 在线咨询，
 * 随访提醒暂为演示行。任一子项失败仅降级该子项为 demo，不阻断整页。
 */
export async function getPatientWorkbenchApi(): Promise<PatientWorkbenchView> {
  const patientId = await resolvePatientId();
  const [payable, pickup, consult] = await Promise.all([
    loadPayable(patientId),
    loadPickup(patientId),
    loadConsult(),
  ]);
  return {
    patientId,
    payable,
    pickup,
    followups: loadFollowups(),
    consult,
  };
}
