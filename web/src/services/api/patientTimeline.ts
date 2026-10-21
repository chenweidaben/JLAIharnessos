/**
 * 健澜科技 jlmedaios - 患者诊疗时间线 API（M544，P0）
 *
 * 对接真实 BFF：GET /api/v1/patients/:id/timeline?from=&to=
 *   响应 {patientId,total,events[]}，eventTime 倒序；未知患者 → 404 OperationOutcome。
 * 9 类事件 eventType：admission/vital/medication/lab/imaging/consult/operation/nursing/assessment。
 * BFF 不可用/404 降级本地 DEMO 9 类镜像并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type TimelineEventType =
  | 'admission'
  | 'vital'
  | 'medication'
  | 'lab'
  | 'imaging'
  | 'consult'
  | 'operation'
  | 'nursing'
  | 'assessment';

export interface TimelineEvent {
  eventType: TimelineEventType;
  eventTime: string;
  title: string;
  detail: string;
  deptCode: string;
  operator: string;
}

export interface TimelineQuery {
  patientId: string;
  from?: string;
  to?: string;
}

export interface TimelineResult {
  patientId: string;
  total: number;
  events: TimelineEvent[];
  demo: boolean;
}

export const EVENT_TYPE_META: Record<TimelineEventType, { label: string; color: string }> = {
  admission: { label: '入院登记', color: 'blue' },
  vital: { label: '生命体征', color: 'purple' },
  medication: { label: '用药医嘱', color: 'green' },
  lab: { label: '检验结果', color: 'orange' },
  imaging: { label: '影像检查', color: 'cyan' },
  consult: { label: '会诊记录', color: 'gold' },
  operation: { label: '手术操作', color: 'red' },
  nursing: { label: '护理记录', color: 'teal' },
  assessment: { label: '评估记录', color: 'magenta' },
};

export const DEPT_CODE_LABEL: Record<string, string> = {
  'DEPT-IM': '心内科',
  'DEPT-LAB': '检验科',
  'DEPT-RAD': '影像科',
  'DEPT-SURG': '普外科',
  'DEPT-END': '内分泌科',
};

const DEMO_EVENTS: TimelineEvent[] = [
  { eventType: 'admission', eventTime: '2026-10-15T09:00:00+08:00', title: '入院登记', detail: '门诊以"高血压待查"收入心内科病区，床号 12-3。', deptCode: 'DEPT-IM', operator: '分诊护士-赵静' },
  { eventType: 'vital', eventTime: '2026-10-21T08:00:00+08:00', title: '生命体征', detail: 'T 36.5℃，P 70 次/分，BP 132/82 mmHg。', deptCode: 'DEPT-IM', operator: '护士-周敏' },
  { eventType: 'medication', eventTime: '2026-10-21T08:30:00+08:00', title: '出院带药', detail: '出院带药：氨氯地平 10mg qd、阿托伐他汀 20mg qn × 30 天。', deptCode: 'DEPT-IM', operator: '王医师' },
  { eventType: 'lab', eventTime: '2026-10-19T06:00:00+08:00', title: '凝血四项', detail: 'PT 12.1s、APTT 32s、FIB 3.1、INR 0.98。', deptCode: 'DEPT-LAB', operator: '检验-钱芳' },
  { eventType: 'imaging', eventTime: '2026-10-18T15:00:00+08:00', title: '头颅 CT', detail: '未见出血、梗死占位性病变，脑沟回正常。', deptCode: 'DEPT-RAD', operator: '影像-吴磊' },
  { eventType: 'consult', eventTime: '2026-10-19T11:00:00+08:00', title: '内分泌科会诊', detail: 'TG 偏高，建议低脂饮食，4 周后复查血脂。', deptCode: 'DEPT-END', operator: '会诊-郑医师' },
  { eventType: 'operation', eventTime: '2026-10-20T09:00:00+08:00', title: '手术记录', detail: '右腹股沟疝无张力修补术（择期），手术时长 45min。', deptCode: 'DEPT-SURG', operator: '主刀-马主任' },
  { eventType: 'nursing', eventTime: '2026-10-19T09:00:00+08:00', title: '跌倒评估', detail: 'Morse 评分 25 分（低危），床栏已拉起。', deptCode: 'DEPT-IM', operator: '护士-周敏' },
  { eventType: 'assessment', eventTime: '2026-10-18T16:00:00+08:00', title: '疼痛评估', detail: 'NRS 2 分（右腹股沟区轻度不适），无需镇痛。', deptCode: 'DEPT-IM', operator: '护士-陈芳' },
];

export const TIMELINE_PATIENT_PREVIEW = ['P10001', 'P10002', 'P10003'] as const;

export async function fetchTimelineEvents(query: TimelineQuery): Promise<TimelineResult> {
  const params: Record<string, string> = {};
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;
  try {
    const res = await get<{ patientId: string; total: number; events: TimelineEvent[] }>(
      `/patients/${query.patientId}/timeline`,
      Object.keys(params).length > 0 ? params : undefined,
    );
    return { patientId: res.patientId, total: res.total, events: res.events, demo: false };
  } catch {
    const events = DEMO_EVENTS.filter((e) => {
      const ms = Date.parse(e.eventTime);
      if (query.from && ms < Date.parse(query.from)) return false;
      if (query.to && ms > Date.parse(query.to)) return false;
      return true;
    });
    return { patientId: query.patientId, total: events.length, events, demo: true };
  }
}
