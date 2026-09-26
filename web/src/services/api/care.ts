/**
 * 健澜科技 jlmedaios - 住院在院诊疗日常 API（M1-B2）
 *
 * 真实模式直连 BFF（/inpatient/*），全部读写真实落 PostgreSQL。
 * 本服务不提供任何本地假数据；BFF/数据库不可用时由 request 层显式抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';
import type {
  CareHealth,
  InpatientOrderCreatePayload,
  InpatientOrderView,
  NursingRecordCreatePayload,
  NursingRecordDto,
  NursingTaskCreatePayload,
  NursingTaskDto,
  OrderAdministrationResult,
  OrderAdministerPayload,
  OrderDto,
  TaskExecutionResult,
  WardRoundCreatePayload,
  WardRoundDto,
} from '@/types/care';

const base = '/inpatient';

/** 健康探针：报告演示模式与真实 DB 连通性。 */
export const getSystemHealth = (): Promise<CareHealth> => get('/system/health');

// ------------------------------ 医生查房 ------------------------------

export const listRounds = (visitId: string): Promise<WardRoundDto[]> =>
  get(`${base}/rounds`, { visitId });

export const createRound = (payload: WardRoundCreatePayload): Promise<WardRoundDto> =>
  post(`${base}/rounds`, payload);

export const signRound = (id: string): Promise<WardRoundDto> =>
  post(`${base}/rounds/${id}/sign`);

export const countersignRound = (id: string): Promise<WardRoundDto> =>
  post(`${base}/rounds/${id}/countersign`);

export const returnRound = (id: string, reason: string): Promise<WardRoundDto> =>
  post(`${base}/rounds/${id}/return`, { reason });

// ------------------------------ 护士护理 ------------------------------

export const listNursingRecords = (visitId: string): Promise<NursingRecordDto[]> =>
  get(`${base}/nursing/records`, { visitId });

export const createNursingRecord = (
  payload: NursingRecordCreatePayload,
): Promise<NursingRecordDto> => post(`${base}/nursing/records`, payload);

export const signNursingRecord = (id: string): Promise<NursingRecordDto> =>
  post(`${base}/nursing/records/${id}/sign`);

export const listNursingTasks = (visitId: string): Promise<NursingTaskDto[]> =>
  get(`${base}/nursing/tasks`, { visitId });

export const createNursingTask = (
  payload: NursingTaskCreatePayload,
): Promise<NursingTaskDto> => post(`${base}/nursing/tasks`, payload);

export const executeNursingTask = (
  id: string,
  result?: string,
): Promise<TaskExecutionResult> => post(`${base}/nursing/tasks/${id}/execute`, { result });

// ------------------------------ 在院医嘱 ------------------------------

export const getOrderView = (visitId: string): Promise<InpatientOrderView> =>
  get(`${base}/orders`, { visitId });

export const createOrder = (payload: InpatientOrderCreatePayload): Promise<OrderDto> =>
  post(`${base}/orders`, payload);

export const reviewOrder = (id: string): Promise<OrderDto> =>
  post(`${base}/orders/${id}/review`);

export const rejectOrder = (id: string, reason: string): Promise<OrderDto> =>
  post(`${base}/orders/${id}/reject`, { reason });

export const administerOrder = (
  id: string,
  payload: OrderAdministerPayload,
): Promise<OrderAdministrationResult> => post(`${base}/orders/${id}/administer`, payload);

export const stopOrder = (id: string): Promise<OrderDto> =>
  post(`${base}/orders/${id}/stop`);
