import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/emrAssessmentRepo';

export class EmrAssessmentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/**
 * v5.0试点扩展（M189 EMR/AI种子）：DEMO_MODE 五级评审自评确定性种子。
 * 固定 10 项评审指标（类别/指标/目标值/实测值/状态），7 项达标、3 项未达标，
 * 页面据此展示「达标 X 项 / 共 10 项」。
 * 字段与 EmrMetric（emrAssessmentRepo.mapRow）一致。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
function buildDemoMetrics() {
  const now = new Date().toISOString();
  const mk = (
    id: string, code: string, name: string, category: string,
    target: number, current: number, unit: string | null,
    status: 'pass' | 'fail' | 'pending',
  ) => ({
    id, metricCode: code, metricName: name, category,
    targetValue: target, currentValue: current, unit,
    status, measuredAt: now,
  });
  return [
    mk('demo-ma-1', 'MR_COMPLETE', '病历书写完整率', '病历质量', 95, 96.2, '%', 'pass'),
    mk('demo-ma-2', 'MR_ONTIME', '病历及时率', '时效管理', 90, 88.5, '%', 'fail'),
    mk('demo-ma-3', 'MR_CODE_ACC', 'ICD编码准确率', '应用效率', 95, 97.1, '%', 'pass'),
    mk('demo-ma-4', 'ORDER_EXEC', '医嘱闭环执行率', '医疗安全', 98, 98.4, '%', 'pass'),
    mk('demo-ma-5', 'CDS_INTERVENE', 'CDS有效干预率', '合理用药', 80, 82.0, '%', 'pass'),
    mk('demo-ma-6', 'FIRST_PAGE', '病案首页合格率', '病案质量', 95, 91.3, '%', 'fail'),
    mk('demo-ma-7', 'STRUCT_RATE', '病历结构化率', '数据利用', 90, 93.6, '%', 'pass'),
    mk('demo-ma-8', 'AUTH_ACCESS', '三级权限覆盖率', '安全隐私', 100, 100, '%', 'pass'),
    mk('demo-ma-9', 'TERMINAL_QC', '终末质控甲级率', '病历质量', 85, 80.2, '%', 'fail'),
    mk('demo-ma-10', 'TIMELINESS_SLA', '24h出院小结完成率', '时效管理', 95, 96.8, '%', 'pass'),
  ];
}

export async function listView(view: AuthView) {
  if (!view.permissions.includes('emr_assessment:view')) throw new EmrAssessmentError(403, '无查看权限');
  // v5.0试点扩展（M189 EMR/AI种子）：DEMO_MODE 直接返回确定性演示种子
  if (process.env.DEMO_MODE === '1') return buildDemoMetrics();
  return repo.listAll();
}

export async function updateView(view: AuthView, code: string, value: number) {
  if (!view.permissions.includes('emr_assessment:view')) throw new EmrAssessmentError(403, '无权限');
  const m = await repo.updateValue(code, value);
  if (!m) throw new EmrAssessmentError(404, '指标不存在');
  return m;
}
