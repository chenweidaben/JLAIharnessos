/**
 * 健澜科技 jlmedaios - 输血不良反应闭环 SLA 路由（M182-A）
 *
 *   GET /api/v1/blood/closure-sla                 闭环 SLA 大盘（演示数据）
 *   GET /api/v1/blood/closure-sla?transfusionId=… 单条输血不良反应 SLA 跟踪
 *
 * 「v5.0启动」薄壳路由：SLA 判定/修复规则全部在
 * aggregators/bloodClosureSlaAggregator.ts 纯函数层。
 * 不写 SQL、不触库；不触碰 WebSocket；不新增依赖。仅要求登录（auth）。
 *
 * 医疗安全红线：输血不良反应闭环必须 100%。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  summarizeClosureSLA,
  trackTransfusionClosureSLA,
  type TransfusionClosureRecord,
} from '../aggregators/bloodClosureSlaAggregator';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';

/** 当前时刻偏移 hours 小时的 ISO 串（造演示用，时间锚定 now）。 */
function hoursAgo(h: number, now: number): string {
  return new Date(now - h * 3600000).toISOString();
}

/**
 * 脱敏演示闭环留痕集：覆盖 SLA 全部分支
 * （按时闭环 / 超时闭环 / 在途 / 20h提醒 / 24h升级）。
 */
function demoRecords(now: number): TransfusionClosureRecord[] {
  return [
    {
      // A：24h 内五段齐全闭环 -> CLOSED_MET
      transfusionId: 'TXN-20260-0001',
      patientId: 'P-1001',
      reactionType: 'fever',
      severity: 'mild',
      reportedAt: hoursAgo(10, now),
      assessedAt: hoursAgo(9.8, now),
      treatedAt: hoursAgo(9.5, now),
      recordedAt: hoursAgo(9.0, now),
      summarizedAt: hoursAgo(8.5, now),
      closedAt: hoursAgo(8.0, now),
      responsibleDoctorId: 'DR-王',
    },
    {
      // B：五段齐全但闭环超时 -> CLOSED_BREACH
      transfusionId: 'TXN-20260-0002',
      patientId: 'P-1002',
      reactionType: 'allergy',
      severity: 'moderate',
      reportedAt: hoursAgo(30, now),
      assessedAt: hoursAgo(29, now),
      treatedAt: hoursAgo(28, now),
      recordedAt: hoursAgo(27, now),
      summarizedAt: hoursAgo(26.2, now),
      closedAt: hoursAgo(26.0, now),
      responsibleDoctorId: 'DR-李',
    },
    {
      // C：在途，已记录未总结 -> ON_TRACK
      transfusionId: 'TXN-20260-0003',
      patientId: 'P-1003',
      reactionType: 'other',
      severity: 'mild',
      reportedAt: hoursAgo(5, now),
      assessedAt: hoursAgo(4.8, now),
      treatedAt: hoursAgo(4.5, now),
      recordedAt: hoursAgo(4.0, now),
      summarizedAt: null,
      closedAt: null,
      responsibleDoctorId: 'DR-赵',
    },
    {
      // D：21h 未闭环 -> REMIND_DOCTOR
      transfusionId: 'TXN-20260-0004',
      patientId: 'P-1004',
      reactionType: 'fever',
      severity: 'moderate',
      reportedAt: hoursAgo(21, now),
      assessedAt: hoursAgo(20.5, now),
      treatedAt: hoursAgo(20.0, now),
      recordedAt: null,
      summarizedAt: null,
      closedAt: null,
      responsibleDoctorId: 'DR-孙',
    },
    {
      // E：26h 未闭环 -> ESCALATE_DIRECTOR
      transfusionId: 'TXN-20260-0005',
      patientId: 'P-1005',
      reactionType: 'hemolysis',
      severity: 'severe',
      reportedAt: hoursAgo(26, now),
      assessedAt: hoursAgo(25.5, now),
      treatedAt: null,
      recordedAt: null,
      summarizedAt: null,
      closedAt: null,
      responsibleDoctorId: 'DR-周',
    },
  ];
}

export const bloodClosureSlaRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/blood/closure-sla',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const now = new Date();
        const records = demoRecords(now.getTime());
        const single = (c.query.get('transfusionId') ?? '').trim();
        if (single) {
          const rec = records.find((r) => r.transfusionId === single);
          if (!rec) return json(fail(ErrorCode.NOT_FOUND, '输血记录不存在'), 404);
          return json(ok({
            status: trackTransfusionClosureSLA(rec, now),
            demo: true,
          }));
        }
        const { items, summary } = summarizeClosureSLA(records, now);
        return json(ok({
          items,
          summary,
          sla: { remindAfterH: 20, escalateAfterH: 24, slaWindowH: 24 },
          demo: true,
        }));
      } catch (e) {
        const message = e instanceof Error ? e.message : '输血闭环 SLA 加载失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
      }
    },
  },
];
