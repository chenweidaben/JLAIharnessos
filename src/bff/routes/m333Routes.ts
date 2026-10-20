/**
 * 健澜科技 jlmedaios - M333 病历管理 + 医保域
 *
 * 病历模板/电子签名/病历归档 + 医保待遇/医保目录（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/templates - 病历模板 5 条 */
async function handleEmrTemplates(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ET-001', templateName: '入院记录模板（心内科标准版）', department: '心内科', type: '入院记录', usageCount: '1,250 次（本年度）', status: '启用中' },
    { id: 'ET-002', templateName: '首次病程记录模板（普外科标准版）', department: '普外科', type: '病程记录', usageCount: '860 次（本年度）', status: '启用中' },
    { id: 'ET-003', templateName: '手术记录模板（骨科标准版）', department: '骨科', type: '手术记录', usageCount: '420 次（本年度）', status: '启用中' },
    { id: 'ET-004', templateName: '出院记录模板（全院通用版）', department: '全院通用', type: '出院记录', usageCount: '2,500 次（本年度）', status: '启用中' },
    { id: 'ET-005', templateName: '门诊病历模板（全科通用版）', department: '门诊通用', type: '门诊病历', usageCount: '5,800 次（本年度）', status: '启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/signatures - 电子签名 5 条 */
async function handleEmrSignatures(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ES-001', signer: '李***（心内科主治医师）', idNumber: '3301**********1234（已脱敏）', signTime: '2026-10-20 09:15:30', status: '已签名（CA 证书有效）', purpose: '病历签名（入院记录）' },
    { id: 'ES-002', signer: '王***（普外科副主任医师）', idNumber: '3301**********5678（已脱敏）', signTime: '2026-10-20 10:30:45', status: '已签名（CA 证书有效）', purpose: '病历签名（手术记录）' },
    { id: 'ES-003', signer: '赵***（骨科主任医师）', idNumber: '3301**********9012（已脱敏）', signTime: '2026-10-20 11:00:20', status: '已签名（CA 证书有效）', purpose: '病历签名（出院记录）' },
    { id: 'ES-004', signer: '陈***（医保科主管）', idNumber: '3301**********3456（已脱敏）', signTime: '2026-10-20 11:30:00', status: '已签名（CA 证书有效）', purpose: '医保结算单签名' },
    { id: 'ES-005', signer: '周***（护理部主任）', idNumber: '3301**********7890（已脱敏）', signTime: '2026-10-20 14:00:00', status: '已签名（CA 证书有效）', purpose: '护理记录签名（特级护理）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/archives - 病历归档 5 条 */
async function handleEmrArchives(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EA-001', recordNo: 'BL-2026-001234', patient: '张***（男，65 岁，心内科出院患者）', archiveTime: '2026-10-15 17:00:00', archiveRoom: '病案室 1 号架 12 层', status: '已归档（纸质 + 电子双归档）' },
    { id: 'EA-002', recordNo: 'BL-2026-001235', patient: '王***（女，58 岁，普外科出院患者）', archiveTime: '2026-10-15 17:30:00', archiveRoom: '病案室 1 号架 13 层', status: '已归档（纸质 + 电子双归档）' },
    { id: 'EA-003', recordNo: 'BL-2026-001236', patient: '刘***（男，72 岁，骨科出院患者）', archiveTime: '2026-10-16 09:00:00', archiveRoom: '病案室 2 号架 5 层', status: '已归档（纸质 + 电子双归档）' },
    { id: 'EA-004', recordNo: 'BL-2026-001237', patient: '孙***（女，45 岁，妇产科出院患者）', archiveTime: '2026-10-16 10:00:00', archiveRoom: '病案室 2 号架 6 层', status: '待归档（已完成出院，待病案室接收）' },
    { id: 'EA-005', recordNo: 'BL-2026-001238', patient: '吴***（男，60 岁，呼吸内科出院患者）', archiveTime: '2026-10-16 11:00:00', archiveRoom: '病案室 3 号架 8 层', status: '已归档（纸质 + 电子双归档）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/benefits - 医保待遇 5 条 */
async function handleInsuranceBenefits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IB-001', benefitName: '职工基本医疗保险（住院统筹）', type: '住院待遇', rate: '在职 85% / 退休 90%', limit: '年度统筹基金最高支付限额 50 万元', effectiveTime: '2026-01-01 起执行' },
    { id: 'IB-002', benefitName: '职工基本医疗保险（门诊统筹）', type: '门诊待遇', rate: '在职 70% / 退休 75%', limit: '年度门诊统筹最高支付限额 5,000 元', effectiveTime: '2026-01-01 起执行' },
    { id: 'IB-003', benefitName: '城乡居民基本医疗保险（住院统筹）', type: '住院待遇', rate: '一级医院 85% / 二级医院 75% / 三级医院 60%', limit: '年度统筹基金最高支付限额 30 万元', effectiveTime: '2026-01-01 起执行' },
    { id: 'IB-004', benefitName: '大病保险（职工）', type: '大病待遇', rate: '个人负担超过 2 万元以上部分报销 60%', limit: '年度大病保险最高支付限额 40 万元', effectiveTime: '2026-01-01 起执行' },
    { id: 'IB-005', benefitName: '医疗救助（低保/特困人员）', type: '救助待遇', rate: '经基本医保 + 大病保险报销后，个人负担部分再救助 70%', limit: '年度医疗救助最高支付限额 10 万元', effectiveTime: '2026-01-01 起执行' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/directory - 医保目录 5 条 */
async function handleInsuranceDirectory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ID-001', itemName: '硝苯地平缓释片（降压药）', code: 'XNC-001（国家医保目录甲类）', type: '药品（西药）', limitPrice: '15.00 元/盒（30 片）', status: '医保甲类（100% 报销）' },
    { id: 'ID-002', itemName: '二甲双胍缓释片（降糖药）', code: 'JM J-002（国家医保目录甲类）', type: '药品（西药）', limitPrice: '20.00 元/盒（60 片）', status: '医保甲类（100% 报销）' },
    { id: 'ID-003', itemName: '胸部 CT 平扫（检查）', code: 'JC-CT-003（医疗服务项目）', type: '检查（影像）', limitPrice: '200.00 元/次', status: '医保乙类（报销 80%，个人先自付 20%）' },
    { id: 'ID-004', itemName: '普通病房床位费（三人间）', code: 'WF-004（医疗服务项目）', type: '床位（住院）', limitPrice: '30.00 元/天', status: '医保甲类（100% 报销）' },
    { id: 'ID-005', itemName: '一次性注射器（耗材）', code: 'HC-005（医用耗材）', limitPrice: '1.00 元/支', status: '医保乙类（报销 90%，个人先自付 10%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m333Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/templates', handle: handleEmrTemplates, auth: true },
  { method: 'GET', path: '/api/v1/emr/signatures', handle: handleEmrSignatures, auth: true },
  { method: 'GET', path: '/api/v1/emr/archives', handle: handleEmrArchives, auth: true },
  { method: 'GET', path: '/api/v1/insurance/benefits', handle: handleInsuranceBenefits, auth: true },
  { method: 'GET', path: '/api/v1/insurance/directory', handle: handleInsuranceDirectory, auth: true },
];
