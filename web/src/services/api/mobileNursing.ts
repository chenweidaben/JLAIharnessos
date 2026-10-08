/**
 * 健澜科技 jlmedaios - AI 移动护理（PDA 执行端）API（M16-A）
 *
 * 真实模式直连 BFF（/m/*），全部读写真实落 PostgreSQL。
 * 路径一律相对（不带 /api/v1 前缀，由 request 层 baseURL 拼接）；不提供任何本地假数据。
 * BFF/数据库不可用时由 request 层显式抛错，健康门禁在 store/页面统一处理。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';
import type {
  AssessmentSavePayload,
  BedBoardView,
  BedsideAdministerPayload,
  BedsideRecordPayload,
  BedsideTaskExecutePayload,
  ScanResult,
  SbarDraft,
  SbarSignPayload,
  FiveRightsResult,
  VitalsCapturePayload,
} from '@/types/mobileNursing';
import type {
  NursingRecordDto,
  TaskExecutionResult,
} from '@/types/care';

const base = '/m';

/** 床旁看板：按病区列出在院患者（床号/姓名/护理级别/风险标记/待办数）。 */
export const getBedBoard = (deptCode?: string): Promise<BedBoardView> =>
  get(`${base}/bed-board`, deptCode ? { deptCode } : undefined);

/** 扫码：解析腕带/标本/药品条码并定位业务对象。 */
export const scanCode = (code: string): Promise<ScanResult> =>
  post(`${base}/scan`, { code });

/** 五重核对 dry-run（不写库）。 */
export const verifyMedication = (
  orderId: string,
  body: BedsideAdministerPayload,
): Promise<FiveRightsResult> => post(`${base}/orders/${orderId}/verify`, body);

/** 扫码给药：先五重核对，allOk 才落给药（含双人核对/幂等/审计）；不通过后端回 409。 */
export const scanAndAdminister = (
  orderId: string,
  body: BedsideAdministerPayload,
): Promise<unknown> => post(`${base}/orders/${orderId}/administer`, body);

/** 床旁体征采集：写入护理记录（vitals）。 */
export const captureVitals = (body: VitalsCapturePayload): Promise<NursingRecordDto> =>
  post(`${base}/vitals`, body);

/** 护理任务床旁执行。 */
export const executeBedsideTask = (
  taskId: string,
  body: BedsideTaskExecutePayload,
): Promise<TaskExecutionResult> => post(`${base}/tasks/${taskId}/execute`, body);

/** 评估量表：纯函数评分后落护理记录（riskAssessment + 风险标记）。 */
export const saveAssessment = (body: AssessmentSavePayload): Promise<NursingRecordDto> =>
  post(`${base}/assessments`, body);

/** 床旁护理记录：快捷模板 / 语音录入，护士本人签名生效。 */
export const createBedsideRecord = (body: BedsideRecordPayload): Promise<NursingRecordDto> =>
  post(`${base}/records`, body);

/** SBAR 交班草稿（聚合本班信息，未签名）。 */
export const getSbar = (deptCode: string, shift: 'day' | 'night'): Promise<SbarDraft> =>
  get(`${base}/sbar`, { deptCode, shift });

/** SBAR 交班签名落库。 */
export const signSbar = (body: SbarSignPayload): Promise<NursingRecordDto> =>
  post(`${base}/sbar/sign`, body);
