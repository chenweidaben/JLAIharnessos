/**
 * 健澜科技 jlmedaios - M440 互联网医院/远程医疗深度（telemedicine）
 *
 * 电子处方/处方流转/远程会诊/复诊记录/健康咨询
 * （consultations 在线问诊已存在，此处不重复）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/telemedicine/e-prescriptions - 电子处方（处方号/患者/医生/药品/审核状态）5 条 */
async function handleTmMendPrescriptions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TEP-001', rxNo: '处方号：EP-20261020-01（互联网复诊）', patient: '患者：张***（男，65 岁，冠心病慢病）', doctor: '医生：王*** 主任医师（心内科线上）', drugs: '药品：阿托伐他汀 20mg*7 盒 + 阿司匹林 100mg*30', reviewStatus: '审核状态：药师已审核通过（剂量/相互作用合规）' },
    { id: 'TEP-002', rxNo: '处方号：EP-20261020-02（互联网复诊）', patient: '患者：李***（女，58 岁，糖尿病）', doctor: '医生：刘*** 主治医师（内分泌线上）', drugs: '药品：二甲双胍缓释片 0.5g*60 片', reviewStatus: '审核状态：药师已审核通过' },
    { id: 'TEP-003', rxNo: '处方号：EP-20261020-03（待审核）', patient: '患者：王***（男，72 岁，骨科复诊）', doctor: '医生：赵*** 主任医师（骨科线上）', drugs: '药品：布洛芬缓释胶囊 0.3g*20 粒（短期镇痛）', reviewStatus: '审核状态：待药师审核（排队中）' },
    { id: 'TEP-004', rxNo: '处方号：EP-20261019-04（已退回）', patient: '患者：陈***（男，45 岁，术后）', doctor: '医生：孙*** 主治医师（普外科线上）', drugs: '药品：拟开具头孢类（疑似过敏史不符）', reviewStatus: '审核状态：药师退回（与过敏史冲突，需医生重开）' },
    { id: 'TEP-005', rxNo: '处方号：EP-20261019-05（慢病续方）', patient: '患者：赵***（女，32 岁，产科随访）', doctor: '医生：周*** 副主任医师（产科线上）', drugs: '药品：铁剂（贫血补充，孕期适用）', reviewStatus: '审核状态：药师已审核通过' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemedicine/prescription-flow - 处方流转（处方号/承接药店/配送状态/药师/时间）5 条 */
async function handleTmPrescriptionFlow(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TPF-001', rxNo: '处方号：EP-20261020-01（阿托伐他汀等）', pharmacy: '承接药店：健澜互联网医院合作药房（同城配送）', deliveryStatus: '配送状态：已配送（骑手已取药，预计 2 小时送达）', pharmacist: '药师：钱***（审方药师 PH-015）', time: '时间：2026-10-20 10:20:14' },
    { id: 'TPF-002', rxNo: '处方号：EP-20261020-02（二甲双胍）', pharmacy: '承接药店：定点零售药店（患者自取）', deliveryStatus: '配送状态：已到店（患者凭码自取，待取药）', pharmacist: '药师：吴***（PH-012）', time: '时间：2026-10-20 10:45:30' },
    { id: 'TPF-003', rxNo: '处方号：EP-20261019-05（孕期铁剂）', pharmacy: '承接药店：合作药房（同城配送）', deliveryStatus: '配送状态：已签收（患者已收货确认）', pharmacist: '药师：钱***（PH-015）', time: '时间：2026-10-19 16:10:55' },
    { id: 'TPF-004', rxNo: '处方号：EP-20261020-03（布洛芬，待审）', pharmacy: '承接药店：待处方审核通过后匹配', deliveryStatus: '配送状态：流转中（等待药师审方，暂未派药）', pharmacist: '药师：待分配', time: '时间：待流转' },
    { id: 'TPF-005', rxNo: '处方号：EP-20261019-04（已退回处方）', pharmacy: '承接药店：未承接（处方退回未流转）', deliveryStatus: '配送状态：已终止（处方退回，药店未收单）', pharmacist: '药师：吴***（PH-012，退回操作）', time: '时间：2026-10-19 15:40:22' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemedicine/remote-consults - 远程会诊（会诊号/发起科室/专家/议题/状态）5 条 */
async function handleTmRemoteConsults(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRC-001', consultNo: '会诊号：RC-20261020-01（多学科 MDT）', dept: '发起科室：普外科（复杂肿瘤病例）', expert: '专家：上级医院肿瘤内科+影像+病理联合专家组', topic: '议题：结肠癌术后辅助治疗方案与随访策略讨论', status: '状态：会诊完成（视频会诊，已形成书面建议）' },
    { id: 'TRC-002', consultNo: '会诊号：RC-20261020-02（远程影像会诊）', dept: '发起科室：放射科（疑难肺结节）', expert: '专家：上级医院胸部影像专家（远程阅片）', topic: '议题：肺结节良恶性鉴别与随访间隔建议', status: '状态：会诊完成（书面报告已回传）' },
    { id: 'TRC-003', consultNo: '会诊号：RC-20261021-03（待发起）', dept: '发起科室：神经内科（疑难癫痫病例）', expert: '专家：拟邀上级神经科专家', topic: '议题：难治性癫痫用药与脑电图解读', status: '状态：待发起（预约 2026-10-21 视频会诊）' },
    { id: 'TRC-004', consultNo: '会诊号：RC-20261019-04（远程病理会诊）', dept: '发起科室：病理科（罕见肿瘤鉴别）', expert: '专家：上级医院病理专家（切片远程会诊）', topic: '议题：软组织肿瘤亚型分型复核', status: '状态：会诊完成（诊断意见已采纳）' },
    { id: 'TRC-005', consultNo: '会诊号：RC-20261019-05（远程心电会诊）', dept: '发起科室：心内科（复杂心律失常）', expert: '专家：上级电生理专家（远程心电图判读）', topic: '议题：宽 QRS 心动过速鉴别与消融评估', status: '状态：会诊完成（建议转上级电生理评估）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemedicine/revisits - 复诊记录（患者/首诊日期/复诊方式/医生/结论）5 条 */
async function handleTmRevisits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRV-001', patient: '患者：张***（男，65 岁，冠心病）', firstVisit: '首诊日期：2026-09-15（线下心内科）', revisitMethod: '复诊方式：互联网医院图文复诊', doctor: '医生：王*** 主任医师', conclusion: '结论：病情稳定，继续原方案，1 月后复查血脂' },
    { id: 'TRV-002', patient: '患者：李***（女，58 岁，2 型糖尿病）', firstVisit: '首诊日期：2026-08-20（线下内分泌科）', revisitMethod: '复诊方式：互联网医院视频复诊', doctor: '医生：刘*** 主治医师', conclusion: '结论：血糖控制达标，维持二甲双胍，调整监测频次' },
    { id: 'TRV-003', patient: '患者：王***（男，72 岁，骨科术后）', firstVisit: '首诊日期：2026-10-05（线下手术）', revisitMethod: '复诊方式：互联网医院图文复诊（伤口随访）', doctor: '医生：赵*** 主任医师', conclusion: '结论：切口愈合良好，继续康复锻炼，2 周后线下复查' },
    { id: 'TRV-004', patient: '患者：陈***（男，45 岁，普外科术后）', firstVisit: '首诊日期：2026-10-08（线下手术）', revisitMethod: '复诊方式：互联网医院图文复诊', doctor: '医生：孙*** 主治医师', conclusion: '结论：恢复顺利，饮食过渡正常，无需调整用药' },
    { id: 'TRV-005', patient: '患者：赵***（女，32 岁，产科产后）', firstVisit: '首诊日期：2026-10-01（线下分娩）', revisitMethod: '复诊方式：互联网医院视频复诊（产后 42 天回访）', doctor: '医生：周*** 副主任医师', conclusion: '结论：子宫复旧良好，母乳喂养指导，新生儿发育正常' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemedicine/advices - 健康咨询（咨询号/患者/问题/医生答复/满意度）5 条 */
async function handleTmAdvices(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TAD-001', consultNo: '咨询号：HC-20261020-01', patient: '患者：刘***（女，35 岁，普通咨询）', question: '问题：换季过敏性鼻炎反复，是否需要用药？日常如何防护？', answer: '医生答复：建议规避过敏原，症状明显可用二代抗组胺药，持续不缓解到耳鼻喉科就诊', satisfaction: '满意度：满意（5/5）' },
    { id: 'TAD-002', consultNo: '咨询号：HC-20261020-02', patient: '患者：孙***（男，50 岁，普通咨询）', question: '问题：体检尿酸偏高，饮食上哪些要忌口？需要吃药吗？', answer: '医生答复：低嘌呤饮食、限酒多饮水，无症状高尿酸先生活干预，定期复查', satisfaction: '满意度：满意（5/5）' },
    { id: 'TAD-003', consultNo: '咨询号：HC-20261019-03', patient: '患者：周***（女，28 岁，普通咨询）', question: '问题：孩子反复发烧 38.5℃ 以上，物理降温还是吃药？', answer: '医生答复：体温≥38.5℃ 可服退热药，配合补液，精神差或持续高热及时就医', satisfaction: '满意度：一般（3/5，希望更详细）' },
    { id: 'TAD-004', consultNo: '咨询号：HC-20261019-04', patient: '患者：吴***（男，62 岁，普通咨询）', question: '问题：高血压日常监测血压，早晚多少算正常？', answer: '医生答复：家庭自测一般控制在 140/90mmHg 以下，达标者可更严格，记录趋势复诊', satisfaction: '满意度：满意（5/5）' },
    { id: 'TAD-005', consultNo: '咨询号：HC-20261018-05', patient: '患者：郑***（女，40 岁，普通咨询）', question: '问题：失眠长期靠褪黑素，长期吃有没有副作用？', answer: '医生答复：短期使用相对安全，长期依赖建议睡眠门诊评估，调整作息', satisfaction: '满意度：满意（5/5）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m440Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/telemedicine/e-prescriptions', handle: handleTmMendPrescriptions, auth: true },
  { method: 'GET', path: '/api/v1/telemedicine/prescription-flow', handle: handleTmPrescriptionFlow, auth: true },
  { method: 'GET', path: '/api/v1/telemedicine/remote-consults', handle: handleTmRemoteConsults, auth: true },
  { method: 'GET', path: '/api/v1/telemedicine/revisits', handle: handleTmRevisits, auth: true },
  { method: 'GET', path: '/api/v1/telemedicine/advices', handle: handleTmAdvices, auth: true },
];
