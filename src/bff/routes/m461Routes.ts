/**
 * 健澜科技 jlmedaios - M461 职业暴露与院感风险预警（exposure / infection-risk）
 *
 * 暴露登记 / 伤口处理 / 随访监测 / 院感风险预警 / 职业暴露台账 / 风险评估
 * 避开 M444 院感监测（surveillance/hand-hygiene/env-swabs）、M459 医废CSSD、M14 AMS。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/exposure/register - 暴露登记（单号/暴露人/暴露类型/暴露源/发生时间）5 条 */
async function handleExpRegister(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EXP-001', ticketNo: '单号：EXP-20261019-001', person: '暴露人：外科 护士 李***（静脉穿刺操作）', type: '暴露类型：针刺伤（污染针头刺伤左手指）', source: '暴露源：门诊输液患者（HBV 阴性/HCV 阴性/HIV 阴性，已知检测）', time: '发生时间：2026-10-19 10:20:00（当班即时登记）' },
    { id: 'EXP-002', ticketNo: '单号：EXP-20261018-003', person: '暴露人：手术室 器械护士 王***', type: '暴露类型：黏膜暴露（血液溅入眼结膜）', source: '暴露源：术中患者（HBsAg 阳性，术前已知）', time: '发生时间：2026-10-18 15:40:00' },
    { id: 'EXP-003', ticketNo: '单号：EXP-20261016-002', person: '暴露人：检验科 检验技师 郑***', type: '暴露类型：锐器划伤（玻片边缘割伤）', source: '暴露源：未知患者标本（待源患者检测）', time: '发生时间：2026-10-16 09:10:00' },
    { id: 'EXP-004', ticketNo: '单号：EXP-20261012-001', person: '暴露人：急诊 医师 陈***', type: '暴露类型：针刺伤（采血针头刺伤）', source: '暴露源：急诊患者（HIV 待复查，初筛待确认）', time: '发生时间：2026-10-12 22:05:00（已启动 PEP 评估）' },
    { id: 'EXP-005', ticketNo: '单号：EXP-20261008-004', person: '暴露人：ICU 护士 孙***', type: '暴露类型：皮肤暴露（血液接触破损皮肤）', source: '暴露源：ICU 重症患者（多重耐药菌定植）', time: '发生时间：2026-10-08 14:30:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/exposure/wound-care - 伤口处理（单号/冲洗方式/消毒处理/处理人/时间）5 条 */
async function handleExpWoundCare(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WND-001', ticketNo: '单号：EXP-20261019-001（针刺伤）', wash: '冲洗方式：近心端向远心端轻挤出血，流动水+肥皂水冲洗 5 分钟', disinfection: '消毒处理：碘伏 + 75% 乙醇消毒伤口，无菌敷料覆盖', handler: '处理人：院感科 吴***（应急处置指导）', time: '时间：2026-10-19 10:25:00（15 分钟内完成处置）' },
    { id: 'WND-002', ticketNo: '单号：EXP-20261018-003（黏膜暴露）', wash: '冲洗方式：大量生理盐水/清水冲洗结膜囊 10 分钟，勿揉眼', disinfection: '消毒处理：眼科评估，无角膜损伤，局部预防性滴眼', handler: '处理人：院感科 + 眼科 联合处置', time: '时间：2026-10-18 15:50:00' },
    { id: 'WND-003', ticketNo: '单号：EXP-20261016-002（锐器划伤）', wash: '冲洗方式：流动水冲洗 + 挤出污血', disinfection: '消毒处理：碘伏消毒 2 遍，包扎；同步登记并送检源标本', handler: '处理人：检验科 组长 黄***', time: '时间：2026-10-16 09:15:00' },
    { id: 'WND-004', ticketNo: '单号：EXP-20261012-001（HIV 疑似针刺伤）', wash: '冲洗方式：挤出血 + 流动水/肥皂水冲洗 5–10 分钟', disinfection: '消毒处理：碘伏消毒，2 小时内启动 PEP 暴露后预防用药评估', handler: '处理人：院感科 + 感染科（PEP 专家组）', time: '时间：2026-10-12 22:20:00' },
    { id: 'WND-005', ticketNo: '单号：EXP-20261008-004（皮肤接触）', wash: '冲洗方式：破损皮肤处流动水+肥皂水反复冲洗', disinfection: '消毒处理：碘伏消毒，评估皮肤屏障，做好隔离防护', handler: '处理人：ICU 护士长 + 院感科', time: '时间：2026-10-08 14:40:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/exposure/followup - 随访监测（单号/检测项目/基线/随访时间/转归）5 条 */
async function handleExpFollowup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FLW-001', ticketNo: '单号：EXP-20261019-001', test: '检测项目：HBV/HCV/HIV 血清学（基线+随访）', baseline: '基线：暴露日 2026-10-19 检测（本人 HBV 抗体阳性，保护性）', followup: '随访时间：6 周 / 3 个月 / 6 个月复查', outcome: '转归：无感染（末次复查阴性，闭环）' },
    { id: 'FLW-002', ticketNo: '单号：EXP-20261018-003（HBsAg 源黏膜暴露）', test: '检测项目：HBV 两对半 + HBV DNA 随访', baseline: '基线：本人 HBsAb 阴性，已补种乙肝免疫球蛋白+疫苗', followup: '随访时间：即刻 / 1 个月 / 3 个月 / 6 个月', outcome: '转归：随访中（3 个月复查阴性，继续观察）' },
    { id: 'FLW-003', ticketNo: '单号：EXP-20261016-002（未知源）', test: '检测项目：HBV/HCV/HIV 基线 + 常规随访', baseline: '基线：2026-10-16 本人基线检测阴性', followup: '随访时间：6 周 / 3 个月 / 6 个月', outcome: '转归：随访中（源标本检测中，暂无异常）' },
    { id: 'FLW-004', ticketNo: '单号：EXP-20261012-001（HIV 疑似 PEP）', test: '检测项目：HIV 抗原抗体（基线/4 周/8 周/12 周）+ PEP 用药监测', baseline: '基线：2026-10-12 阴性，已服 PEP 28 天', followup: '随访时间：4 周 / 8 周 / 12 周 / 6 个月', outcome: '转归：随访中（4 周复查阴性，无药物严重不良反应）' },
    { id: 'FLW-005', ticketNo: '单号：EXP-20261008-004（耐药菌皮肤接触）', test: '检测项目：局部皮肤/定植监测（MRSA/CRE 等）', baseline: '基线：2026-10-08 本人无定植', followup: '随访时间：1 周 / 2 周监测定植', outcome: '转归：无定植（1 周复查阴性，闭环）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/infection-risk/alert - 院感风险预警（预警项/科室/风险等级/触发因素/处置）5 条 */
async function handleRiskAlert(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ALT-001', alertItem: '预警项：ICU 呼吸机相关肺炎（VAP）聚集趋势', dept: '科室：ICU', level: '风险等级：黄色（中度，2 周内 2 例）', trigger: '触发因素：床头抬高合规率下降 + 口腔护理记录缺失', action: '处置：督促集束化护理（VAP bundle），护士长复核整改' },
    { id: 'ALT-002', alertItem: '预警项：导尿管相关尿路感染（CAUTI）环比上升', dept: '科室：泌尿外科病房', level: '风险等级：黄色（中度）', trigger: '触发因素：留置导尿管平均天数偏高，拔管评估记录不足', action: '处置：落实每日拔管评估，缩短不必要置管' },
    { id: 'ALT-003', alertItem: '预警项：多重耐药菌（CRE）检出增加', dept: '科室：消化内科（老年病区）', level: '风险等级：橙色（较高，需重点隔离）', trigger: '触发因素：1 个月内 3 例 CRE 定植/感染，手卫生波动', action: '处置：接触隔离 + 单间/ cohort，加强手卫生与环境消毒' },
    { id: 'ALT-004', alertItem: '预警项：手术部位感染（SSI）监测环比', dept: '科室：普外科（择期清洁手术）', level: '风险等级：蓝色（关注，未达阈值）', trigger: '触发因素：2 例浅表切口感染，术前备皮/术前用药时点待查', action: '处置：纳入季度监测，核查围术期预防用药时点' },
    { id: 'ALT-005', alertItem: '预警项：静脉导管相关血流感染（CLABSI）', dept: '科室：血液透析室', level: '风险等级：蓝色（关注）', trigger: '触发因素：1 例可疑 CLABSI，穿刺点维护记录待完善', action: '处置：CLABSI bundle 复核，导管维护标准化培训' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/exposure/ledger - 职业暴露台账（年度汇总/暴露人次/类型分布/处理率/转归）5 条 */
async function handleExpLedger(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LGR-001', year: '年度汇总：2026 年（截至 10 月）', total: '暴露人次：18 人次（针刺伤 11 / 黏膜 3 / 皮肤 4）', dist: '类型分布：针刺伤占 61%，为主要类型', rate: '处理率：100%（均完成即时应急处置并登记）', outcome: '转归：无职业性感染（随访全部阴性/闭环）' },
    { id: 'LGR-002', year: '年度汇总：2025 年（全年）', total: '暴露人次：24 人次（针刺伤 15 / 黏膜 4 / 皮肤 5）', dist: '类型分布：针刺伤占 63%，护理岗高发', rate: '处理率：100%', outcome: '转归：无感染，1 例 PEP 随访阴性闭环' },
    { id: 'LGR-003', year: '年度汇总：2024 年（全年）', total: '暴露人次：21 人次', dist: '类型分布：针刺伤 13 / 黏膜 3 / 皮肤 5', rate: '处理率：100%', outcome: '转归：无感染' },
    { id: 'LGR-004', year: '岗位分布：护理岗（2026 年）', total: '暴露人次：12 人次（占全年 67%）', dist: '类型分布：静脉穿刺/拔针环节针刺伤为主', rate: '处理率：100%', outcome: '转归：无感染（已推广安全型针头）' },
    { id: 'LGR-005', year: '年度汇总：2023 年（全年）', total: '暴露人次：26 人次（历史最高，改造前）', dist: '类型分布：针刺伤占 70%，利器盒投放点不足', rate: '处理率：96%（1 例漏报后补登记）', outcome: '转归：无感染' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/infection-risk/assessment - 风险评估（科室/评估项/风险分/整改建议/责任人）5 条 */
async function handleRiskAssessment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RAS-001', dept: '科室：ICU', item: '评估项：导管相关感染（VAP/CLABSI/CAUTI）综合风险', score: '风险分：72/100（中高风险）', advice: '整改建议：强化 bundle 依从性核查、缩短不必要置管、每日评估拔管', owner: '责任人：ICU 护士长 + 院感科专职人员' },
    { id: 'RAS-002', dept: '科室：新生儿科/NICU', item: '评估项：新生儿院感与手卫生依从性', score: '风险分：64/100（中风险）', advice: '整改建议：提高手卫生依从率（目标≥95%），限制探视与入室消毒', owner: '责任人：NICU 护士长' },
    { id: 'RAS-003', dept: '科室：手术室', item: '评估项：手术部位感染与无菌技术执行', score: '风险分：58/100（中风险）', advice: '整改建议：术前备皮优化、围术期保温、皮肤消毒规范复核', owner: '责任人：手术室护士长 + 感控护士' },
    { id: 'RAS-004', dept: '科室：血液透析室', item: '评估项：血透相关血流感染与分区管理', score: '风险分：66/100（中高风险）', advice: '整改建议：严格内/外区与乙肝丙肝分区，穿刺点无菌维护', owner: '责任人：血透室主任 + 护士长' },
    { id: 'RAS-005', dept: '科室：内镜中心（软式内镜）', item: '评估项：内镜再处理（清洗消毒灭菌）风险', score: '风险分：55/100（中风险）', advice: '整改建议：再处理全流程可追溯、测漏与生物监测按期执行', owner: '责任人：内镜中心负责人 + CSSD 协同' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m461Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/exposure/register', handle: handleExpRegister, auth: true },
  { method: 'GET', path: '/api/v1/exposure/wound-care', handle: handleExpWoundCare, auth: true },
  { method: 'GET', path: '/api/v1/exposure/followup', handle: handleExpFollowup, auth: true },
  { method: 'GET', path: '/api/v1/infection-risk/alert', handle: handleRiskAlert, auth: true },
  { method: 'GET', path: '/api/v1/exposure/ledger', handle: handleExpLedger, auth: true },
  { method: 'GET', path: '/api/v1/infection-risk/assessment', handle: handleRiskAssessment, auth: true },
];
