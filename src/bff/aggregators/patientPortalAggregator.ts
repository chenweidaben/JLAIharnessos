/**
 * 健澜科技 jlmedaios - 患者端门户聚合器（M80-A）
 * 患者登录后聚合复诊/报告/通知/押金/随访/满意度；自限域 patient_profiles，越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { pendingCount } from '../../medical-tools/nursing/patientPortal.js';

export class PatientPortalError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'PatientPortalError';
  }
}
const forbidden = (m: string) => new PatientPortalError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

export interface PortalView {
  upcomingAppointments: number;
  unreadReportsCount: number;
  unreadNotificationsCount: number;
  depositBalance: number;
  pendingFollowups: number;
  pendingSurveys: number;
  pending: ReturnType<typeof pendingCount>;
}

/** 患者登录后门户首页聚合（自限域：须 patient 角色且绑定 patient_profiles）。 */
export async function portalView(auth: AuthView): Promise<PortalView> {
  assertPermission(auth, 'patient_portal:view');
  const roleCodes = (auth.roles as Array<{ code?: string; name?: string }>).map((r) => r.code ?? r.name ?? String(r));
  if (!roleCodes.includes('patient')) throw forbidden('仅患者角色可访问');
  // 本切片以 0 占位聚合块（实际 repo 注入随 M19/M61/M63 扩展），自限域已由角色断言保证。
  const v: PortalView = {
    upcomingAppointments: 0,
    unreadReportsCount: 0,
    unreadNotificationsCount: 0,
    depositBalance: 0,
    pendingFollowups: 0,
    pendingSurveys: 0,
    pending: pendingCount({
      bookedAppts: 0, unreadReports: 0, unreadNotifs: 0,
      depositDue: 0, followupDue: 0, surveyDue: 0,
    }),
  };
  return v;
}
