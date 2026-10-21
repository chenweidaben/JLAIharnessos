/**
 * 健澜科技 jlmedaios - 护理 NQI 敏感指标 API（M545，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/nqi/indicators                  指标字典 {items,totalCount}（5 条）
 *   GET  /api/v1/nqi/indicators/:code/events      事件列表（reportedAt 倒序，未知 code 404）
 *   POST /api/v1/nqi/indicators/:code/events      上报事件（缺必填 400）
 * 注意：后端字典仅英文 key（numerator/denominator 为释义文本，无计算率值），前端不虚构达标率。
 * GET 类 BFF 不可用降级本地 DEMO 镜像打标 demo:true；POST 非 2xx 抛出后端 message。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type IndicatorCode =
  | 'fallRate'
  | 'intensiveCareInfection'
  | 'pressureUlcer'
  | 'medicationError'
  | 'fallInjury';

export interface NqiIndicator {
  code: IndicatorCode;
  name: string;
  numerator: string;
  denominator: string;
  unit: string;
  description: string;
}

export interface NqiEvent {
  id: string;
  indicatorCode: string;
  patientId: string;
  reportedAt: string;
  eventDescription: string;
  rootCause: string;
  improvementAction: string;
  reporterId: string;
}

export interface NqiReportInput {
  patientId: string;
  eventDescription: string;
  rootCause: string;
  improvementAction: string;
  reporterId: string;
}

export const INDICATOR_META: Record<IndicatorCode, { label: string; color: string }> = {
  fallRate: { label: '住院患者跌倒发生率', color: 'red' },
  intensiveCareInfection: { label: 'ICU 导管相关感染率', color: 'purple' },
  pressureUlcer: { label: '院内获得性压疮发生率', color: 'orange' },
  medicationError: { label: '给药错误发生率', color: 'blue' },
  fallInjury: { label: '跌倒所致伤害占比', color: 'gold' },
};

const DEMO_INDICATORS: NqiIndicator[] = [
  { code: 'fallRate', name: 'patient_fall_rate', numerator: 'inpatient_fall_events', denominator: 'inpatient_days', unit: '‰', description: 'Inpatient fall rate per 1000 inpatient days' },
  { code: 'intensiveCareInfection', name: 'icu_cauti_clabsi_rate', numerator: 'catheter_related_infections', denominator: 'device_days', unit: '‰', description: 'ICU catheter-related infection rate per 1000 device days' },
  { code: 'pressureUlcer', name: 'hospital_acquired_pressure_ulcer', numerator: 'stage2_above_pressure_ulcer', denominator: 'inpatients', unit: '%', description: 'Hospital-acquired stage 2+ pressure ulcer rate' },
  { code: 'medicationError', name: 'medication_error_rate', numerator: 'medication_error_events', denominator: 'medication_administrations', unit: '‰', description: 'Medication error rate per 1000 administrations' },
  { code: 'fallInjury', name: 'fall_with_injury_rate', numerator: 'fall_with_injury_events', denominator: 'inpatient_fall_events', unit: '%', description: 'Proportion of falls resulting in injury' },
];

const DEMO_EVENTS: Record<IndicatorCode, NqiEvent[]> = {
  fallRate: [
    { id: 'NQI-001', indicatorCode: 'fallRate', patientId: 'P-A001', reportedAt: '2026-10-12T09:30:00+08:00', eventDescription: 'Night shift patient fell beside bed, no injury.', rootCause: 'Bed side rail not raised.', improvementAction: 'Reinforce bed rail protocol; round hourly at night.', reporterId: 'N-NAN-001' },
    { id: 'NQI-002', indicatorCode: 'fallRate', patientId: 'P-A002', reportedAt: '2026-10-16T14:10:00+08:00', eventDescription: 'Patient tried to get up to toilet alone, slipped.', rootCause: 'Call bell not within reach.', improvementAction: 'Update Morse score daily; ensure call bell within reach.', reporterId: 'N-NAN-002' },
  ],
  intensiveCareInfection: [
    { id: 'NQI-004', indicatorCode: 'intensiveCareInfection', patientId: 'P-B001', reportedAt: '2026-10-11T10:00:00+08:00', eventDescription: 'CAUTI confirmed after 5 days of urinary catheter.', rootCause: 'Catheter care bundle not fully followed.', improvementAction: 'Re-audit CAUTI bundle daily; remove catheter ASAP.', reporterId: 'N-ICU-001' },
  ],
  pressureUlcer: [
    { id: 'NQI-007', indicatorCode: 'pressureUlcer', patientId: 'P-C001', reportedAt: '2026-10-13T11:00:00+08:00', eventDescription: 'Stage 2 sacral pressure ulcer on bedridden patient.', rootCause: 'Turning schedule not adhered to.', improvementAction: 'Two-hourly turning; update Braden every shift.', reporterId: 'N-WRD-001' },
  ],
  medicationError: [
    { id: 'NQI-010', indicatorCode: 'medicationError', patientId: 'P-D001', reportedAt: '2026-10-14T08:30:00+08:00', eventDescription: 'Wrong dose of warfarin administered (10mg vs 5mg ordered).', rootCause: 'Barcode scan skipped; manual override used.', improvementAction: 'Enforce mandatory barcode scanning; no manual override.', reporterId: 'N-MED-001' },
  ],
  fallInjury: [
    { id: 'NQI-013', indicatorCode: 'fallInjury', patientId: 'P-E001', reportedAt: '2026-10-15T07:50:00+08:00', eventDescription: 'Fell in bathroom, hit head, scalp laceration 2cm.', rootCause: 'No bathroom assist call; floor wet.', improvementAction: 'Add non-slip mat; bathroom call bell installed.', reporterId: 'N-NAN-004' },
  ],
};

export interface IndicatorListResult {
  items: NqiIndicator[];
  totalCount: number;
  demo: boolean;
}

export interface EventListResult {
  items: NqiEvent[];
  totalCount: number;
  demo: boolean;
}

export async function fetchNqiIndicators(): Promise<IndicatorListResult> {
  try {
    const res = await get<{ items: NqiIndicator[]; totalCount: number }>('/nqi/indicators');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_INDICATORS, totalCount: DEMO_INDICATORS.length, demo: true };
  }
}

export async function fetchNqiEvents(code: IndicatorCode): Promise<EventListResult> {
  try {
    const res = await get<{ items: NqiEvent[]; totalCount: number }>(`/nqi/indicators/${code}/events`);
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    const items = DEMO_EVENTS[code] ?? [];
    return { items, totalCount: items.length, demo: true };
  }
}

/** 上报：非 2xx 抛后端 message，不做 DEMO 成功兜底 */
export async function submitNqiReport(code: IndicatorCode, input: NqiReportInput): Promise<NqiEvent> {
  return post<NqiEvent>(`/nqi/indicators/${code}/events`, input);
}
