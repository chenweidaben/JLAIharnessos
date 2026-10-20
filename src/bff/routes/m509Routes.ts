/**
 * 健澜科技 jlmedaios - M509 P0 合规重点（电子病历五级·CDS 深度）：CDS 临床决策支持深度规则 3 端点
 *
 * cds/medication-review 合理用药审查、cds/lab-interpretation 检验结果智能解读、cds/pathway-recommend 临床路径智能推荐。
 * 与 M486 /cds-board 浅层看板区分（走 cds/ 新前缀）；与 M508 /timeline/*、M507 /fhir/*、/outpatient/* 路由区分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/cds/medication-review - 合理用药审查（药品/审查类型Tag/结果Tag/建议）5 条 */
async function handleCdsMedicationReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CMR-001', drug: '药品名称：华法林钠片（2.5mg po qd）', type: '审查类型Tag：相互作用橙（与胺碘酮联用，出血风险升高）', result: '审查结果Tag：警告橙（建议 INR 监测频率由每周 1 次增至每周 2 次）', suggestion: '审查建议：胺碘酮与华法林联用可增强抗凝作用，建议华法林起始剂量下调 25%，并密切监测 INR' },
    { id: 'CMR-002', drug: '药品名称：二甲双胍缓释片（0.5g po bid）', type: '审查类型Tag：剂量异常蓝（肾功能 eGFR=45，剂量超量）', result: '审查结果Tag：拦截红（eGFR<50 应减量，<30 禁用）', suggestion: '审查建议：eGFR=45 mL/min/1.73m²，建议剂量下调至 0.5g qd，避免乳酸酸中毒风险' },
    { id: 'CMR-003', drug: '药品名称：头孢曲松钠（2g iv qd）', type: '审查类型Tag：禁忌红（与含钙输液联用可致沉淀）', result: '审查结果Tag：拦截红（新生儿/老年患者禁止与含钙制剂同管输注）', suggestion: '审查建议：头孢曲松禁止与林格氏液/葡萄糖酸钙同管输注，两管路间隔至少 48h' },
    { id: 'CMR-004', drug: '药品名称：甘露醇注射液（250ml ivgtt q8h）', type: '审查类型Tag：给药途径紫（口服无脱水效果，需静脉快速输注）', result: '审查结果Tag：通过绿（给药途径正确，已注明 30 分钟内输注完毕）', suggestion: '审查建议：甘露醇应 30 分钟内快速静滴以达脱水效果，注意监测肾功能与电解质' },
    { id: 'CMR-005', drug: '药品名称：阿司匹林肠溶片（100mg po qd）', type: '审查类型Tag：相互作用橙（与布洛芬联用，胃肠道出血风险）', result: '审查结果Tag：警告橙（建议错开服药时间至少 2h）', suggestion: '审查建议：NSAIDs 与阿司匹林联用增加消化道出血风险，建议胃黏膜保护剂（PPI）预防性使用' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/lab-interpretation - 检验结果智能解读（项目/结果/参考/结果Tag/建议）5 条 */
async function handleCdsLabInterpretation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CLI-001', test: '检验项目：血清钾（K⁺）', value: '结果值：2.8 mmol/L', ref: '参考范围：3.5-5.5 mmol/L', result: '结果Tag：危急值紫（低于危急线 3.0）', suggestion: '智能解读建议：低钾血症，建议立即心电监护、口服+静脉联合补钾（10% KCl 30ml 口服 + 10mmol/h 静滴），2h 后复查' },
    { id: 'CLI-002', test: '检验项目：血清肌钙蛋白 I（cTnI）', value: '结果值：0.85 ng/mL（参考 <0.04）', ref: '参考范围：<0.04 ng/mL', result: '结果Tag：异常红（升高 20 倍，高度提示心肌损伤）', suggestion: '智能解读建议：结合心电图与临床症状，高度提示急性 STEMI，建议立即心内科会诊、急诊 PCI' },
    { id: 'CLI-003', test: '检验项目：空腹血糖（FPG）', value: '结果值：7.8 mmol/L', ref: '参考范围：3.9-6.1 mmol/L', result: '结果Tag：异常红（空腹血糖受损 → 糖尿病前期）', suggestion: '智能解读建议：FPG=7.8 已达糖尿病诊断标准（≥7.0），建议复查 OGTT + HbA1c 确认，内分泌科会诊' },
    { id: 'CLI-004', test: '检验项目：血红蛋白（Hb）', value: '结果值：135 g/L', ref: '参考范围：130-175 g/L（男性）', result: '结果Tag：正常绿', suggestion: '智能解读建议：血红蛋白在正常范围，无贫血征象' },
    { id: 'CLI-005', test: '检验项目：血淀粉酶（AMY）', value: '结果值：680 U/L', ref: '参考范围：35-135 U/L', result: '结果Tag：异常红（升高 5 倍，高度提示急性胰腺炎）', suggestion: '智能解读建议：结合腹痛/饮酒史/胆道结石史，高度提示急性胰腺炎，建议禁食、胃肠减压、补液、生长抑素' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/pathway-recommend - 临床路径智能推荐（诊断/推荐路径/匹配度Tag/推荐科室）5 条 */
async function handleCdsPathwayRecommend(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CPR-001', diagnosis: '诊断名称：急性 ST 段抬高型心肌梗死（STEMI）', pathway: '推荐路径名：急性 STEMI 临床路径（2025 版，国家卫健委标准版）', match: '匹配度Tag：≥90% 绿（95%，诊断+症状+心电图+肌钙蛋白 4 项全匹配）', dept: '推荐科室：心血管内科（急诊 PCI 路径，D2B 目标 90 分钟内）' },
    { id: 'CPR-002', diagnosis: '诊断名称：社区获得性肺炎（CAP）', pathway: '推荐路径名：成人 CAP 临床路径（2025 版，住院部标准版）', match: '匹配度Tag：70-90% 橙（78%，诊断+年龄+影像学匹配，但病原学未明）', dept: '推荐科室：呼吸内科（建议痰培养+血培养后调整抗生素方案）' },
    { id: 'CPR-003', diagnosis: '诊断名称：右肺下叶腺癌 cT2N1M0', pathway: '推荐路径名：非小细胞肺癌（NSCLC）多学科诊疗路径（2025 版）', match: '匹配度Tag：≥90% 绿（92%，病理+分期+分子检测全匹配）', dept: '推荐科室：胸外科 / 肿瘤科联合（建议 MDT 后决定新辅助化疗方案）' },
    { id: 'CPR-004', diagnosis: '诊断名称：2 型糖尿病（既往史）合并院内感染', pathway: '推荐路径名：2 型糖尿病临床路径（标准版）', match: '匹配度Tag：<70% 红（62%，诊断明确但合并症复杂，路径不适用）', dept: '推荐科室：内分泌科 + 感染科联合（建议个体化方案，不走标准路径）' },
    { id: 'CPR-005', diagnosis: '诊断名称：急性胰腺炎（胆源性）', pathway: '推荐路径名：急性胰腺炎临床路径（2025 版，普通型）', match: '匹配度Tag：≥90% 绿（88%，诊断+淀粉酶+影像学匹配）', dept: '推荐科室：消化内科 / 胰胃外科（评估是否需内镜下 ERCP 取石）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m509Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cds/medication-review', handle: handleCdsMedicationReview, auth: true },
  { method: 'GET', path: '/api/v1/cds/lab-interpretation', handle: handleCdsLabInterpretation, auth: true },
  { method: 'GET', path: '/api/v1/cds/pathway-recommend', handle: handleCdsPathwayRecommend, auth: true },
];
