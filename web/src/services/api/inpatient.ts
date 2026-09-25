/**
 * 健澜科技 jlmedaios - 住院工作台 API（M1-A ADT）
 *
 * 真实模式直连 BFF（/inpatient/*），ADT 事务真实落 PostgreSQL。
 * 本服务不提供任何本地假数据；BFF/数据库不可用时由 request 层显式抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  AdmitPayload,
  BedMapResponse,
  InpatientDetail,
  InpatientListItem,
  SystemHealth,
} from '@/types/inpatient';

const base = '/inpatient';

export interface InpatientQuery {
  campusCode?: string;
  department?: string;
  wardId?: string;
}

/** 公开健康/就绪探针（报告演示模式与真实 DB 连通性） */
export const getSystemHealth = (): Promise<SystemHealth> => get('/system/health');

/** 床位图（按病区显示床位与四态） */
export const getBedMap = (q: InpatientQuery = {}): Promise<BedMapResponse> =>
  get(`${base}/bed-map`, q);

/** 在院患者列表 */
export const getInpatients = (q: InpatientQuery = {}): Promise<{ items: InpatientListItem[]; total: number }> =>
  get(`${base}/patients`, q);

/** 在院患者详情（含移动史） */
export const getInpatient = (visitId: string): Promise<InpatientDetail> =>
  get(`${base}/patients/${visitId}`);

/** 入院登记（自动/指定分配床位） */
export const createAdmission = (payload: AdmitPayload): Promise<InpatientListItem> =>
  post(`${base}/admissions`, payload);

/** 换床（同病区） */
export const changeBed = (
  visitId: string,
  targetBedId: string,
  reason?: string,
): Promise<InpatientDetail> =>
  post(`${base}/patients/${visitId}/bed-change`, { targetBedId, reason });

/** 转科（换科室/病区/床） */
export const transfer = (
  visitId: string,
  targetWardId: string,
  targetBedId?: string,
  reason?: string,
): Promise<InpatientDetail> =>
  post(`${base}/patients/${visitId}/transfer`, { targetWardId, targetBedId, reason });

/** 出院（释放床位） */
export const discharge = (visitId: string, reason?: string): Promise<InpatientDetail> =>
  post(`${base}/patients/${visitId}/discharge`, { reason });

/** 床位状态维护（空闲/维护/隔离） */
export const setBedStatus = (
  bedId: string,
  status: 'available' | 'maintenance' | 'isolation',
  reason?: string,
): Promise<unknown> => post(`${base}/beds/${bedId}/status`, { status, reason });
