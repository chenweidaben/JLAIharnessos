/**
 * 健澜科技 jlmedaios — 【AI深化与智能运营】医院运营预测与调配路由（M168-B）
 *
 *   GET  /api/v1/admin/ops/predict?type=outpatient&days=7
 *       门诊量 / 床位需求未来 N 天预测（含 95% 置信区间）。
 *       - history 可由调用方以 JSON 数组（query）传入真实历史；
 *       - 未传 history 时使用内置演示序列（demo:true），绝不编造线上业务数字；
 *       - holidays 以逗号分隔 ISO 日期传入，命中日按假日系数压减。
 *   POST /api/v1/admin/ops/schedule-optimize
 *       手术排程优化（surgeries/rooms/doctors）；body 同时给 demand/supply 时附带资源调配建议。
 *
 * 本切片纯函数 + 路由，不写 SQL、不建新表：历史数据由调用方传入或使用内置演示序列。
 * 医疗安全红线：预测/排程仅为运营排班辅助参考，不触发诊疗、不直接调号源/床位。
 * 权限码：GET 用 medmuse:view（只读）；POST 用 surgery:schedule:optimize（admin 放行）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  optimizeSurgerySchedule,
  predictBedDemand,
  predictOutpatientVolume,
  recommendResourceAllocation,
  type BedSeasonality,
  type DemandItem,
  type HistoryPoint,
  type OperatingRoom,
  type Surgery,
  type Surgeon,
  type SupplyItem,
} from '../aggregators/opsPredictAggregator';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;

/** 生成一段确定性的演示历史（工作日高、周末低、缓升趋势），用于无 history 入参时的空态演示 */
function demoHistory(days: number, base: number, weekendDrop: number, trendStep: number): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const wd = d.getUTCDay();
    const weekend = wd === 0 || wd === 6;
    const noise = (i % 3) * 5;
    const value = base + trendStep * (days - i) - (weekend ? weekendDrop : 0) + noise;
    out.push({ date: d.toISOString().slice(0, 10), value });
  }
  return out;
}

/** 解析 query 中可选的 JSON 历史数组；非法时返回 null */
function parseHistory(raw: string | null): HistoryPoint[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return (parsed as Array<Record<string, unknown>>)
      .filter((p) => p && typeof p.date === 'string' && Number.isFinite(Number(p.value)))
      .map((p) => ({ date: String(p.date).slice(0, 10), value: Number(p.value) }));
  } catch {
    return null;
  }
}

function parseJsonParam<T>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export const opsPredictRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/ops/predict',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;

      const type = c.query.get('type') ?? 'outpatient';
      const days = Math.min(
        MAX_DAYS,
        Math.max(1, Number(c.query.get('days') ?? DEFAULT_DAYS) || DEFAULT_DAYS),
      );
      const holidays = (c.query.get('holidays') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));

      const supplied = parseHistory(c.query.get('history'));
      const demo = supplied === null;
      const history: HistoryPoint[] =
        supplied ??
        (type === 'bed' ? demoHistory(56, 160, 12, 1.5) : demoHistory(56, 1100, 420, 4));

      try {
        if (type === 'bed') {
          const seasonality = parseJsonParam<BedSeasonality>(c.query.get('seasonality')) ?? {};
          const result = predictBedDemand(history, days, seasonality);
          return json(ok({ type, days, demo, holidays, result }));
        }
        const result = predictOutpatientVolume(history, days, holidays);
        return json(ok({ type, days, demo, holidays, result }));
      } catch (err) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '运营预测计算失败', c.traceId),
          500,
        );
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/ops/schedule-optimize',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'surgery:schedule:optimize');
      if (denied) return denied;

      try {
        const body = await c.body<{
          surgeries?: Surgery[];
          rooms?: OperatingRoom[];
          doctors?: Surgeon[];
          demand?: DemandItem[];
          supply?: SupplyItem[];
        }>();

        const surgeries = Array.isArray(body?.surgeries) ? body.surgeries : [];
        const rooms = Array.isArray(body?.rooms) ? body.rooms : [];
        const doctors = Array.isArray(body?.doctors) ? body.doctors : [];

        if (surgeries.length === 0) {
          return json(fail(ErrorCode.BAD_REQUEST, 'surgeries 不能为空', c.traceId), 400);
        }
        if (rooms.length === 0 || doctors.length === 0) {
          return json(fail(ErrorCode.BAD_REQUEST, 'rooms / doctors 不能为空', c.traceId), 400);
        }

        const schedule = optimizeSurgerySchedule(surgeries, rooms, doctors);

        let allocation: ReturnType<typeof recommendResourceAllocation> | null = null;
        if (Array.isArray(body?.demand) && Array.isArray(body?.supply)) {
          allocation = recommendResourceAllocation(body.demand, body.supply);
        }

        return json(ok({ schedule, allocation }));
      } catch (err) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '排程优化计算失败', c.traceId),
          500,
        );
      }
    },
  },
];
