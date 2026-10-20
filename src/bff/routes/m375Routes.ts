/**
 * 健澜科技 jlmedaios - M375 P1 业务扩展：康复医学深度打磨
 *
 * 康复治疗/物理治疗/运动疗法/作业治疗/康复随访（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/rehab/treatment - 康复治疗 5 条 */
async function handleRehabTreatment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RT-001', patientName: '张***（65 岁男性，脑卒中后偏瘫患者）', treatmentItem: '运动疗法 + 作业治疗（每日 1 次，每次 60 分钟）', sessionCount: '已完成 20 次（总疗程 40 次）', progress: '偏瘫肢体肌力从 2 级提升到 3 级，可辅助行走', therapist: '康复治疗师李***' },
    { id: 'RT-002', patientName: '李***（55 岁女性，膝关节置换术后患者）', treatmentItem: '物理治疗 + 运动疗法（每日 1 次，每次 45 分钟）', sessionCount: '已完成 15 次（总疗程 30 次）', progress: '膝关节活动度从 0-90 度改善到 0-120 度，可独立行走', therapist: '康复治疗师赵***' },
    { id: 'RT-003', patientName: '王***（60 岁男性，颈椎病患者）', treatmentItem: '物理治疗（牵引 + 中频电疗）（每日 1 次，每次 30 分钟）', sessionCount: '已完成 10 次（总疗程 20 次）', progress: '颈部疼痛 VAS 评分从 7 分下降到 3 分，上肢麻木明显减轻', therapist: '康复治疗师孙***' },
    { id: 'RT-004', patientName: '刘***（70 岁女性，腰椎间盘突出症患者）', treatmentItem: '物理治疗（牵引 + 热疗）+ 运动疗法（每日 1 次，每次 45 分钟）', sessionCount: '已完成 12 次（总疗程 24 次）', progress: '腰痛 VAS 评分从 8 分下降到 4 分，直腿抬高试验从 30 度改善到 60 度', therapist: '康复治疗师周***' },
    { id: 'RT-005', patientName: '陈***（45 岁男性，肩周炎患者）', treatmentItem: '运动疗法 + 物理治疗（每日 1 次，每次 40 分钟）', sessionCount: '已完成 8 次（总疗程 16 次）', progress: '肩关节活动度从前屈 60 度改善到前屈 120 度，疼痛明显减轻', therapist: '康复治疗师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/rehab/therapy - 物理治疗 5 条 */
async function handleRehabTherapy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RTY-001', patientName: '张***（65 岁男性，脑卒中后偏瘫患者）', therapyMethod: '中频电疗（每日 1 次，每次 20 分钟）', duration: '20 分钟/次', reaction: '治疗部位无不适，肌肉收缩反应良好', therapist: '康复治疗师李***' },
    { id: 'RTY-002', patientName: '李***（55 岁女性，膝关节置换术后患者）', therapyMethod: '超声波治疗（每日 1 次，每次 15 分钟）', duration: '15 分钟/次', reaction: '治疗部位无不适，切口愈合良好', therapist: '康复治疗师赵***' },
    { id: 'RTY-003', patientName: '王***（60 岁男性，颈椎病患者）', therapyMethod: '颈椎牵引（每日 1 次，每次 20 分钟）', duration: '20 分钟/次', reaction: '牵引后颈部疼痛明显减轻，无头晕不适', therapist: '康复治疗师孙***' },
    { id: 'RTY-004', patientName: '刘***（70 岁女性，腰椎间盘突出症患者）', therapyMethod: '腰椎牵引（每日 1 次，每次 20 分钟）', duration: '20 分钟/次', reaction: '牵引后腰痛明显减轻，无下肢麻木加重', therapist: '康复治疗师周***' },
    { id: 'RTY-005', patientName: '陈***（45 岁男性，肩周炎患者）', therapyMethod: '热敷治疗（每日 1 次，每次 20 分钟）', duration: '20 分钟/次', reaction: '热敷后肩关节疼痛明显减轻，活动度改善', therapist: '康复治疗师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/rehab/exercise - 运动疗法 5 条 */
async function handleRehabExercise(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RE-001', patientName: '张***（65 岁男性，脑卒中后偏瘫患者）', exerciseItem: '偏瘫肢体被动运动 + 主动辅助运动（每日 2 次，每次 30 分钟）', intensity: '低强度（被动运动为主，逐渐过渡到主动辅助运动）', duration: '30 分钟/次', progress: '偏瘫肢体肌力从 2 级提升到 3 级，可辅助行走' },
    { id: 'RE-002', patientName: '李***（55 岁女性，膝关节置换术后患者）', exerciseItem: '膝关节主动屈伸运动 + 步态训练（每日 2 次，每次 30 分钟）', intensity: '中等强度（主动运动为主，逐渐增加活动度）', duration: '30 分钟/次', progress: '膝关节活动度从 0-90 度改善到 0-120 度，可独立行走' },
    { id: 'RE-003', patientName: '王***（60 岁男性，颈椎病患者）', exerciseItem: '颈椎操（每日 2 次，每次 15 分钟）', intensity: '低强度（缓慢活动颈椎，避免剧烈运动）', duration: '15 分钟/次', progress: '颈部疼痛 VAS 评分从 7 分下降到 3 分' },
    { id: 'RE-004', patientName: '刘***（70 岁女性，腰椎间盘突出症患者）', exerciseItem: '腰背肌锻炼（五点支撑 + 小燕飞）（每日 2 次，每次 20 分钟）', intensity: '低强度（逐渐增加锻炼强度）', duration: '20 分钟/次', progress: '腰痛 VAS 评分从 8 分下降到 4 分' },
    { id: 'RE-005', patientName: '陈***（45 岁男性，肩周炎患者）', exerciseItem: '肩关节主动活动（爬墙运动 + 钟摆运动）（每日 2 次，每次 20 分钟）', intensity: '中等强度（逐渐增加活动范围）', duration: '20 分钟/次', progress: '肩关节活动度从前屈 60 度改善到前屈 120 度' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/rehab/occupational - 作业治疗 5 条 */
async function handleRehabOccupational(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RO-001', patientName: '张***（65 岁男性，脑卒中后偏瘫患者）', treatmentContent: '日常生活活动能力训练（穿衣、进食、洗漱等）（每日 1 次，每次 30 分钟）', goal: '恢复日常生活自理能力', progress: '可独立完成进食、洗漱，穿衣需辅助', therapist: '康复治疗师李***' },
    { id: 'RO-002', patientName: '李***（55 岁女性，膝关节置换术后患者）', treatmentContent: '步行能力训练（平地行走 + 上下楼梯）（每日 1 次，每次 30 分钟）', goal: '恢复独立步行能力', progress: '可独立平地行走，上下楼梯需辅助', therapist: '康复治疗师赵***' },
    { id: 'RO-003', patientName: '王***（60 岁男性，颈椎病患者）', treatmentContent: '上肢功能训练（手部精细动作）（每日 1 次，每次 20 分钟）', goal: '恢复上肢正常功能', progress: '手部精细动作明显改善，可完成写字、扣纽扣等动作', therapist: '康复治疗师孙***' },
    { id: 'RO-004', patientName: '刘***（70 岁女性，腰椎间盘突出症患者）', treatmentContent: '腰背肌功能训练（每日 1 次，每次 20 分钟）', goal: '恢复腰部正常功能', progress: '腰背肌力量明显增强，可独立完成日常活动', therapist: '康复治疗师周***' },
    { id: 'RO-005', patientName: '陈***（45 岁男性，肩周炎患者）', treatmentContent: '肩关节功能训练（每日 1 次，每次 20 分钟）', goal: '恢复肩关节正常功能', progress: '肩关节活动度明显改善，可完成穿衣、梳头动作', therapist: '康复治疗师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/rehab/followup - 康复随访 5 条 */
async function handleRehabFollowup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RF-001', patientName: '张***（65 岁男性，脑卒中后偏瘫患者）', followupTime: '2026-10-20（康复治疗 1 个月后随访）', functionalStatus: '偏瘫肢体肌力 3 级，可辅助行走，日常生活需部分辅助', suggestion: '继续康复训练（运动疗法 + 作业治疗），定期复查', doctor: '康复科主任医师李***' },
    { id: 'RF-002', patientName: '李***（55 岁女性，膝关节置换术后患者）', followupTime: '2026-10-20（康复治疗 1 个月后随访）', functionalStatus: '膝关节活动度 0-120 度，可独立行走，日常生活自理', suggestion: '继续康复训练（步态训练），定期复查', doctor: '康复科副主任医师赵***' },
    { id: 'RF-003', patientName: '王***（60 岁男性，颈椎病患者）', followupTime: '2026-10-20（康复治疗 2 周后随访）', functionalStatus: '颈部疼痛 VAS 评分 3 分，上肢麻木明显减轻', suggestion: '继续康复训练（颈椎牵引 + 颈椎操），定期复查', doctor: '康复科主治医师孙***' },
    { id: 'RF-004', patientName: '刘***（70 岁女性，腰椎间盘突出症患者）', followupTime: '2026-10-20（康复治疗 2 周后随访）', functionalStatus: '腰痛 VAS 评分 4 分，直腿抬高试验 60 度', suggestion: '继续康复训练（腰椎牵引 + 腰背肌锻炼），定期复查', doctor: '康复科副主任医师周***' },
    { id: 'RF-005', patientName: '陈***（45 岁男性，肩周炎患者）', followupTime: '2026-10-20（康复治疗 1 周后随访）', functionalStatus: '肩关节前屈 120 度，疼痛明显减轻', suggestion: '继续康复训练（肩关节主动活动 + 物理治疗），定期复查', doctor: '康复科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m375Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/rehab/treatment', handle: handleRehabTreatment, auth: true },
  { method: 'GET', path: '/api/v1/rehab/therapy', handle: handleRehabTherapy, auth: true },
  { method: 'GET', path: '/api/v1/rehab/exercise', handle: handleRehabExercise, auth: true },
  { method: 'GET', path: '/api/v1/rehab/occupational', handle: handleRehabOccupational, auth: true },
  { method: 'GET', path: '/api/v1/rehab/followup', handle: handleRehabFollowup, auth: true },
];
