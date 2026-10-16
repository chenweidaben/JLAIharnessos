/**
 * 健澜科技 jlmedaios — 【安全质量与运营】患者服务与体验深化路由（M172-D）
 *
 *   GET /api/v1/patient/deep?patientId=&from=&to=&waitType=&ahead=&windows=&avg=&ageBand=
 *
 *   一次返回患者服务深化四件套：
 *     system       buildDeepPatientService（四大深化域 + 老人友好度）；
 *     flow         optimizePatientFlow（带 from/to 时才返回，院内导航逐步导引）；
 *     wait         predictPatientWaitTime（带 waitType 时才返回，等待预测红黄绿灯）；
 *     personalized personalizePatientService（按 ageBand 等偏好个性化调好）。
 *
 * 薄壳路由：业务规则全部在 aggregators/patientDeepAggregator.ts 纯函数层。
 * 不写 SQL、不触库、不新增表；不触碰 WebSocket；不新增依赖。
 * patientId 缺失 → 400；其余参数缺省则对应模块不返回。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildDeepPatientService,
  optimizePatientFlow,
  personalizePatientService,
  predictPatientWaitTime,
  type FlowLocation,
  type PatientPreferences,
  type QueueSnapshot,
  type WaitServiceType,
} from '../aggregators/patientDeepAggregator';

/** 允许的等待服务类型 */
const WAIT_TYPES: ReadonlySet<string> = new Set([
  'registration', 'triage', 'consultation', 'check', 'pharmacy',
]);

function toLocation(raw: string | null): FlowLocation | null {
  if (!raw || !raw.trim()) return null;
  const v = raw.trim();
  // 形如 code:gate_hall 视为节点 code，否则按名称片段匹配
  if (v.startsWith('code:')) return { code: v.slice(5) };
  return { name: v };
}

export const patientDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const patientId = (c.query.get('patientId') ?? '').trim();
      if (!patientId) {
        return json(fail(ErrorCode.BAD_REQUEST, 'patientId 不能为空', c.traceId), 400);
      }

      try {
        // 1) 深度患者服务体系（总是返回）
        const system = buildDeepPatientService(patientId);

        // 2) 患者流程优化（带 from/to 才跑）
        const from = toLocation(c.query.get('from'));
        const to = toLocation(c.query.get('to'));
        const flow = from && to ? optimizePatientFlow(patientId, from, to) : null;

        // 3) 等待时间预测（带 waitType 才跑）
        const waitTypeRaw = (c.query.get('waitType') ?? '').trim();
        let wait = null;
        if (waitTypeRaw && WAIT_TYPES.has(waitTypeRaw)) {
          const snapshot: QueueSnapshot = {
            aheadCount: Number(c.query.get('ahead') ?? '0') || 0,
            openWindows: Number(c.query.get('windows') ?? '0') || 0,
            avgServiceMinutes: Number(c.query.get('avg') ?? '5') || 5,
          };
          wait = predictPatientWaitTime(waitTypeRaw as WaitServiceType, snapshot);
        }

        // 4) 个性化服务（按 ageBand 等偏好）
        const prefs: PatientPreferences = {};
        const ageBand = (c.query.get('ageBand') ?? '').trim();
        if (ageBand === 'elderly' || ageBand === 'adult' || ageBand === 'child') {
          prefs.ageBand = ageBand;
        }
        prefs.needsVoice = c.query.get('voice') === '1';
        prefs.wheelchair = c.query.get('wheelchair') === '1';
        const personalized = personalizePatientService(patientId, prefs);

        return json(ok({
          patientId,
          system,
          flow,
          wait,
          personalized,
          generatedAt: new Date().toISOString(),
        }, '患者服务深化已加载（老人也能用）'));
      } catch (err) {
        console.error(`[patientDeep] GET /deep [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '患者服务深化计算失败', c.traceId),
          500,
        );
      }
    },
  },
];
