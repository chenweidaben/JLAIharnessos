/**
 * 健澜科技 jlmedaios - M423 P1 业务扩展：社区医疗补充
 *
 * 家庭访视详情（home-visits-detail）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/community/home-visits-detail - 家庭访视详情 5 条 */
async function handleCommunityHomeVisitsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CHV-001', patient: '患者：王***（男，72 岁，高血压 3 级）', visitType: '访视类型：慢病随访（高血压月度随访）', visitDate: '访视时间：2026-10-18（周日上午 09:00-10:00）', content: '访视内容：1. 测量血压（145/90 mmHg，较上月 150/95 mmHg 下降）；2. 用药指导（继续服用氨氯地平 5mg/日，未调整剂量）；3. 生活方式指导（低盐饮食，每日盐摄入 < 5g）', result: '访视结果：血压控制良好，患者依从性佳，下次随访时间 2026-11-18' },
    { id: 'CHV-002', patient: '患者：李***（女，68 岁，糖尿病 2 型）', visitType: '访视类型：慢病随访（糖尿病月度随访）', visitDate: '访视时间：2026-10-19（周一上午 09:00-10:00）', content: '访视内容：1. 测量血糖（空腹血糖 7.2 mmol/L，较上月 7.8 mmol/L 下降）；2. 用药指导（二甲双胍 0.5g/次，每日 2 次，未调整剂量）；3. 饮食指导（控制碳水化合物摄入，每日主食 < 200g）', result: '访视结果：血糖控制良好，患者依从性佳，下次随访时间 2026-11-19' },
    { id: 'CHV-003', patient: '患者：张***（女，80 岁，脑卒中后遗症）', visitType: '访视类型：康复指导（脑卒中出院后康复访视）', visitDate: '访视时间：2026-10-17（周六上午 10:00-11:00）', content: '访视内容：1. 评估肢体功能（左侧肢体肌力 3 级，较出院时 2 级改善）；2. 康复指导（继续进行肢体功能锻炼，每日 2 次，每次 30 分钟）；3. 用药指导（继续服用阿司匹林 100mg/日+阿托伐他汀 20mg/日）', result: '访视结果：康复进展良好，患者依从性佳，下次访视时间 2026-10-31' },
    { id: 'CHV-004', patient: '患者：赵***（男，75 岁，冠心病）', visitType: '访视类型：慢病随访（冠心病季度随访）', visitDate: '访视时间：2026-10-16（周五下午 14:00-15:00）', content: '访视内容：1. 评估症状（无胸闷、胸痛发作，较上月稳定）；2. 用药指导（继续服用阿司匹林 100mg/日+阿托伐他汀 20mg/日+美托洛尔 25mg/日）；3. 生活方式指导（避免剧烈运动，保持情绪稳定）', result: '访视结果：病情稳定，患者依从性佳，下次随访时间 2027-01-16' },
    { id: 'CHV-005', patient: '患者：陈***（女，85 岁，独居老人）', visitType: '访视类型：健康关怀（独居老人季度关怀访视）', visitDate: '访视时间：2026-10-15（周四上午 09:00-10:00）', content: '访视内容：1. 评估生活状况（饮食、起居、用药基本正常）；2. 健康指导（注意保暖，预防跌倒，定期测量血压）；3. 心理关怀（与患者交谈，缓解孤独感）', result: '访视结果：生活状况良好，患者情绪稳定，下次访视时间 2027-01-15' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m423Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/community/home-visits-detail', handle: handleCommunityHomeVisitsDetail, auth: true },
];
