/**
 * 健澜科技 jlmedaios - M513 P0 合规重点（智慧服务三级·医保深度）：医保智能审核深度监控 3 端点
 *
 * insurance/audit-rules 医保规则审核、insurance/denials 拒付分析、insurance/settlement-stats 结算统计。
 * 与 M483 /finance/insurance 概览区分（走 insurance/ 新前缀）；与 M512 /workflow/*、M511 /eventbus/*、
 * M510b /nursing/nqi-*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/insurance/audit-rules - 医保规则审核（规则名称Tag/违规等级Tag/命中次数）5 条 */
async function handleInsuranceAuditRules(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IAR-001', rule: '规则名称Tag：适应症不符橙（超说明书适应症用药，如奥美拉唑用于非酸相关疾病）', level: '违规等级Tag：中橙（建议修改医嘱，暂不拦截）', hits: '命中次数：本月累计 86 次（涉及 42 个科室，主要为全科/呼吸内科）' },
    { id: 'IAR-002', rule: '规则名称Tag：超限定支付红（如康柏西普限糖尿病视网膜病变，实际用于黄斑变性）', level: '违规等级Tag：高红（医保拒付风险，强制拦截）', hits: '命中次数：本月累计 12 次（全部已拦截，需患者自费或修改诊断）' },
    { id: 'IAR-003', rule: '规则名称Tag：重复收费紫（同一项目 24h 内重复收费，如血常规重复检验）', level: '违规等级Tag：中橙（建议合并收费）', hits: '命中次数：本月累计 158 次（主要为检验/检查科室）' },
    { id: 'IAR-004', rule: '规则名称Tag：超量开药蓝（门诊慢性病单次处方超 30 天量）', level: '违规等级Tag：低黄（提示医师，不强制）', hits: '命中次数：本月累计 220 次（主要为内分泌/心血管慢性病）' },
    { id: 'IAR-005', rule: '规则名称Tag：串换项目绿（将自费项目串换为医保项目，如美容项目串换为治疗）', level: '违规等级Tag：高红（医保欺诈，零容忍）', hits: '命中次数：本月累计 0 次（严格监控，未发现违规）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/denials - 拒付分析（拒付原因Tag/结算周期/拒付金额）5 条 */
async function handleInsuranceDenials(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ID-001', reason: '拒付原因Tag：资料不全黄（出院小结/手术记录缺失，医保不予结算）', period: '结算周期：2026-09 月（已完成结算）', amount: '拒付金额：12.6 万元（涉及 38 份病历，需补充资料后重新申报）' },
    { id: 'ID-002', reason: '拒付原因Tag：超目录橙（药品/耗材不在医保目录内，如进口靶向药未纳入）', period: '结算周期：2026-09 月', amount: '拒付金额：28.4 万元（涉及 12 份病历，需患者自费或走商保）' },
    { id: 'ID-003', reason: '拒付原因Tag：超限用药红（抗菌药物使用强度超 40 DDD/百人天）', period: '结算周期：2026-09 月', amount: '拒付金额：8.2 万元（涉及 25 份病历，需整改抗菌药物使用）' },
    { id: 'ID-004', reason: '拒付原因Tag：重复住院紫（同一疾病 15 天内重复住院，医保不予支付）', period: '结算周期：2026-08 月（已完成结算）', amount: '拒付金额：5.8 万元（涉及 8 份病历，需医院自行承担）' },
    { id: 'ID-005', reason: '拒付原因Tag：资料不全黄（病案首页填写不规范，主要诊断/手术编码错误）', period: '结算周期：2026-10 月（结算中，截至 10-20）', amount: '拒付金额：6.3 万元（涉及 22 份病历，已通知科室整改）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/settlement-stats - 结算统计（本月结算总额/DRG入组率/DIP点数/拒付率Tag）5 条 */
async function handleInsuranceSettlementStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ISS-001', total: '本月结算总额：2,860 万元（2026-10 截至 10-20，门诊 620 万 / 住院 2,240 万）', drgRate: 'DRG 入组率：88.5%（住院病例入组 DRG/DIP 比例，目标 ≥85%）', dipPoint: 'DIP 点数：本月累计 12,860 点（每点约 12.5 元）', denialRate: '拒付率Tag：1.2% 橙（34.3 万 / 2,860 万，处于 1-3% 区间，需整改）' },
    { id: 'ISS-002', total: '上月（2026-09）结算总额：3,120 万元', drgRate: 'DRG 入组率：87.2%', dipPoint: 'DIP 点数：14,200 点', denialRate: '拒付率Tag：1.5% 橙（46.8 万 / 3,120 万）' },
    { id: 'ISS-003', total: '近 7 日平均结算总额：96 万元/日', drgRate: '近 7 日平均 DRG 入组率：88.0%', dipPoint: '近 7 日平均 DIP 点数：428 点/日', denialRate: '近 7 日平均拒付率：1.1% 橙' },
    { id: 'ISS-004', total: '本月（2026-10）累计结算总额：58,600 万元（截至 10-20）', drgRate: '本月累计 DRG 入组率：87.8%', dipPoint: '本月累计 DIP 点数：268,000 点', denialRate: '本月累计拒付率：1.4% 橙' },
    { id: 'ISS-005', total: '分类型结算总额：住院占比 78%（DRG/DIP 结算为主）', drgRate: 'DRG 入组率最低科室：急诊科 65%（急诊病例诊断不规范，需整改）', dipPoint: 'DIP 点数最高科室：普外科 2,860 点/月（手术量大）', denialRate: '拒付率最高科室：肿瘤科 3.2% 红（超目录用药集中，需重点监控）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m513Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/insurance/audit-rules', handle: handleInsuranceAuditRules, auth: true },
  { method: 'GET', path: '/api/v1/insurance/denials', handle: handleInsuranceDenials, auth: true },
  { method: 'GET', path: '/api/v1/insurance/settlement-stats', handle: handleInsuranceSettlementStats, auth: true },
];
