/**
 * 健澜科技 jlmedaios - M313 康复医学域
 *
 * 康复治疗/康复评估/康复训练/康复设备/康复进度
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/rehab/treatments - 康复治疗 5 条 */
async function handleRehabTreatments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RT-001', patient: '王***（男，65 岁，脑梗死后遗症）', item: '偏瘫肢体综合训练+作业治疗', sessions: '已完成 15 次（共 30 次）', efficacy: '右上肢肌力由 II 级提升至 III 级，可辅助穿衣', therapist: '康复科 李***治疗师' },
    { id: 'RT-002', patient: '李***（女，55 岁，膝关节置换术后）', item: '膝关节活动度训练+肌力训练', sessions: '已完成 10 次（共 20 次）', efficacy: '膝关节活动度由 90° 提升至 110°，可扶助行器行走', therapist: '康复科 陈***治疗师' },
    { id: 'RT-003', patient: '张***（男，40 岁，腰椎间盘突出症）', item: '腰椎牵引+核心肌群训练', sessions: '已完成 8 次（共 12 次）', efficacy: '腰痛 VAS 评分由 6 分降至 2 分，可正常步行', therapist: '康复科 王***治疗师' },
    { id: 'RT-004', patient: '赵***（女，28 岁，剖宫产术后）', item: '盆底肌康复训练+腹直肌分离修复', sessions: '已完成 6 次（共 10 次）', efficacy: '盆底肌肌力由 II 级提升至 III 级，腹直肌分离由 3 指缩小至 1 指', therapist: '康复科 刘***治疗师' },
    { id: 'RT-005', patient: '孙***（男，70 岁， COPD 稳定期）', item: '呼吸功能训练+有氧运动', sessions: '已完成 12 次（共 24 次）', efficacy: '6 分钟步行距离由 350m 提升至 450m，SpO2 改善', therapist: '康复科 周***治疗师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/rehab/assessment - 康复评估 5 条 */
async function handleRehabAssessment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RA-001', patient: '王***（脑梗死后遗症）', item: 'Fugl-Meyer 运动功能评分（上肢）', score: '35 分（满分 66 分）', grade: '中度运动功能障碍', assessor: '康复科 李***主管治疗师' },
    { id: 'RA-002', patient: '李***（膝关节置换术后）', item: 'HSS 膝关节评分', score: '75 分（满分 100 分）', grade: '良好', assessor: '康复科 陈***主管治疗师' },
    { id: 'RA-003', patient: '张***（腰椎间盘突出症）', item: 'JOA 腰痛评分', score: '18 分（满分 29 分）', grade: '中度功能障碍', assessor: '康复科 王***主管治疗师' },
    { id: 'RA-004', patient: '赵***（剖宫产术后）', item: '盆底肌肌力评估（Oxford 评分）', score: '3 级（满分 5 级）', grade: '轻度肌力下降', assessor: '康复科 刘***主管治疗师' },
    { id: 'RA-005', patient: '孙***（COPD 稳定期）', item: 'CAT 评分（COPD 评估测试）', score: '15 分（满分 40 分）', grade: '中等影响', assessor: '康复科 周***主管治疗师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/rehab/exercises - 康复训练 5 条 */
async function handleRehabExercises(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RE-001', name: '上肢偏瘫肢体被动训练', action: '治疗师辅助患者进行肩、肘、腕关节各方向被动活动', sets: '3 组', reps: '每个动作 10 次', notes: '动作轻柔，避免过度牵拉，注意保护肩关节' },
    { id: 'RE-002', name: '膝关节屈曲训练（坐位）', action: '患者坐在床边，主动屈膝至最大角度，保持 5 秒后缓慢放下', sets: '3 组', reps: '每组 15 次', notes: '避免用力过猛，如疼痛明显可减小幅度' },
    { id: 'RE-003', name: '核心肌群训练（桥式运动）', action: '患者仰卧屈膝，臀部抬起使身体呈一条直线，保持 10 秒', sets: '3 组', reps: '每组 10 次', notes: '避免腰部过度拱起，保持呼吸均匀' },
    { id: 'RE-004', name: '盆底肌收缩训练（凯格尔运动）', action: '患者收缩盆底肌（憋尿动作），保持 5 秒后放松 5 秒', sets: '3 组', reps: '每组 15 次', notes: '避免腹部/臀部代偿收缩，保持正常呼吸' },
    { id: 'RE-005', name: '腹式呼吸训练', action: '患者一手放胸部一手放腹部，吸气时腹部鼓起，呼气时腹部收缩', sets: '3 组', reps: '每组 10 次（每次 5 个呼吸）', notes: '吸气缓慢，呼气更长，避免胸部起伏' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/rehab/equipment - 康复设备 5 条 */
async function handleRehabEquipment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'REQ-001', name: '上下肢主被动康复训练器', model: 'Motomed Viva 2', location: '康复科运动治疗室 1 区', status: '正常', lastMaintenance: '2026-09-20' },
    { id: 'REQ-002', name: '经皮神经电刺激仪（TENS）', model: 'ITO ES-160', location: '康复科物理因子治疗室', status: '正常', lastMaintenance: '2026-09-15' },
    { id: 'REQ-003', name: '颈椎牵引仪', model: '全日康 JHD-200', location: '康复科牵引治疗室', status: '正常', lastMaintenance: '2026-09-25' },
    { id: 'REQ-004', name: '减重步态训练系统', model: 'Biodex Gait Trainer 3', location: '康复科运动治疗室 2 区', status: '维护中', lastMaintenance: '2026-10-10' },
    { id: 'REQ-005', name: '超声波治疗仪', model: '伊藤 US-1000', location: '康复科物理因子治疗室', status: '正常', lastMaintenance: '2026-09-30' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/rehab/progress - 康复进度 5 条 */
async function handleRehabProgress(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RP-001', patient: '王***（脑梗死后遗症）', stage: '第 3 周（共 6 周）', progress: '右上肢肌力由 II 级提升至 III 级，可辅助进食/穿衣', goal: '第 6 周末右上肢肌力达 IV 级，可独立完成日常生活活动', assessment: 'Fugl-Meyer 评分由 25 分提升至 35 分（进步明显）' },
    { id: 'RP-002', patient: '李***（膝关节置换术后）', stage: '第 2 周（共 4 周）', progress: '膝关节活动度由 90° 提升至 110°，可扶助行器短距离行走', goal: '第 4 周末膝关节活动度达 120°，可独立行走', assessment: 'HSS 评分由 60 分提升至 75 分（进步良好）' },
    { id: 'RP-003', patient: '张***（腰椎间盘突出症）', stage: '第 2 周（共 3 周）', progress: '腰痛 VAS 评分由 6 分降至 2 分，可正常步行/坐立', goal: '第 3 周末腰痛 VAS 评分 ≤1 分，恢复正常工作', assessment: 'JOA 评分由 12 分提升至 18 分（进步明显）' },
    { id: 'RP-004', patient: '赵***（剖宫产术后）', stage: '第 2 周（共 3 周）', progress: '盆底肌肌力由 II 级提升至 III 级，腹直肌分离由 3 指缩小至 1 指', goal: '第 3 周末盆底肌肌力达 IV 级，腹直肌分离 ≤1 指', assessment: 'Oxford 评分由 2 级提升至 3 级（进步良好）' },
    { id: 'RP-005', patient: '孙***（COPD 稳定期）', stage: '第 3 周（共 6 周）', progress: '6 分钟步行距离由 350m 提升至 450m，日常活动后气促减轻', goal: '第 6 周末 6 分钟步行距离达 500m，CAT 评分 ≤10 分', assessment: 'CAT 评分由 20 分降至 15 分（进步明显）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m313Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/rehab/treatments', handle: handleRehabTreatments, auth: true },
  { method: 'GET', path: '/api/v1/rehab/assessment', handle: handleRehabAssessment, auth: true },
  { method: 'GET', path: '/api/v1/rehab/exercises', handle: handleRehabExercises, auth: true },
  { method: 'GET', path: '/api/v1/rehab/equipment', handle: handleRehabEquipment, auth: true },
  { method: 'GET', path: '/api/v1/rehab/progress', handle: handleRehabProgress, auth: true },
];
