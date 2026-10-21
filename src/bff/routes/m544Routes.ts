/**
 * 健澜科技 jlmedaios - M544 新标准 P0：患者时间线聚合
 *
 * GET /api/v1/patients/:id/timeline?from=ISO&to=ISO
 *   - 按 eventTime 倒序
 *   - from/to 可选 ISO8601 区间过滤
 *   - patientId 不存在 → 404 OperationOutcome
 *
 * 患者 P10001 种子 22 条事件跨 7 天（2026-10-15 ~ 2026-10-21），覆盖全部 9 类：
 *   admission / vital / medication / lab / imaging / consult / operation / nursing / assessment
 *
 * 内存种子，不连 PostgreSQL；字段英文枚举 key、number、ISO8601。
 * 与 M543 /cds/checks、M542 /medical-records 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type EventType =
  | 'admission' | 'vital' | 'medication' | 'lab' | 'imaging'
  | 'consult' | 'operation' | 'nursing' | 'assessment';

interface TimelineEvent {
  eventType: EventType;
  eventTime: string;
  title: string;
  detail: string;
  deptCode: string;
  operator: string;
}

interface Timeline {
  patientId: string;
  events: TimelineEvent[];
}

// ============================== 内存种子（DEMO 短路，不连 PostgreSQL） ==============================

const timelineStore = new Map<string, Timeline>();

function seedTimelines(): void {
  const events: TimelineEvent[] = [
    // ---- admission 1 条 ----
    { eventType: 'admission', eventTime: '2026-10-15T09:00:00+08:00', title: '入院登记', detail: '门诊以"高血压待查"收入心内科病区，床号 12-3。', deptCode: 'DEPT-IM', operator: '分诊护士-赵静' },

    // ---- vital 4 条 ----
    { eventType: 'vital', eventTime: '2026-10-15T10:30:00+08:00', title: '生命体征', detail: 'T 36.8℃，P 78 次/分，R 18 次/分，BP 165/102 mmHg。', deptCode: 'DEPT-IM', operator: '护士-陈芳' },
    { eventType: 'vital', eventTime: '2026-10-18T08:00:00+08:00', title: '生命体征', detail: 'T 36.6℃，P 74 次/分，R 17 次/分，BP 148/92 mmHg。', deptCode: 'DEPT-IM', operator: '护士-陈芳' },
    { eventType: 'vital', eventTime: '2026-10-20T08:00:00+08:00', title: '生命体征', detail: 'T 36.7℃，P 72 次/分，R 16 次/分，BP 138/86 mmHg。', deptCode: 'DEPT-IM', operator: '护士-周敏' },
    { eventType: 'vital', eventTime: '2026-10-21T08:00:00+08:00', title: '生命体征', detail: 'T 36.5℃，P 70 次/分，R 16 次/分，BP 132/82 mmHg。', deptCode: 'DEPT-IM', operator: '护士-周敏' },

    // ---- medication 5 条 ----
    { eventType: 'medication', eventTime: '2026-10-15T11:00:00+08:00', title: '医嘱开立', detail: '氨氯地平 5mg po qd × 7 天（CCB 降压）。', deptCode: 'DEPT-IM', operator: '王医师' },
    { eventType: 'medication', eventTime: '2026-10-15T12:00:00+08:00', title: '医嘱执行', detail: '氨氯地平 5mg 首次执行，服药到口。', deptCode: 'DEPT-IM', operator: '护士-陈芳' },
    { eventType: 'medication', eventTime: '2026-10-17T09:30:00+08:00', title: '医嘱开立', detail: '阿托伐他汀 20mg po qn × 14 天（调脂稳定斑块）。', deptCode: 'DEPT-IM', operator: '王医师' },
    { eventType: 'medication', eventTime: '2026-10-19T14:00:00+08:00', title: '医嘱变更', detail: '氨氯地平由 5mg qd 调整为 10mg qd（血压控制未达标）。', deptCode: 'DEPT-IM', operator: '李主任' },
    { eventType: 'medication', eventTime: '2026-10-21T08:30:00+08:00', title: '出院带药', detail: '出院带药：氨氯地平 10mg qd、阿托伐他汀 20mg qn × 30 天。', deptCode: 'DEPT-IM', operator: '王医师' },

    // ---- lab 3 条 ----
    { eventType: 'lab', eventTime: '2026-10-15T14:00:00+08:00', title: '血常规', detail: 'WBC 6.5、RBC 4.6、Hb 145、PLT 210（×10⁹/L）。', deptCode: 'DEPT-LAB', operator: '检验-孙伟' },
    { eventType: 'lab', eventTime: '2026-10-16T06:00:00+08:00', title: '生化全套', detail: 'K 4.2、Na 140、Cr 82、TG 2.3、LDL-C 3.8（mmol/L）。', deptCode: 'DEPT-LAB', operator: '检验-孙伟' },
    { eventType: 'lab', eventTime: '2026-10-19T06:00:00+08:00', title: '凝血四项', detail: 'PT 12.1s、APTT 32s、FIB 3.1、INR 0.98。', deptCode: 'DEPT-LAB', operator: '检验-钱芳' },

    // ---- imaging 2 条 ----
    { eventType: 'imaging', eventTime: '2026-10-16T10:00:00+08:00', title: '胸部 DR', detail: '双肺纹理清晰，心影大小正常，未见实质性病变。', deptCode: 'DEPT-RAD', operator: '影像-吴磊' },
    { eventType: 'imaging', eventTime: '2026-10-18T15:00:00+08:00', title: '头颅 CT', detail: '未见出血、梗死占位性病变，脑沟回正常。', deptCode: 'DEPT-RAD', operator: '影像-吴磊' },

    // ---- consult 2 条 ----
    { eventType: 'consult', eventTime: '2026-10-17T10:00:00+08:00', title: '心内科会诊', detail: '会诊意见：建议完善动态心电图，排除心律失常相关头晕。', deptCode: 'DEPT-IM', operator: '会诊-周主任' },
    { eventType: 'consult', eventTime: '2026-10-19T11:00:00+08:00', title: '内分泌科会诊', detail: '会诊意见：TG 偏高，建议低脂饮食，4 周后复查血脂。', deptCode: 'DEPT-END', operator: '会诊-郑医师' },

    // ---- operation 1 条 ----
    { eventType: 'operation', eventTime: '2026-10-20T09:00:00+08:00', title: '手术记录', detail: '右腹股沟疝无张力修补术（择期），手术时长 45min，过程顺利。', deptCode: 'DEPT-SURG', operator: '主刀-马主任' },

    // ---- nursing 3 条 ----
    { eventType: 'nursing', eventTime: '2026-10-15T20:00:00+08:00', title: '护理记录', detail: '患者夜间入睡可，主诉头晕较前缓解，未见跌倒风险。', deptCode: 'DEPT-IM', operator: '护士-陈芳' },
    { eventType: 'nursing', eventTime: '2026-10-18T09:00:00+08:00', title: '压疮评估', detail: 'Braden 评分 18 分，骶尾部皮肤完整，无压疮风险。', deptCode: 'DEPT-IM', operator: '护士-周敏' },
    { eventType: 'nursing', eventTime: '2026-10-19T09:00:00+08:00', title: '跌倒评估', detail: 'Morse 评分 25 分（低危），床栏已拉起，陪护告知到位。', deptCode: 'DEPT-IM', operator: '护士-周敏' },

    // ---- assessment 1 条 ----
    { eventType: 'assessment', eventTime: '2026-10-18T16:00:00+08:00', title: '疼痛评估', detail: 'NRS 2 分（右腹股沟区轻度不适），无需镇痛处理。', deptCode: 'DEPT-IM', operator: '护士-陈芳' },
  ];
  timelineStore.set('P10001', { patientId: 'P10001', events });
}
seedTimelines();

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [
        { severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` },
      ],
    },
    404,
  );
}

// ============================== GET /api/v1/patients/:id/timeline ==============================

async function handleTimelineGet(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.params.id ?? '').trim();
  const tl = timelineStore.get(patientId);
  if (!tl) return notFound('PatientTimeline', patientId);

  const fromRaw = (c.query.get('from') ?? '').trim();
  const toRaw = (c.query.get('to') ?? '').trim();
  const fromMs = fromRaw ? Date.parse(fromRaw) : NaN;
  const toMs = toRaw ? Date.parse(toRaw) : NaN;

  let events = tl.events.slice();
  if (Number.isFinite(fromMs) || Number.isFinite(toMs)) {
    events = events.filter((e) => {
      const ms = Date.parse(e.eventTime);
      if (Number.isFinite(fromMs) && ms < fromMs) return false;
      if (Number.isFinite(toMs) && ms > toMs) return false;
      return true;
    });
  }

  events = events.sort((a, b) => Date.parse(b.eventTime) - Date.parse(a.eventTime));
  return json(ok({ patientId: tl.patientId, total: events.length, events }), 200);
}

export const m544Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patients/:id/timeline', handle: handleTimelineGet, auth: true },
];
