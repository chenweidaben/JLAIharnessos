/**
 * 健澜科技 jlmedaios - 预防接种路由（M142-B · 预防保健与患者服务）
 *
 * 【预防保健与患者服务】以患者为中心的预防接种闭环：
 *   POST /api/v1/vaccination/administer
 *       接种实施。两种用法：
 *         1) 新患者首针：传 { patientId, vaccineName, doses?, nurseId, batchNo }，
 *            系统自动排程全程并接种第 1 针；
 *         2) 续种：传 { recordId, nurseId, batchNo, dose? }，dose 缺省自动取下一针。
 *       返回 { plan, record, reminder }——reminder 即下一针提前 7 天提醒。
 *   GET  /api/v1/vaccination/records/:patientId
 *       返回该患者全部接种计划（含剂次进度）+ 下一针提醒。
 *
 * 鉴权：未登录 401 / admin 放行 / 其余需显式权限码
 *   vaccination:view（查记录与提醒）、vaccination:administer（接种登记），否则 403。
 *
 * 生产安全：入参非法一律 400 结构化错误信封，不抛 500；
 *   落库 best-effort，断库不阻断接种主流程。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  getNextDoseReminder,
  listPlansByPatient,
  persistPlan,
  recordVaccineDose,
  scheduleVaccine,
  type Plan,
} from '../aggregators/vaccinationAggregator';

/** 接种实施请求体 */
interface AdministerBody {
  patientId?: unknown;
  vaccineName?: unknown;
  doses?: unknown;
  recordId?: unknown;
  nurseId?: unknown;
  batchNo?: unknown;
  dose?: unknown;
}

function toNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return 0;
}

export const vaccinationRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/vaccination/administer',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'vaccination:administer');
      if (denied) return denied;

      let body: AdministerBody;
      try {
        body = await c.body<AdministerBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : '';
      const recordId = typeof body.recordId === 'string' ? body.recordId.trim() : '';
      const nurseId = typeof body.nurseId === 'string' ? body.nurseId.trim() : '';
      const batchNo = typeof body.batchNo === 'string' ? body.batchNo.trim() : '';
      const vaccineName = typeof body.vaccineName === 'string' ? body.vaccineName.trim() : '';

      try {
        let plan: Plan;

        if (recordId) {
          // 续种：在既有计划上接种下一针
          const record = recordVaccineDose(recordId, nurseId, batchNo, toNum(body.dose));
          const plans = listPlansByPatient(record.patientId);
          plan = plans.find((p) => p.id === record.recordId) ?? ({} as Plan);
          await persistPlan(plan);
          const reminder = getNextDoseReminder(record.patientId);
          return json(ok({ plan, record, reminder }, '接种登记成功'));
        }

        // 新患者：排程全程 + 首针
        plan = scheduleVaccine(patientId, vaccineName, toNum(body.doses));
        const record = recordVaccineDose(plan.id, nurseId, batchNo, 1);
        // 回写首针进度后再取一次计划，保证 doses 状态最新
        plan = listPlansByPatient(patientId).find((p) => p.id === plan.id) ?? plan;
        await persistPlan(plan);
        const reminder = getNextDoseReminder(patientId);
        return json(ok({ plan, record, reminder }, '接种计划已排程并完成首针登记'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '接种登记失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/vaccination/records/:patientId',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'vaccination:view');
      if (denied) return denied;

      const patientId = (c.params.patientId || '').trim();
      if (!patientId) {
        return json(fail(ErrorCode.BAD_REQUEST, '路径参数 patientId 不能为空', c.traceId), 400);
      }

      try {
        const plans = listPlansByPatient(patientId);
        const reminder = getNextDoseReminder(patientId);
        return json(ok({ patientId, plans, reminder }, '接种记录已加载'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '接种记录加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
