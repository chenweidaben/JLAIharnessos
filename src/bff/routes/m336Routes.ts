/**
 * 健澜科技 jlmedaios - M336 手术麻醉 + 护理域
 *
 * 手术医嘱/手术记录 + 护理查房/护理计划（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/surgery/orders - 手术医嘱 5 条 */
async function handleSurgeryOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SO-001', orderNo: 'ORD-2026-SUR-001', patient: '张***（男，65 岁，冠心病拟行 PCI 术）', surgeon: '李***（心内科主任医师）', incision: '股动脉穿刺（微创）', result: '手术已完成（PCI 成功，植入支架 2 枚）' },
    { id: 'SO-002', orderNo: 'ORD-2026-SUR-002', patient: '王***（女，58 岁，胆囊结石拟行腹腔镜胆囊切除术）', surgeon: '王***（普外科副主任医师）', incision: '腹部 3 个 0.5-1cm 穿刺孔（微创）', result: '手术已完成（胆囊切除成功，无并发症）' },
    { id: 'SO-003', orderNo: 'ORD-2026-SUR-003', patient: '刘***（男，72 岁，股骨颈骨折拟行髋关节置换术）', surgeon: '赵***（骨科主任医师）', incision: '髋关节外侧切口（约 15cm）', result: '手术已完成（髋关节置换成功，假体位置良好）' },
    { id: 'SO-004', orderNo: 'ORD-2026-SUR-004', patient: '孙***（女，45 岁，甲状腺结节拟行甲状腺次全切除术）', surgeon: '周***（普外科副主任医师）', incision: '颈部横切口（约 5cm）', result: '手术已完成（甲状腺次全切除成功，病理待回报）' },
    { id: 'SO-005', orderNo: 'ORD-2026-SUR-005', patient: '吴***（男，60 岁，慢阻肺拟行肺减容术）', surgeon: '郑***（胸外科主任医师）', incision: '右侧胸部切口（约 10cm，胸腔镜辅助）', result: '手术已完成（肺减容成功，肺功能改善）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/surgery/records - 手术记录 5 条 */
async function handleSurgeryRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SR-001', surgeryNo: 'SUR-2026-001', patient: '张***（男，65 岁）', surgeon: '李***（心内科主任医师）', incision: '股动脉穿刺（微创）', result: '手术成功（PCI 植入支架 2 枚，术中无并发症）' },
    { id: 'SR-002', surgeryNo: 'SUR-2026-002', patient: '王***（女，58 岁）', surgeon: '王***（普外科副主任医师）', incision: '腹部 3 个 0.5-1cm 穿刺孔（腹腔镜微创）', result: '手术成功（胆囊完整切除，术中出血 50ml，无并发症）' },
    { id: 'SR-003', surgeryNo: 'SUR-2026-003', patient: '刘***（男，72 岁）', surgeon: '赵***（骨科主任医师）', incision: '髋关节外侧切口（约 15cm）', result: '手术成功（髋关节假体植入位置良好，术中出血 300ml，无并发症）' },
    { id: 'SR-004', surgeryNo: 'SUR-2026-004', patient: '孙***（女，45 岁）', surgeon: '周***（普外科副主任医师）', incision: '颈部横切口（约 5cm）', result: '手术成功（甲状腺次全切除，术中出血 20ml，无并发症）' },
    { id: 'SR-005', surgeryNo: 'SUR-2026-005', patient: '吴***（男，60 岁）', surgeon: '郑***（胸外科主任医师）', incision: '右侧胸部切口（约 10cm，胸腔镜辅助）', result: '手术成功（肺减容术，术中出血 200ml，无并发症）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/rounds - 护理查房 5 条 */
async function handleNursingRounds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NR-001', patient: '张***（男，65 岁，心内科 PCI 术后第 1 天）', roundType: '特级护理查房（术后第一天）', content: '生命体征监测（心率 72 次/分，血压 130/80mmHg）+ 穿刺点观察（无出血无血肿）+ 肢体活动指导（右下肢制动 12 小时）', recorder: '王***（心内科护士长）', time: '2026-10-20 08:00:00' },
    { id: 'NR-002', patient: '王***（女，58 岁，普外科腹腔镜胆囊切除术后第 2 天）', roundType: '一级护理查房（术后第二天）', content: '生命体征监测（体温 36.8℃，脉搏 80 次/分）+ 腹部切口观察（无红肿渗液）+ 饮食指导（流质→半流质过渡）', recorder: '李***（普外科护士长）', time: '2026-10-20 09:00:00' },
    { id: 'NR-003', patient: '刘***（男，72 岁，骨科髋关节置换术后第 3 天）', roundType: '一级护理查房（术后第三天）', content: '生命体征监测（体温 37.2℃，脉搏 85 次/分）+ 患肢观察（肿胀消退，足背动脉搏动良好）+ 康复指导（髋关节屈曲不超过 90°）', recorder: '赵***（骨科护士长）', time: '2026-10-20 10:00:00' },
    { id: 'NR-004', patient: '孙***（女，45 岁，普外科甲状腺次全切除术后第 1 天）', roundType: '一级护理查房（术后第一天）', content: '生命体征监测（体温 36.5℃，脉搏 75 次/分）+ 颈部切口观察（无渗血，无声音嘶哑）+ 饮食指导（温凉流质）', recorder: '周***（普外科护士长）', time: '2026-10-20 11:00:00' },
    { id: 'NR-005', patient: '吴***（男，60 岁，胸外科肺减容术后第 2 天）', roundType: '特级护理查房（术后第二天）', content: '生命体征监测（血氧饱和度 95%，心率 88 次/分）+ 胸腔引流管观察（引流液 200ml，淡红色）+ 呼吸功能锻炼指导（缩唇呼吸+有效咳嗽）', recorder: '郑***（胸外科护士长）', time: '2026-10-20 14:00:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nursing/plans - 护理计划 5 条 */
async function handleNursingPlans(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NP-001', patient: '张***（男，65 岁，心内科 PCI 术后）', nursingLevel: '特级护理', nursingItems: '生命体征监测（每 15 分钟 1 次，连续 2 小时后改为每小时 1 次）+ 穿刺点观察（每 30 分钟 1 次）+ 肢体活动指导（右下肢制动 12 小时）', responsible: '王***（心内科责任护士）', period: '2026-10-20 至 2026-10-21（术后 24 小时）' },
    { id: 'NP-002', patient: '王***（女，58 岁，普外科腹腔镜胆囊切除术后）', nursingLevel: '一级护理', nursingItems: '生命体征监测（每 4 小时 1 次）+ 腹部切口观察（每日 2 次）+ 饮食指导（流质→半流质过渡）+ 早期下床活动指导（术后 6 小时）', responsible: '李***（普外科责任护士）', period: '2026-10-20 至 2026-10-22（术后 3 天）' },
    { id: 'NP-003', patient: '刘***（男，72 岁，骨科髋关节置换术后）', nursingLevel: '一级护理', nursingItems: '生命体征监测（每 4 小时 1 次）+ 患肢观察（每日 2 次，肿胀/皮温/足背动脉搏动）+ 康复指导（髋关节屈曲不超过 90°）+ 防压疮护理（每 2 小时翻身 1 次）', responsible: '赵***（骨科责任护士）', period: '2026-10-20 至 2026-10-27（术后 7 天）' },
    { id: 'NP-004', patient: '孙***（女，45 岁，普外科甲状腺次全切除术后）', nursingLevel: '一级护理', nursingItems: '生命体征监测（每 4 小时 1 次）+ 颈部切口观察（每日 2 次，渗血/声音嘶哑）+ 饮食指导（温凉流质→半流质）+ 颈部活动指导（避免剧烈转头）', responsible: '周***（普外科责任护士）', period: '2026-10-20 至 2026-10-22（术后 3 天）' },
    { id: 'NP-005', patient: '吴***（男，60 岁，胸外科肺减容术后）', nursingLevel: '特级护理', nursingItems: '生命体征监测（每 1 小时 1 次）+ 胸腔引流管观察（每 2 小时 1 次，引流液量/颜色）+ 呼吸功能锻炼指导（缩唇呼吸+有效咳嗽，每日 4 次）+ 血氧饱和度监测（持续）', responsible: '郑***（胸外科责任护士）', period: '2026-10-20 至 2026-10-22（术后 48 小时）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m336Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/surgery/orders', handle: handleSurgeryOrders, auth: true },
  { method: 'GET', path: '/api/v1/surgery/records', handle: handleSurgeryRecords, auth: true },
  { method: 'GET', path: '/api/v1/nursing/rounds', handle: handleNursingRounds, auth: true },
  { method: 'GET', path: '/api/v1/nursing/plans', handle: handleNursingPlans, auth: true },
];
