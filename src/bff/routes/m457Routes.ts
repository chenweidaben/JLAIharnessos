/**
 * 健澜科技 jlmedaios - M457 院内医学知识库与编码字典（kb / coding）
 *
 * 临床指南 / 药品说明书 / ICD-10 / ICD-9-CM / 诊疗项目字典 / 编码映射
 * 避开 RAG 知识中台 CRUD/检索、FHIR terminology、CDS 既有口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/kb/clinical-guidelines - 临床指南（指南号/标题/病种/发布机构/更新版本）5 条 */
async function handleKbGuidelines(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CGD-001', guideNo: '指南号：GLN-CV-2024-01（冠心病诊疗指南）', title: '标题：中国稳定性冠心病诊断与治疗指南（2024 修订版）', disease: '病种：冠心病（稳定性心绞痛/二级预防）', org: '发布机构：中华医学会心血管病学分会', version: '更新版本：2024 版（替代 2018 版，已更新入库）' },
    { id: 'CGD-002', guideNo: '指南号：GLN-DM-2024-02（2 型糖尿病指南）', title: '标题：中国 2 型糖尿病防治指南（2024 年版）', disease: '病种：2 型糖尿病（血糖管理与并发症）', org: '发布机构：中华医学会糖尿病学分会', version: '更新版本：2024 版（HbA1c 目标与用药路径更新）' },
    { id: 'CGD-003', guideNo: '指南号：GLN-ST-2023-03（卒中指南）', title: '标题：中国急性缺血性脑卒中诊治指南（2023）', disease: '病种：缺血性脑卒中（急诊溶栓/二级预防）', org: '发布机构：中华医学会神经病学分会', version: '更新版本：2023 版（绿色通道流程更新）' },
    { id: 'CGD-004', guideNo: '指南号：GLN-COPD-2024-04（慢阻肺指南）', title: '标题：慢性阻塞性肺疾病诊治指南（2024 修订版）', disease: '病种：COPD（稳定期管理与急性加重）', org: '发布机构：中华医学会呼吸病学分会', version: '更新版本：2024 版（吸入治疗阶梯更新）' },
    { id: 'CGD-005', guideNo: '指南号：GLN-HT-2023-05（高血压指南）', title: '标题：中国高血压防治指南（2023 年版）', disease: '病种：原发性高血压（分层管理与靶目标）', org: '发布机构：中国高血压防治指南修订委员会', version: '更新版本：2023 版（家庭血压与分层标准更新）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/kb/drug-inserts - 药品说明书（药品名/规格/适应症/用法用量/禁忌）5 条 */
async function handleKbDrugInserts(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DRI-001', drug: '药品名：阿托伐他汀钙片（立普妥）', spec: '规格：20mg×7 片/盒', indication: '适应症：高胆固醇血症、冠心病二级预防降脂', dosage: '用法用量：口服，每日 1 次，起始 10–20mg，晚间服用', contra: '禁忌：活动性肝病、孕妇哺乳期、对成分过敏禁用' },
    { id: 'DRI-002', drug: '药品名：二甲双胍缓释片（格华止 XR）', spec: '规格：0.5g×30 片/盒', indication: '适应症：2 型糖尿病降糖（改善胰岛素抵抗）', dosage: '用法用量：随餐口服，起始 0.5g 每日 1 次，可渐增至 2g/日', contra: '禁忌：严重肾功能不全、代谢性酸中毒、严重感染禁用' },
    { id: 'DRI-003', drug: '药品名：阿莫西林胶囊', spec: '规格：0.25g×24 粒/盒', indication: '适应症：敏感菌呼吸道/泌尿/皮肤软组织感染', dosage: '用法用量：口服，成人 0.5g 每 6–8 小时 1 次，疗程 5–7 天', contra: '禁忌：青霉素过敏史禁用，传染性单核细胞增多症慎用' },
    { id: 'DRI-004', drug: '药品名：奥美拉唑肠溶胶囊', spec: '规格：20mg×14 粒/盒', indication: '适应症：胃食管反流、消化性溃疡抑酸', dosage: '用法用量：晨起空腹口服 20mg 每日 1 次，胃溃疡疗程 4–8 周', contra: '禁忌：对苯并咪唑类过敏禁用，长期使用需监测骨密度' },
    { id: 'DRI-005', drug: '药品名：门冬胰岛素 30 注射液（诺和锐 30）', spec: '规格：300IU/3mL 笔芯', indication: '适应症：2 型糖尿病餐后+基础血糖控制', dosage: '用法用量：餐前皮下注射，剂量个体化，每日 2 次', contra: '禁忌：低血糖发作期、对胰岛素过敏禁用' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/coding/icd10 - ICD-10诊断编码（编码/诊断名/章节/版本/启用状态）5 条 */
async function handleCodIcd10(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ICD-001', code: '编码：I21.4', diagnosis: '诊断名：急性非 ST 段抬高型心肌梗死（NSTEMI）', chapter: '章节：第 IX 章 循环系统疾病（I00–I99）', version: '版本：ICD-10（国家临床版 2.0）', enabled: '启用状态：启用（门诊/住院通用）' },
    { id: 'ICD-002', code: '编码：E11.9', diagnosis: '诊断名：2 型糖尿病（无并发症）', chapter: '章节：第 IV 章 内分泌、营养和代谢疾病（E00–E90）', version: '版本：ICD-10（国家临床版 2.0）', enabled: '启用状态：启用' },
    { id: 'ICD-003', code: '编码：I10', diagnosis: '诊断名：原发性（特发性）高血压', chapter: '章节：第 IX 章 循环系统疾病（I00–I99）', version: '版本：ICD-10（国家临床版 2.0）', enabled: '启用状态：启用' },
    { id: 'ICD-004', code: '编码：J44.1', diagnosis: '诊断名：慢性阻塞性肺疾病急性加重（AECOPD）', chapter: '章节：第 X 章 呼吸系统疾病（J00–J99）', version: '版本：ICD-10（国家临床版 2.0）', enabled: '启用状态：启用' },
    { id: 'ICD-005', code: '编码：I63.9', diagnosis: '诊断名：脑梗死（缺血性脑卒中，未特指）', chapter: '章节：第 IX 章 循环系统疾病（I00–I99）', version: '版本：ICD-10（国家临床版 2.0）', enabled: '启用状态：启用' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/coding/icd9cm - ICD-9-CM手术编码（手术编码/名称/类别/版本）5 条 */
async function handleCodIcd9cm(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'I9C-001', opCode: '手术编码：51.23', name: '名称：腹腔镜胆囊切除术（LC）', category: '类别：腹部手术（胆道）', version: '版本：ICD-9-CM-3（国家手术操作版 2.0）' },
    { id: 'I9C-002', opCode: '手术编码：81.54', name: '名称：全膝关节置换术（TKA）', category: '类别：骨科关节成形术', version: '版本：ICD-9-CM-3（国家手术操作版 2.0）' },
    { id: 'I9C-003', opCode: '手术编码：47.01', name: '名称：腹腔镜阑尾切除术', category: '类别：腹部手术（阑尾）', version: '版本：ICD-9-CM-3（国家手术操作版 2.0）' },
    { id: 'I9C-004', opCode: '手术编码：36.06', name: '名称：经皮冠状动脉腔内成形+支架植入（PCI）', category: '类别：心脏血管介入手术', version: '版本：ICD-9-CM-3（国家手术操作版 2.0）' },
    { id: 'I9C-005', opCode: '手术编码：85.21', name: '名称：乳腺局部肿物切除术（良性）', category: '类别：乳腺外科手术', version: '版本：ICD-9-CM-3（国家手术操作版 2.0）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/kb/diagnosis-items - 诊疗项目字典（项目码/名称/类别/收费类别/医保标识）5 条 */
async function handleKbDiagItems(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DIT-001', itemCode: '项目码：T-0101（血常规）', name: '名称：血常规五分类检验', category: '类别：检验类（血液常规）', feeType: '收费类别：检查检验费', insurance: '医保标识：甲类（医保全额/高比例报销）' },
    { id: 'DIT-002', itemCode: '项目码：T-0203（心电图）', name: '名称：常规十二导联心电图检查', category: '类别：检查类（心电功能检查）', feeType: '收费类别：检查费', insurance: '医保标识：甲类' },
    { id: 'DIT-003', itemCode: '项目码：T-0307（CT 平扫）', name: '名称：胸部 CT 平扫（影像检查）', category: '类别：影像检查类', feeType: '收费类别：影像检查费', insurance: '医保标识：乙类（自付一定比例）' },
    { id: 'DIT-004', itemCode: '项目码：T-0412（静脉输液）', name: '名称：静脉输液（含耗材，按次计）', category: '类别：治疗护理类', feeType: '收费类别：治疗费', insurance: '医保标识：甲类' },
    { id: 'DIT-005', itemCode: '项目码：T-0508（动态血压）', name: '名称：24 小时动态血压监测', category: '类别：功能检查类（监护/动态）', feeType: '收费类别：检查费', insurance: '医保标识：乙类' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/coding/mapping - 编码映射（源编码/目标编码/体系/映射关系/版本）5 条 */
async function handleCodMapping(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CDM-001', src: '源编码：本院本地诊断码 D-XN-0118（冠脉介入术后）', target: '目标编码：I21.4（ICD-10）/ 36.06（ICD-9-CM-3）', system: '体系：本地码 → ICD-10 诊断 + ICD-9-CM-3 手术', relation: '映射关系：一对一（本地码唯一对应标准码）', version: '版本：映射表 v2026.10' },
    { id: 'CDM-002', src: '源编码：本地药品码 DRG-ATV（阿托伐他汀）', target: '目标编码：国家医保药品编码 Y-ATV-020', system: '体系：院内药品码 → 医保编码', relation: '映射关系：一对多（同通用名多规格归并）', version: '版本：映射表 v2026.10' },
    { id: 'CDM-003', src: '源编码：本地诊疗码 SVC-CTCH（胸部 CT）', target: '目标编码：医保诊疗项目编码 Z-0307', system: '体系：院内项目码 → 医保诊疗项目', relation: '映射关系：一对一（项目码精确对应）', version: '版本：映射表 v2026.10' },
    { id: 'CDM-004', src: '源编码：本院 ICD-10 旧版 I21.4-2018', target: '目标编码：ICD-10 国家临床版 2.0 I21.4', system: '体系：旧版标准码 → 现行国家临床版', relation: '映射关系：一对一（版本迁移对照）', version: '版本：映射表 v2026.10' },
    { id: 'CDM-005', src: '源编码：本地收费科目 FEE-LAB（检验收入）', target: '目标编码：财务/医保统计科目 STAT-LAB', system: '体系：收费科目 → 统计报表科目', relation: '映射关系：多对一（多个检验明细归并统计）', version: '版本：映射表 v2026.10' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m457Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/kb/clinical-guidelines', handle: handleKbGuidelines, auth: true },
  { method: 'GET', path: '/api/v1/kb/drug-inserts', handle: handleKbDrugInserts, auth: true },
  { method: 'GET', path: '/api/v1/coding/icd10', handle: handleCodIcd10, auth: true },
  { method: 'GET', path: '/api/v1/coding/icd9cm', handle: handleCodIcd9cm, auth: true },
  { method: 'GET', path: '/api/v1/kb/diagnosis-items', handle: handleKbDiagItems, auth: true },
  { method: 'GET', path: '/api/v1/coding/mapping', handle: handleCodMapping, auth: true },
];
