/**
 * 健澜科技 jlmedaios - M178-B 医院人力资源深化——公平阳光 路由
 *
 * GET /api/v1/hr/deep
 *   - 财务人力行政党建 · 阳光人力驾驶舱；
 *   - 四维闭环：人员编制（编制数+实有人数+缺编率）/ 招聘管理（≥3 评委去两端取均）
 *     / 培训管理（计划+记录+学分达标）/ 绩效管理（KPI 权重公开 + 绩效工资公式列化）；
 *   - 核心主张：人力资源要公平，不能暗箱操作。
 *
 * 【财务人力行政党建】纯函数聚合，不碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import {
  buildDeepHRMgmt,
  calculatePerformancePay,
  calculateStaffingGap,
  trackTrainingRecord,
} from '../aggregators/hrDeepAggregator.js';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/hr/deep
 * 仅 admin（人事科）可查看阳光人力驾驶舱。
 *
 * @query dept     可选；单独查某科室编制缺口（IN/SU/NU/RD）
 * @query staffId  可选；单独查某员工培训学分 / 绩效工资（演示：传 staffId 即返回该员工明细）
 * @query period   可选；考核周期，默认 2026H1（培训默认 2026）
 */
async function handleHrDeep(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const dept = c.query.get('dept') || '';
  const staffId = c.query.get('staffId') || '';
  const period = c.query.get('period') || '2026H1';

  const view = buildDeepHRMgmt();

  // 可选：单科室编制缺口
  const staffingGap = dept ? calculateStaffingGap(dept, period) : null;

  // 可选：单员工培训学分 + 绩效工资（明细，供工资条/学分证明复算）
  let training: ReturnType<typeof trackTrainingRecord> | null = null;
  let perfPay: ReturnType<typeof calculatePerformancePay> | null = null;
  if (staffId) {
    training = trackTrainingRecord(staffId, period === '2026H1' ? '2026' : period);
    perfPay = calculatePerformancePay(staffId, period);
  }

  return json(
    ok({
      ...view,
      staffingGap,
      training,
      perfPay,
      notice:
        '阳光人力演示数据：编制公开、招聘≥3评委打分、学分按规则认定、绩效工资公式可复算；' +
        '远期接入 HRP/HR 真实数据后由数据回写（本切片不做 WebSocket 推送）。',
    }),
  );
}

export const hrDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/hr/deep',
    auth: true,
    handle: handleHrDeep,
  },
];
