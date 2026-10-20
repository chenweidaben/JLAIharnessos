/**
 * 健澜科技 jlmedaios - M466 医疗质控与不良事件管理（incident/quality）
 *
 * 不良事件上报 / 根因分析RCA / 整改闭环 / 质控通报 / 不良事件分级
 * （quality/indicators 质控指标已存在，此处不重复）。
 * 避开护理NQI、院感监测、职业暴露、整改任务、运营KPI 既有口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/incident/reports - 不良事件上报（事件号/类型/发生科室/时间/分级/报告人）5 条 */
async function handleIncidentReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AE-001', eventNo: '事件号：AE-2026-0142', type: '类型：给药错误（同类药剂量混淆，未造成伤害）', dept: '发生科室：内科三病区', time: '时间：2026-10-08 09:40', grade: '分级：Ⅳ 级（隐患/无伤害事件）', reporter: '报告人：责任护士 李***（主动上报）' },
    { id: 'AE-002', eventNo: '事件号：AE-2026-0147', type: '类型：跌倒（老年患者下床跌倒，皮外伤）', dept: '发生科室：骨科二病区', time: '时间：2026-10-11 21:15', grade: '分级：Ⅲ 级（轻度伤害，需观察处理）', reporter: '报告人：夜班护士 王***' },
    { id: 'AE-003', eventNo: '事件号：AE-2026-0150', type: '类型：标本送检错误（血标本标签与患者不符，发现后重采）', dept: '发生科室：检验科 + 门诊采血岗', time: '时间：2026-10-14 10:30', grade: '分级：Ⅳ 级（未送达，流程拦截）', reporter: '报告人：检验技师 张***' },
    { id: 'AE-004', eventNo: '事件号：AE-2026-0153', type: '类型：压疮（院外带入Ⅱ期压疮，非院内发生）', dept: '发生科室：老年医学科', time: '时间：2026-10-16 08:20（入院评估发现）', grade: '分级：Ⅲ 级（院内记录跟踪，非新发）', reporter: '报告人：责任护士 陈***' },
    { id: 'AE-005', eventNo: '事件号：AE-2026-0155', type: '类型：管路滑脱（胃管非计划脱出，重新置管）', dept: '发生科室：神经外科 ICU', time: '时间：2026-10-18 03:50', grade: '分级：Ⅱ 级（中度伤害，需重新处置）', reporter: '报告人：ICU 护士 周***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/incident/rca - 根因分析RCA（事件号/根本原因/5why分析/改进措施/责任人）5 条 */
async function handleIncidentRca(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RCA-001', eventNo: '事件号：AE-2026-0142（给药错误）', rootCause: '根本原因：同类药品外观/摆放相邻，核对环节双人复核未落到床旁', why: '5Why：为何混淆→相邻摆放；为何相邻→药架分区不清；为何不清→标准化摆放缺失；为何缺失→培训不到位；为何培训不到位→环节标准未固化', action: '改进措施：药架按药理分区+色标，床旁双人核对录音留痕，全员再培训', owner: '责任人：护理部 林*** + 内科三病区护士长' },
    { id: 'RCA-002', eventNo: '事件号：AE-2026-0147（跌倒）', rootCause: '根本原因：高危跌倒评估阳性但床栏/陪护告知落实不到位，夜间助行设施不足', why: '5Why：为何跌倒→未用助行器；为何不用→未告知；为何未告知→评估后干预衔接断档；为何断档→交接班未复核；为何断档→跌倒干预清单未清单化', action: '改进措施：高危跌倒挂牌+跌倒干预清单逐项交接，增配夜灯/扶手，陪护书面告知', owner: '责任人：骨科二病区护士长 + 护理质控' },
    { id: 'RCA-003', eventNo: '事件号：AE-2026-0150（标本标签错误）', rootCause: '根本原因：采血后贴标依赖单人完成，未执行采血点腕带+试管双核对', why: '5Why：为何错标→单人贴标；为何单人→流程未强制双人；为何未强制→PDA 扫码未启用；为何未启用→条码闭环未上线；为何未上线→信息环节排期', action: '改进措施：过渡期执行采血点腕带-试管双人核对，推进标本条码 PDA 闭环', owner: '责任人：检验科 + 门诊护士长 + 信息科' },
    { id: 'RCA-004', eventNo: '事件号：AE-2026-0155（管路滑脱）', rootCause: '根本原因：约束/固定方式在躁动期失效，镇静评估与管路固定巡检频次不足', why: '5Why：为何滑脱→固定失效；为何失效→躁动未预判；为何未预判→镇静评分未联动；为何未联动→评分结果未触发护理动作；为何未触发→流程未闭环', action: '改进措施：管路双重固定+躁动预警联动增频巡检，镇静评分纳入交接班', owner: '责任人：神外 ICU 护士长 + 危重症质控' },
    { id: 'RCA-005', eventNo: '事件号：AE-2026-0138（上月口服药漏发，RCA 归档）', rootCause: '根本原因：交接班时未核对发药执行记录，漏发无系统提醒', why: '5Why：为何漏发→未核对；为何未核对→清单缺失；为何缺失→发药闭环未做系统拦截；为何未拦截→依赖人工；为何依赖人工→电子化核对未覆盖', action: '改进措施：口服药 PDA 扫码发药闭环（已上线试点），漏发自动提醒', owner: '责任人：护理部 + 信息科（已闭环归档）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/incident/followup - 整改闭环（事件号/整改项/完成状态/验证结果/关闭日期）5 条 */
async function handleIncidentFollowup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CLS-001', eventNo: '事件号：AE-2026-0142（给药错误）', item: '整改项：药架分区色标 + 床旁双人核对固化', status: '完成状态：已完成（措施落地并培训）', verify: '验证结果：护理部抽查 3 个病区执行符合，未再发生同类', closeDate: '关闭日期：2026-10-16（验证通过关闭）' },
    { id: 'CLS-002', eventNo: '事件号：AE-2026-0147（跌倒）', item: '整改项：跌倒干预清单 + 夜灯/扶手增配', status: '完成状态：已完成（硬件到位，清单交接落地）', verify: '验证结果：骨科二病区连续 2 周无高危跌倒事件', closeDate: '关闭日期：2026-10-19（验证通过关闭）' },
    { id: 'CLS-003', eventNo: '事件号：AE-2026-0150（标本标签错误）', item: '整改项：过渡期双人核对 + 标本条码闭环排期', status: '完成状态：部分完成（人工核对已落地，PDA 闭环建设中）', verify: '验证结果：人工核对阶段零错标；系统项列入下月里程碑', closeDate: '关闭日期：暂不关闭（跟踪至条码闭环上线）' },
    { id: 'CLS-004', eventNo: '事件号：AE-2026-0155（管路滑脱）', item: '整改项：双重固定 + 躁动预警联动巡检', status: '完成状态：已完成（固定规范已修订并培训）', verify: '验证结果：ICU 复查管路固定符合率 100%', closeDate: '关闭日期：2026-10-19（验证通过关闭）' },
    { id: 'CLS-005', eventNo: '事件号：AE-2026-0138（口服药漏发，归档）', item: '整改项：口服药 PDA 扫码发药闭环', status: '完成状态：已完成（试点病区上线）', verify: '验证结果：试点区漏发清零，拟全院推广', closeDate: '关闭日期：2026-09-28（验证通过关闭，归档）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/quality/bulletin - 质控通报（通报号/周期/问题汇总/要求/发布日期）5 条 */
async function handleQualityBulletin(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BUL-001', bulletinNo: '通报号：QCB-2026-10（10 月上旬质控月报）', period: '周期：2026-10-01 至 10-15', summary: '问题汇总：给药核对执行参差、跌倒高危干预衔接断档、标本贴标单人操作', require: '要求：各病区 10 月底前完成分区色标/跌倒清单/双人核对自查，质控科复查', publishDate: '发布日期：2026-10-18（质控科发布，全院传阅）' },
    { id: 'BUL-002', bulletinNo: '通报号：QCB-2026-09（9 月质控月报）', period: '周期：2026-09-01 至 09-30', summary: '问题汇总：口服药漏发 1 起、压疮评估记录不完整 3 处、交接班记录缺项', require: '要求：完善发药闭环与压疮评估留痕，纳入本月护理质量考核', publishDate: '发布日期：2026-10-05' },
    { id: 'BUL-003', bulletinNo: '通报号：QCB-2026-W41（周通报）', period: '周期：2026-10-06 至 10-12', summary: '问题汇总：2 起跌倒事件、1 起给药差错（Ⅳ级），无菌物品效期检查 2 处临近', require: '要求：重点病区开展跌倒/给药专项自查，周内反馈', publishDate: '发布日期：2026-10-13' },
    { id: 'BUL-004', bulletinNo: '通报号：QCB-2026-08（8 月质控月报）', period: '周期：2026-08-01 至 08-31', summary: '问题汇总：导管相关感染监测指标改善，护理记录书写完整性提升', require: '要求：巩固成效，保持每班评估留痕，表扬达标病区', publishDate: '发布日期：2026-09-06（正向通报）' },
    { id: 'BUL-005', bulletinNo: '通报号：QCB-2026-W42（周通报）', period: '周期：2026-10-13 至 10-19', summary: '问题汇总：管路固定规范落实、标本双人核对执行良好，个别病房手卫生依从性回落', require: '要求：手卫生专项抽查，高风险科室加测，下周反馈', publishDate: '发布日期：2026-10-19' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/incident/grading - 不良事件分级（事件号/I级II级III级IV级/判定依据/审批）5 条 */
async function handleIncidentGrading(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'GRD-001', eventNo: '事件号：AE-2026-0142', level: '定级：Ⅳ 级（无伤害/隐患事件）', basis: '判定依据：给药错误在送达前被拦截，未造成患者伤害，按无伤害定级', approve: '审批：护理部 + 质控科双签确认Ⅳ级，纳入非处罚主动上报统计' },
    { id: 'GRD-002', eventNo: '事件号：AE-2026-0147', level: '定级：Ⅲ 级（轻度伤害事件）', basis: '判定依据：跌倒致皮外伤，简单处理无需额外治疗，属轻度伤害', approve: '审批：护理部定级Ⅲ级，需 RCA 并闭环跟踪，报分管院长备案' },
    { id: 'GRD-003', eventNo: '事件号：AE-2026-0155', level: '定级：Ⅱ 级（中度伤害事件）', basis: '判定依据：胃管非计划脱出需重新置管、增加患者痛苦与操作，属中度伤害', approve: '审批：质控委员会定级Ⅱ级，启动专项 RCA，限期整改并上报卫健委备案' },
    { id: 'GRD-004', eventNo: '事件号：AE-2026-0153', level: '定级：Ⅲ 级（院外带入，非院内新发）', basis: '判定依据：压疮入院即存在（院外带入），院内仅记录跟踪护理，不计院内新发伤害', approve: '审批：护理部确认Ⅲ级记录属性，避免误计入院内压疮' },
    { id: 'GRD-005', eventNo: '事件号：（Ⅰ级示例）AE-2026-0099（假设，极严重）', level: '定级：Ⅰ 级（极严重事件/未遂至重伤需上报）', basis: '判定依据：造成或可能造成患者死亡/永久功能损害的极严重事件，须即时上报', approve: '审批：院级质量安全委员会定级Ⅰ级，24h 内上报上级卫生行政部门并启动调查' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m466Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/incident/reports', handle: handleIncidentReports, auth: true },
  { method: 'GET', path: '/api/v1/incident/rca', handle: handleIncidentRca, auth: true },
  { method: 'GET', path: '/api/v1/incident/followup', handle: handleIncidentFollowup, auth: true },
  { method: 'GET', path: '/api/v1/quality/bulletin', handle: handleQualityBulletin, auth: true },
  { method: 'GET', path: '/api/v1/incident/grading', handle: handleIncidentGrading, auth: true },
];
