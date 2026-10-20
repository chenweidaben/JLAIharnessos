/**
 * 健澜科技 jlmedaios - M468 药品不良反应监测与用药安全（adr/drug-safety/pharmacovigilance）
 *
 * 不良反应上报 / 因果关系评价 / 用药差错 / 药品召回 / 重点药品监控 / 用药安全审计
 * 避开 AMS 抗菌药物管理、CDS 规则/拦截/相互作用、院内药房调剂、营养膳食既有口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/adr/reports - 不良反应上报（报告号/患者/可疑药品/反应表现/严重程度/上报日期）5 条 */
async function handleAdrReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ADR-001', reportNo: '报告号：ADR-2026-0312', patient: '患者：女 58 岁（抗生素疗程第 5 天）', drug: '可疑药品：某头孢类抗菌药（静脉输注）', reaction: '反应表现：皮疹伴瘙痒（躯干散在红斑，无呼吸困难）', severity: '严重程度：一般（轻度，停药后缓解）', reportDate: '上报日期：2026-10-12（临床药师填报，已上报监测网）' },
    { id: 'ADR-002', reportNo: '报告号：ADR-2026-0318', patient: '患者：男 71 岁（心衰，使用利尿剂）', drug: '可疑药品：某袢利尿剂（长期口服）', reaction: '反应表现：电解质紊乱（低钾，乏力，复查血钾 3.1mmol/L）', severity: '严重程度：新的一般（需补钾纠正，未停药）', reportDate: '上报日期：2026-10-15' },
    { id: 'ADR-003', reportNo: '报告号：ADR-2026-0322', patient: '患者：女 34 岁（使用某造影剂增强 CT）', drug: '可疑药品：碘造影剂（静脉注射）', reaction: '反应表现：轻度过敏（面部潮红、荨麻疹，无喉头水肿）', severity: '严重程度：一般（抗组胺后缓解）', reportDate: '上报日期：2026-10-17（放射科上报）' },
    { id: 'ADR-004', reportNo: '报告号：ADR-2026-0325（严重）', patient: '患者：男 66 岁（使用某抗肿瘤靶向药）', drug: '可疑药品：某靶向口服药（长期治疗）', reaction: '反应表现：Ⅲ度皮疹 + 腹泻（剂量调整后恢复）', severity: '严重程度：严重（导致剂量调整，需住院观察）', reportDate: '上报日期：2026-10-18（24h 内上报，关联严重事件流程）' },
    { id: 'ADR-005', reportNo: '报告号：ADR-2026-0327', patient: '患者：女 45 岁（术后镇痛使用阿片类）', drug: '可疑药品：某阿片类镇痛药（静脉自控镇痛）', reaction: '反应表现：恶心呕吐 + 嗜睡（镇痛相关常见反应）', severity: '严重程度：一般（对症止吐，减量后缓解）', reportDate: '上报日期：2026-10-19（麻醉科上报）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/adr/assessment - 因果关系评价（报告号/药品/关联性评价/评价依据/结论/评价人）5 条 */
async function handleAdrAssessment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ASR-001', reportNo: '报告号：ADR-2026-0312（头孢皮疹）', drug: '药品：某头孢类抗菌药', relation: '关联性评价：很可能（停药皮疹消退，再激发未做）', basis: '评价依据：用药后合理时间出现、已知不良反应类型、停药好转、排除其他诱因', conclusion: '结论：判定为药品相关不良反应，记录归档', reviewer: '评价人：临床药师 郑*** + 药学部复核' },
    { id: 'ASR-002', reportNo: '报告号：ADR-2026-0318（利尿剂低钾）', drug: '药品：某袢利尿剂', relation: '关联性评价：可能（药物药理作用可致低钾，但合并进食差）', basis: '评价依据：长期用药、时间相关、补钾纠正，存在其他混杂因素', conclusion: '结论：可能相关，纳入用药监护提醒', reviewer: '评价人：临床药师 王***' },
    { id: 'ASR-003', reportNo: '报告号：ADR-2026-0322（造影剂过敏）', drug: '药品：碘造影剂', relation: '关联性评价：很可能（注射后即刻出现，既往无食物过敏混淆）', basis: '评价依据：速发型时间吻合、已知过敏反应谱、对症缓解', conclusion: '结论：判定为造影剂轻度过敏，记录过敏史', reviewer: '评价人：放射科 + 药师联合评价' },
    { id: 'ASR-004', reportNo: '报告号：ADR-2026-0325（靶向药严重皮疹）', drug: '药品：某抗肿瘤靶向药', relation: '关联性评价：肯定（剂量-反应关系明确，减量改善）', basis: '评价依据：已知靶药皮肤毒性谱、时间吻合、再暴露/减量可复现', conclusion: '结论：肯定相关，严重 ADR，上报并调整方案', reviewer: '评价人：肿瘤药师 + 主管医师 + 药学部' },
    { id: 'ASR-005', reportNo: '报告号：ADR-2026-0327（阿片恶心呕吐）', drug: '药品：某阿片类镇痛药', relation: '关联性评价：很可能（常见剂量相关不良反应）', basis: '评价依据：用药后出现、减量/止吐缓解、符合阿片已知反应', conclusion: '结论：判定为药品相关一般反应，镇痛方案优化', reviewer: '评价人：麻醉科药师 李***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/drug-safety/errors - 用药差错（差错类型/环节/涉及药品/后果/整改措施/责任人）5 条 */
async function handleDsErrors(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ERR-001', type: '差错类型：剂量差错（同类药日剂量超额，床旁核对拦截）', stage: '环节：护士给药前双人核对（拦截，未进入患者体内）', drug: '涉及药品：某口服降压药（规格混淆）', outcome: '后果：无伤害（隐患被拦截，未给药）', fix: '整改措施：药盒规格色标区分，执行床旁双核对留痕', owner: '责任人：内科三病区 + 护理质控' },
    { id: 'ERR-002', type: '差错类型：品种混淆（两种外观相似口服药）', stage: '环节：药房摆药（PDA 复核发现，未发到病区）', drug: '涉及药品：两种片剂外观相近（非同类）', outcome: '后果：无伤害（调配环节拦截）', fix: '整改措施：相似药分柜摆放，上架双盲核对', owner: '责任人：门诊药房组长' },
    { id: 'ERR-003', type: '差错类型：给药途径错误（拟肌注误选静脉，医嘱系统拦截）', stage: '环节：医嘱开具与执行核对', drug: '涉及药品：某肌内注射药', outcome: '后果：无伤害（系统+人工双重拦截）', fix: '整改措施：给药途径强制校验，禁止跨途径开具', owner: '责任人：医师 + 药师复核' },
    { id: 'ERR-004', type: '差错类型：时间差错（抗生素给药间隔偏移，漏给一次）', stage: '环节：病区给药执行（交接遗漏）', drug: '涉及药品：时间依赖性抗菌药', outcome: '后果：轻度（补给，未造成临床恶化）', fix: '整改措施：PDA 扫码发药闭环，漏给自动提醒', owner: '责任人：外科病区护理组' },
    { id: 'ERR-005', type: '差错类型：患者身份核对遗漏（床旁仅叫姓名未核腕带）', stage: '环节：床旁给药核对（被病友提醒后纠正）', drug: '涉及药品：普通口服药', outcome: '后果：无伤害（未给药即纠正）', fix: '整改措施：强制腕带扫码核对，杜绝口头称呼替代', owner: '责任人：责任护士 + 护士长督导' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/drug-safety/recall - 药品召回（批号/召回级别/召回数量/原因/处置状态）5 条 */
async function handleDsRecall(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RCL-001', batch: '批号：某抗菌药 20250618（厂家通知）', level: '召回级别：Ⅱ级（可能引起暂时性或可逆健康损害）', qty: '召回数量：本院在库 120 盒（已隔离冻结）', reason: '原因：厂家抽检含量偏差，主动召回批次', status: '处置状态：已下架隔离，退回供应商，台账登记' },
    { id: 'RCL-002', batch: '批号：某维生素注射液 20250902', level: '召回级别：Ⅲ级（一般，不会引起健康损害）', qty: '召回数量：在库 60 支', reason: '原因：包装标识瑕疵（非质量安全问题）', status: '处置状态：召回中（配合厂家回收）' },
    { id: 'RCL-003', batch: '批号：某口服降糖药 20250311', level: '召回级别：Ⅰ级（使用可能导致严重健康损害/死亡）', qty: '召回数量：在库 35 盒 + 在院患者在用清查', reason: '原因：活性成分含量异常（厂家紧急召回）', status: '处置状态：Ⅰ级响应：立即停售停发，清查在用患者并换药，上报药监' },
    { id: 'RCL-004', batch: '批号：某外用软膏 20251107', level: '召回级别：Ⅲ级', qty: '召回数量：在库 80 支', reason: '原因：有效期标注错误（厂家修正标签）', status: '处置状态：已退回，闭环' },
    { id: 'RCL-005', batch: '批号：某中成药颗粒 20250724', level: '召回级别：Ⅱ级', qty: '召回数量：在库 95 袋', reason: '原因：微生物限度抽检不合格', status: '处置状态：隔离待退，未再发放，跟踪复检结论' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacovigilance/monitor - 重点药品监控（药品/监控级别/使用量/异常信号/趋势）5 条 */
async function handlePvMonitor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PVM-001', drug: '药品：某三代头孢（重点监控抗菌药，限审批）', level: '监控级别：Ⅰ级重点（专项点评）', usage: '使用量：本月 1,860 支（环比 +6%，需关注增长）', signal: '异常信号：个别科室使用量异常偏高，待点评合理性', trend: '趋势：温和上升，纳入下月重点点评清单' },
    { id: 'PVM-002', drug: '药品：某质子泵抑制剂 PPI（长期使用监控）', level: '监控级别：Ⅱ级（常规点评）', usage: '使用量：本月 920 例次（预防用占比偏高）', signal: '异常信号：无指征长期预防用药比例需压缩', trend: '趋势：持平，持续干预降比例' },
    { id: 'PVM-003', drug: '药品：某注射用辅助用药（重点监控目录）', level: '监控级别：Ⅰ级（药占比严控）', usage: '使用量：本月 310 支（环比 -12%，干预见效）', signal: '异常信号：无新增异常，管控保持', trend: '趋势：下降，维持管控阈值' },
    { id: 'PVM-004', drug: '药品：某肠外营养/高警示药（双人核对）', level: '监控级别：Ⅰ级（高警示，标识管理）', usage: '使用量：本月 42 例（个体化调配）', signal: '异常信号：未见差错信号，调配规范', trend: '趋势：平稳，常规监护' },
    { id: 'PVM-005', drug: '药品：某新上市靶向药（新药首年监测）', level: '监控级别：Ⅰ级（新药安全性观察期）', usage: '使用量：本月 11 例（小样本观察）', signal: '异常信号：皮疹信号 1 例，持续随访无新信号', trend: '趋势：低量观察，积累安全性数据' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/drug-safety/audits - 用药安全审计（科室/处方数/不合理占比/主要问题/改进建议）5 条 */
async function handleDsAudits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AUD-001', dept: '科室：呼吸内科（本月处方点评）', rxCount: '处方数：486 张', irrational: '不合理占比：3.5%（17 张）', problem: '主要问题：抗菌药疗程偏长、无指征联用', suggestion: '改进建议：加强疗程点评，落实抗菌药分级审批反馈' },
    { id: 'AUD-002', dept: '科室：普外科（围术期用药审计）', rxCount: '处方数：352 张', irrational: '不合理占比：2.8%（10 张）', problem: '主要问题：预防用抗菌药启动时点偏晚、术后续用偏长', suggestion: '改进建议：规范术前 0.5-1h 给药，术后 24-48h 停用' },
    { id: 'AUD-003', dept: '科室：急诊科（处方快速点评）', rxCount: '处方数：628 张', irrational: '不合理占比：5.1%（32 张）', problem: '主要问题：急诊抗菌药经验性使用偏宽、剂量待优化', suggestion: '改进建议：推行经验用药路径，药师驻点实时审核' },
    { id: 'AUD-004', dept: '科室：儿科（特殊人群审计）', rxCount: '处方数：415 张', irrational: '不合理占比：1.9%（8 张）', problem: '主要问题：个别剂量按年龄折算不足、糖浆剂用法书写不清', suggestion: '改进建议：儿科剂量库标准化，说明书用法模板化' },
    { id: 'AUD-005', dept: '科室：门诊内科（常规月度审计）', rxCount: '处方数：1,240 张', irrational: '不合理占比：2.2%（27 张）', problem: '主要问题：重复用药、联用中成药成分叠加', suggestion: '改进建议：处方前置审核规则补充中成药相互作用' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m468Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/adr/reports', handle: handleAdrReports, auth: true },
  { method: 'GET', path: '/api/v1/adr/assessment', handle: handleAdrAssessment, auth: true },
  { method: 'GET', path: '/api/v1/drug-safety/errors', handle: handleDsErrors, auth: true },
  { method: 'GET', path: '/api/v1/drug-safety/recall', handle: handleDsRecall, auth: true },
  { method: 'GET', path: '/api/v1/pharmacovigilance/monitor', handle: handlePvMonitor, auth: true },
  { method: 'GET', path: '/api/v1/drug-safety/audits', handle: handleDsAudits, auth: true },
];
