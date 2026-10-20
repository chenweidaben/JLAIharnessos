/**
 * 健澜科技 jlmedaios - M383 P1 业务扩展：患者360深度打磨
 *
 * 检验汇总/影像汇总（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/patient/labs - 检验汇总 5 条 */
async function handlePatientLabs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PL-001', patientName: '张***（55 岁男性，高血压患者）', item: '血常规（五分类）', result: '白细胞 6.5×10⁹/L（正常）、红细胞 4.5×10¹²/L（正常）、血红蛋白 130g/L（正常）', referenceRange: '白细胞 4-10×10⁹/L、红细胞 4.0-5.5×10¹²/L、血红蛋白 120-160g/L', time: '2026-10-20 08:00:00（检验时间）' },
    { id: 'PL-002', patientName: '李***（60 岁女性，糖尿病患者）', item: '空腹血糖', result: '7.5 mmol/L（升高）', referenceRange: '3.9-6.1 mmol/L', time: '2026-10-20 08:30:00（检验时间）' },
    { id: 'PL-003', patientName: '王***（65 岁男性，冠心病患者）', item: '血脂四项', result: '总胆固醇 5.8 mmol/L（升高）、甘油三酯 2.5 mmol/L（升高）、低密度脂蛋白胆固醇 3.5 mmol/L（升高）、高密度脂蛋白胆固醇 1.0 mmol/L（降低）', referenceRange: '总胆固醇 <5.2 mmol/L、甘油三酯 <1.7 mmol/L、低密度脂蛋白胆固醇 <3.4 mmol/L、高密度脂蛋白胆固醇 >1.0 mmol/L', time: '2026-10-20 09:00:00（检验时间）' },
    { id: 'PL-004', patientName: '刘***（70 岁女性，骨质疏松症患者）', item: '血钙 + 血磷', result: '血钙 2.3 mmol/L（正常）、血磷 1.2 mmol/L（正常）', referenceRange: '血钙 2.25-2.75 mmol/L、血磷 0.97-1.61 mmol/L', time: '2026-10-20 09:30:00（检验时间）' },
    { id: 'PL-005', patientName: '陈***（50 岁男性，慢性胃炎患者）', item: '肝功能（ALT + AST）', result: 'ALT 35 U/L（正常）、AST 30 U/L（正常）', referenceRange: 'ALT 7-40 U/L、AST 13-35 U/L', time: '2026-10-20 10:00:00（检验时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/imaging - 影像汇总 5 条 */
async function handlePatientImaging(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PI-001', patientName: '张***（55 岁男性，高血压患者）', item: '胸部 X 线正位片', result: '双肺纹理清晰，未见明显实质性病变；心影大小形态正常', doctor: '放射科主治医师李***', time: '2026-10-20 09:00:00（检查时间）' },
    { id: 'PI-002', patientName: '李***（60 岁女性，糖尿病患者）', item: '眼底照相（双眼）', result: '双眼底未见明显糖尿病视网膜病变表现', doctor: '眼科副主任医师赵***', time: '2026-10-20 10:00:00（检查时间）' },
    { id: 'PI-003', patientName: '王***（65 岁男性，冠心病患者）', item: '心电图（12 导联）', result: '窦性心律，心率 75 次/分，未见明显心肌缺血表现', doctor: '心内科主治医师孙***', time: '2026-10-20 11:00:00（检查时间）' },
    { id: 'PI-004', patientName: '刘***（70 岁女性，骨质疏松症患者）', item: '骨密度检测（双能 X 线吸收法）', result: '腰椎骨密度 T 值 -2.5（符合骨质疏松诊断标准）', doctor: '骨科副主任医师周***', time: '2026-10-20 14:00:00（检查时间）' },
    { id: 'PI-005', patientName: '陈***（50 岁男性，慢性胃炎患者）', item: '胃镜检查', result: '胃窦部黏膜充血水肿，可见散在糜烂点（慢性非萎缩性胃炎伴糜烂）', doctor: '消化内科主治医师吴***', time: '2026-10-20 15:00:00（检查时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m383Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patient/labs', handle: handlePatientLabs, auth: true },
  { method: 'GET', path: '/api/v1/patient/imaging', handle: handlePatientImaging, auth: true },
];
