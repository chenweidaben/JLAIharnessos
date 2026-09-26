/**
 * 健澜科技 jlmedaios - 急诊核心事务 API（M1-B1）
 *
 * 真实模式直连 BFF（/emergency/*），全部读写真实落 PostgreSQL。
 * 本服务不提供任何本地假数据；BFF/数据库不可用时由 request 层显式抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';
import type {
  AiTriageAdviceDto,
  ArrivalInput,
  ArrivalResult,
  ChannelTypeDto,
  DispositionCode,
  DispositionDto,
  EmergencyHealth,
  EmergencyQueueItem,
  EmergencyStatsDto,
  GreenChannelDto,
  GreenChannelType,
  ObservationDto,
  ObsTaskDto,
  ResuscitationDto,
  ResusEventDto,
  ResusMedicationDto,
  TriageFormPayload,
  TriageResult,
} from '@/types/emergency';

const base = '/emergency';

/** 健康探针（报告演示模式与真实 DB 连通性） */
export const getSystemHealth = (): Promise<EmergencyHealth> => get('/system/health');

// ---- 队列 / 统计 / 元数据 ----

/** 分诊台队列 */
export const getQueue = (): Promise<EmergencyQueueItem[]> => get(`${base}/queue`);

/** 当日急诊统计 */
export const getStats = (): Promise<EmergencyStatsDto> => get(`${base}/stats`);

/** 通道类型 */
export const getChannelTypes = (): Promise<ChannelTypeDto[]> => get(`${base}/channel-types`);

// ---- 接诊 / 分诊分级 ----

/** 接诊（新患者/已有患者进入急诊，生成并发安全分诊号） */
export const createArrival = (payload: ArrivalInput): Promise<ArrivalResult> =>
  post(`${base}/arrivals`, payload);

/** 完成分诊分级（客观评分 + 护士确认级别） */
export const submitTriage = (
  visitId: string,
  payload: TriageFormPayload,
): Promise<TriageResult> => post(`${base}/triage/${visitId}`, payload);

/** AI 辅助分诊建议（AI 不可用时 BFF 回落规则引擎，明确标注 source） */
export const fetchAiAdvice = (
  visitId: string,
  payload: Omit<TriageFormPayload, 'level'>,
): Promise<AiTriageAdviceDto> => post(`${base}/triage/${visitId}/ai-advice`, payload);

// ---- 绿色通道 ----

/** 绿色通道列表（可按状态过滤） */
export const listGreenChannels = (status?: 'active' | 'completed' | 'cancelled'): Promise<{ items: GreenChannelDto[] }> =>
  get(`${base}/green-channels`, status ? { status } : undefined);

/** 启动绿色通道 */
export const startGreenChannel = (
  visitId: string,
  payload: { type: GreenChannelType; subtype?: string },
): Promise<{ channel: GreenChannelDto }> =>
  post(`${base}/green-channels/${visitId}/start`, payload);

/** 记录绿色通道节点实际时间 */
export const recordGreenChannelNode = (
  channelId: string,
  nodeKey: string,
  actualTime?: string,
): Promise<{ channel: GreenChannelDto }> =>
  post(`${base}/green-channels/channel/${channelId}/nodes/${nodeKey}`, { actualTime });

/** 关闭绿色通道（计算 DB/DCT/DNT 质控指标） */
export const closeGreenChannel = (
  channelId: string,
  payload: { outcome: string; qualityNote?: string | null },
): Promise<{ channel: GreenChannelDto }> =>
  post(`${base}/green-channels/channel/${channelId}/close`, payload);

// ---- 抢救 ----

/** 活动抢救列表 */
export const listResuscitations = (): Promise<{ items: ResuscitationDto[] }> =>
  get(`${base}/resuscitation`);

/** 启动抢救 */
export const startResuscitation = (
  visitId: string,
  payload: { bedNo?: string; diagnosis?: string },
): Promise<{ resuscitation: ResuscitationDto }> =>
  post(`${base}/resuscitation/${visitId}/start`, payload);

/** 追加抢救事件 */
export const addResusEvent = (
  resusId: string,
  event: ResusEventDto,
): Promise<{ resuscitation: ResuscitationDto }> =>
  post(`${base}/resuscitation/record/${resusId}/events`, event);

/** 追加抢救用药 */
export const addResusMedication = (
  resusId: string,
  med: ResusMedicationDto,
): Promise<{ resuscitation: ResuscitationDto }> =>
  post(`${base}/resuscitation/record/${resusId}/medications`, med);

/** 结束抢救 */
export const completeResuscitation = (
  resusId: string,
  payload: {
    status: 'stabilized' | 'transferred_icu' | 'deceased';
    outcome: string;
    summary?: string | null;
  },
): Promise<{ resuscitation: ResuscitationDto }> =>
  post(`${base}/resuscitation/record/${resusId}/complete`, payload);

// ---- 留观 ----

/** 活动留观列表 */
export const listObservations = (): Promise<{ items: ObservationDto[] }> =>
  get(`${base}/observations`);

/** 开始留观 */
export const startObservation = (
  visitId: string,
  payload: {
    bedNo?: string;
    diagnosis?: string;
    nursingLevel?: string;
    expectedOutcome?: string;
    pendingTasks?: ObsTaskDto[];
  },
): Promise<{ observation: ObservationDto }> =>
  post(`${base}/observations/${visitId}/start`, payload);

/** 更新留观（状态/生命体征/输液/待办/护理等级） */
export const updateObservation = (
  obsId: string,
  payload: {
    status?: ObservationDto['status'];
    vitals?: Record<string, unknown>;
    ivStatus?: string;
    pendingTasks?: ObsTaskDto[];
    nursingLevel?: string;
  },
): Promise<{ observation: ObservationDto }> =>
  post(`${base}/observations/record/${obsId}/update`, payload);

/** 结束留观（入院/离院） */
export const endObservation = (
  obsId: string,
  status: 'discharged' | 'admitted',
): Promise<{ observation: ObservationDto }> =>
  post(`${base}/observations/record/${obsId}/end`, { status });

// ---- 转归 ----

/** 记录终末转归 */
export const recordDisposition = (
  visitId: string,
  payload: {
    disposition: DispositionCode;
    destination?: string | null;
    wardId?: string | null;
    bedId?: string | null;
    remark?: string | null;
  },
): Promise<{ disposition: DispositionDto }> =>
  post(`${base}/dispositions/${visitId}`, payload);
