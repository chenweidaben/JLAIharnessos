/**
 * 健澜科技 jlmedaios - 跨科室知识联邦深化聚合器（M146-C）
 *
 * 【越用越聪明深化】
 *  在 M133-C 跨院联邦、M145-B 跨科室知识推荐之上，本模块把「科室间临床知识关联」
 *  结构化为带证据强度（confidence 0~1）的知识关系图：
 *   - 心内科   → 急诊科：胸痛中心绿色通道 / 急性心衰抢救 / 恶性心律失常复苏后衔接；
 *   - 内分泌科 → 营养科：糖尿病医学营养治疗（MNT）/ 体重管理 / 肾病低蛋白饮食；
 *   - 外科     → 麻醉科：围术期评估 / 合并心血管病手术麻醉风险 / 术后镇痛。
 *  所有关系均锚定权威指南（见 evidence 字段），不臆造医学关联；
 *  confidence < MIN_CONFIDENCE(0.5) 的关系一律不进入推荐结果——跨科推荐宁少勿滥。
 *
 * 医疗安全红线：
 *  - 本聚合器为纯函数：不触库、不调外部 LLM、不碰 WebSocket、零新增依赖；
 *  - 只做知识检索与图谱构建，不改变医嘱、不强制改派诊疗方案；
 *  - 跨科推荐仅作医师辅助参考，最终诊疗决策由主管医师作出并签名负责；
 *  - 未命中时 matched=false / 空数组明确返回，绝不硬凑推荐。
 *
 * 纯函数契约（可单测）：
 *  - crossDeptKnowledgeFederation(deptA, deptB, condition)：
 *      返回两科室之间围绕 condition 的全部可推荐知识关系（confidence 降序）；
 *  - findKnowledgeRelations(symptom, disease)：
 *      同一关系上同时命中「症状 + 疾病」的跨科知识关系（二者缺一不推荐）；
 *  - buildKnowledgeGraphNode(diseaseId)：
 *      以某疾病为中心节点，聚合其全部跨科知识关系（邻接边）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 科室编码表（与 clinical.departments.code 对齐） */
export const DEPARTMENT_NAMES: Readonly<Record<string, string>> = {
  'DEP-CARDIO': '心血管内科（心内科）',
  'DEP-ED': '急诊科',
  'DEP-ENDO': '内分泌科',
  'DEP-NUTRITION': '营养科',
  'DEP-SURG': '外科',
  'DEP-ANES': '麻醉科',
};

/**
 * 跨科映射白名单（越用越聪明深化）：key = 发起科室编码，value = 联邦协同科室编码。
 * 仅登记经指南背书的三组强关联，其余科室对默认不产生联邦推荐。
 */
export const CROSS_DEPT_MAP: Readonly<Record<string, readonly string[]>> = {
  'DEP-CARDIO': ['DEP-ED'],        // 心内科 → 急诊科
  'DEP-ENDO': ['DEP-NUTRITION'],   // 内分泌 → 营养科
  'DEP-SURG': ['DEP-ANES'],        // 外科 → 麻醉科
};

/** 跨科知识关系类型 */
export type CrossDeptRelationType =
  | 'emergency_link'    // 急诊绿色通道 / 急危重症衔接
  | 'nutrition_care'     // 营养医学协同
  | 'perioperative'      // 围术期协同（评估/术中/镇痛）
  | 'consult';           // 跨科会诊

/** 一条跨科室知识关系（与 medmuse.knowledge_relation 同构，BFF 层 camelCase） */
export interface Relation {
  /** 稳定业务 id */
  id: string;
  /** 发起科室编码 */
  deptA: string;
  /** 发起科室中文名 */
  deptAName: string;
  /** 协同科室编码 */
  deptB: string;
  /** 协同科室中文名 */
  deptBName: string;
  /** 关系类型 */
  relationType: CrossDeptRelationType;
  /** 关联状况 / 临床场景 */
  condition: string;
  /** 跨科协同要点说明 */
  description: string;
  /** 证据强度 0~1（源自指南共识等级与临床路径吻合度） */
  confidence: number;
  /** 证据来源：指南 / 共识名称（可溯源） */
  evidence: string;
  /** 关联疾病 id 列表（见 DISEASE_REGISTRY） */
  diseaseIds: string[];
  /** 关联症状关键词列表 */
  symptoms: string[];
}

/** 知识图谱节点（某疾病为中心，携带其全部跨科知识关系边） */
export interface GraphNode {
  /** 疾病 id（DIS-*） */
  diseaseId: string;
  /** 疾病中文名 */
  name: string;
  /** 首诊主管科室编码 */
  primaryDept: string;
  /** 疾病简述 */
  description: string;
  /** 是否命中种子知识；false 时 relations 为空，前端应明确提示「暂无可信跨科关联」 */
  matched: boolean;
  /** 该疾病相关的全部可推荐跨科关系边（confidence 降序） */
  relations: Relation[];
}

/** 疾病注册表（种子图谱内唯一，不携带任何患者信息） */
export interface DiseaseEntry {
  name: string;
  primaryDept: string;
  description: string;
}

/** 推荐置信度阈值：低于该分数一律不推荐（生产红线：宁少勿滥） */
export const MIN_CONFIDENCE = 0.5;

/* ------------------------------- 种子知识 ------------------------------- */

/** 疾病注册表（越用越聪明深化：每一条均锚定权威指南） */
export const DISEASE_REGISTRY: Readonly<Record<string, DiseaseEntry>> = {
  'DIS-ACS': {
    name: '急性冠脉综合征（含急性心肌梗死）',
    primaryDept: 'DEP-CARDIO',
    description: '冠状动脉急性闭塞导致的心肌缺血/坏死，首诊常表现为急诊胸痛。',
  },
  'DIS-HF-ACUTE': {
    name: '急性心力衰竭',
    primaryDept: 'DEP-CARDIO',
    description: '急性发作的心功能异常，以肺水肿/心源性休克为主要表现。',
  },
  'DIS-ARRHY': {
    name: '恶性心律失常',
    primaryDept: 'DEP-CARDIO',
    description: '室速/室颤等可致血流动力学不稳定的心律失常，需急诊复苏衔接电生理。',
  },
  'DIS-T2DM': {
    name: '2型糖尿病',
    primaryDept: 'DEP-ENDO',
    description: '以慢性高血糖为特征的代谢病，降糖治疗须与医学营养治疗（MNT）并行。',
  },
  'DIS-OBESITY': {
    name: '肥胖症',
    primaryDept: 'DEP-ENDO',
    description: '能量正平衡导致的慢性代谢性疾病，体重管理需膳食处方协同。',
  },
  'DIS-DN': {
    name: '糖尿病肾病',
    primaryDept: 'DEP-ENDO',
    description: '糖尿病微血管并发症，需低蛋白饮食等营养干预延缓进展。',
  },
  'DIS-GDM': {
    name: '妊娠期糖尿病',
    primaryDept: 'DEP-ENDO',
    description: '妊娠期首次发现的糖代谢异常，医学营养管理为一线措施。',
  },
  'DIS-SURG-ABDO': {
    name: '腹部外科手术（胆囊/阑尾/疝等）',
    primaryDept: 'DEP-SURG',
    description: '择期/急诊腹部手术，须由麻醉科完成术前评估与术中管理。',
  },
  'DIS-CARDIAC-SURG-RISK': {
    name: '合并心血管基础病的外科手术',
    primaryDept: 'DEP-SURG',
    description: '冠心病/高血压患者拟行外科手术，麻醉前须完成心血管风险分层。',
  },
  'DIS-POSTOP-PAIN': {
    name: '外科术后疼痛',
    primaryDept: 'DEP-SURG',
    description: '术后切口痛与内脏痛，由麻醉科主导多模式镇痛与 PACU 复苏管理。',
  },
};

/**
 * 跨科室知识关系种子池（越用越聪明深化）：
 * 每条关系 = 两科室 + 临床场景 + 证据强度 + 指南出处，可溯源、不臆造。
 * 仅覆盖 CROSS_DEPT_MAP 白名单内的三组科室对。
 */
export const KNOWLEDGE_RELATIONS: readonly Relation[] = [
  // ---------------- 心内科 ↔ 急诊科 ----------------
  {
    id: 'REL-CARDIO-ED-01',
    deptA: 'DEP-CARDIO', deptAName: DEPARTMENT_NAMES['DEP-CARDIO'],
    deptB: 'DEP-ED', deptBName: DEPARTMENT_NAMES['DEP-ED'],
    relationType: 'emergency_link',
    condition: '急性冠脉综合征胸痛中心绿色通道',
    description: '急诊首诊胸痛患者按胸痛中心流程快速筛查，确诊 STEMI 后绕行病房直接送入导管室行再灌注治疗；心内科与急诊科在分诊、D-to-B 时间窗上无缝衔接。',
    confidence: 0.96,
    evidence: '《胸痛中心建设标准》中华医学会心血管病学分会；急性 ST 段抬高型心肌梗死诊断和治疗指南',
    diseaseIds: ['DIS-ACS'],
    symptoms: ['压榨样胸痛', '胸闷', '大汗', '濒死感', '放射至左肩背'],
  },
  {
    id: 'REL-CARDIO-ED-02',
    deptA: 'DEP-CARDIO', deptAName: DEPARTMENT_NAMES['DEP-CARDIO'],
    deptB: 'DEP-ED', deptBName: DEPARTMENT_NAMES['DEP-ED'],
    relationType: 'emergency_link',
    condition: '急性左心衰抢救与 CCU 衔接',
    description: '急诊科先行体位/氧疗/利尿扩血管抢救，病情相对稳定后转入心内科 CCU 进一步病因治疗与血流动力学监测。',
    confidence: 0.9,
    evidence: '中国心力衰竭诊断和治疗指南',
    diseaseIds: ['DIS-HF-ACUTE'],
    symptoms: ['呼吸困难', '端坐呼吸', '粉红色泡沫痰', '夜间阵发性呼吸困难'],
  },
  {
    id: 'REL-CARDIO-ED-03',
    deptA: 'DEP-CARDIO', deptAName: DEPARTMENT_NAMES['DEP-CARDIO'],
    deptB: 'DEP-ED', deptBName: DEPARTMENT_NAMES['DEP-ED'],
    relationType: 'emergency_link',
    condition: '恶性心律失常急诊复苏后电生理衔接',
    description: '急诊科心肺复苏/电除颤/临时起搏维持循环后，由心内科电生理团队评估猝死风险、决定后续 ICD 植入与消融方案。',
    confidence: 0.88,
    evidence: '室性心律失常中国专家共识；心脏性猝死防治指南',
    diseaseIds: ['DIS-ARRHY'],
    symptoms: ['心悸', '晕厥', '意识丧失', '黑矇'],
  },

  // ---------------- 内分泌科 ↔ 营养科 ----------------
  {
    id: 'REL-ENDO-NUT-01',
    deptA: 'DEP-ENDO', deptAName: DEPARTMENT_NAMES['DEP-ENDO'],
    deptB: 'DEP-NUTRITION', deptBName: DEPARTMENT_NAMES['DEP-NUTRITION'],
    relationType: 'nutrition_care',
    condition: '2型糖尿病医学营养治疗（MNT）',
    description: '内分泌科制定降糖方案，营养科同步出具个体化膳食处方（总热量/碳水计数/升糖指数），二者联合使 HbA1c 达标率显著优于单纯药物治疗。',
    confidence: 0.93,
    evidence: '中国2型糖尿病防治指南；中国糖尿病医学营养治疗指南',
    diseaseIds: ['DIS-T2DM'],
    symptoms: ['多饮', '多尿', '体重下降', '血糖升高'],
  },
  {
    id: 'REL-ENDO-NUT-02',
    deptA: 'DEP-ENDO', deptAName: DEPARTMENT_NAMES['DEP-ENDO'],
    deptB: 'DEP-NUTRITION', deptBName: DEPARTMENT_NAMES['DEP-NUTRITION'],
    relationType: 'nutrition_care',
    condition: '肥胖症医学体重管理',
    description: '内分泌科评估肥胖合并症（代谢综合征/PCOS），营养科提供低能量平衡膳食处方与行为干预，作为药物/手术治疗的基础。',
    confidence: 0.86,
    evidence: '中国肥胖症诊疗指南；减重药物临床应用专家共识',
    diseaseIds: ['DIS-OBESITY'],
    symptoms: ['超重', '腹型肥胖', '体重指数升高'],
  },
  {
    id: 'REL-ENDO-NUT-03',
    deptA: 'DEP-ENDO', deptAName: DEPARTMENT_NAMES['DEP-ENDO'],
    deptB: 'DEP-NUTRITION', deptBName: DEPARTMENT_NAMES['DEP-NUTRITION'],
    relationType: 'nutrition_care',
    condition: '糖尿病肾病低蛋白饮食干预',
    description: '已出现蛋白尿/肾功能下降的糖友，由营养科制定优质低蛋白（0.6~0.8 g/kg/d）联合 α-酮酸处方，内分泌科同步优化降糖降压方案以延缓 eGFR 下降。',
    confidence: 0.8,
    evidence: '糖尿病肾病防治专家共识；慢性肾脏病蛋白营养治疗专家共识',
    diseaseIds: ['DIS-DN', 'DIS-T2DM'],
    symptoms: ['水肿', '蛋白尿', '血肌酐升高'],
  },
  {
    id: 'REL-ENDO-NUT-04',
    deptA: 'DEP-ENDO', deptAName: DEPARTMENT_NAMES['DEP-ENDO'],
    deptB: 'DEP-NUTRITION', deptBName: DEPARTMENT_NAMES['DEP-NUTRITION'],
    relationType: 'nutrition_care',
    condition: '妊娠期糖尿病医学营养管理',
    description: 'GDM 一经确诊即启动营养科医学营养治疗（分餐/低 GI 膳食），内分泌科随访血糖谱，必要时加用胰岛素，目标为母胎安全。',
    confidence: 0.75,
    evidence: '妊娠期高血糖诊治指南',
    diseaseIds: ['DIS-GDM'],
    symptoms: ['孕期血糖升高', '妊娠期多饮'],
  },

  // ---------------- 外科 ↔ 麻醉科 ----------------
  {
    id: 'REL-SURG-ANES-01',
    deptA: 'DEP-SURG', deptAName: DEPARTMENT_NAMES['DEP-SURG'],
    deptB: 'DEP-ANES', deptBName: DEPARTMENT_NAMES['DEP-ANES'],
    relationType: 'perioperative',
    condition: '腹部外科手术围术期麻醉管理',
    description: '外科确定手术指征与方案后，麻醉科完成术前访视与 ASA 分级、制定麻醉方案与液体策略，术中维持生命体征稳定，术后转入 PACU 复苏。',
    confidence: 0.95,
    evidence: '中国麻醉学指南与专家共识；围术期患者安全管理规范',
    diseaseIds: ['DIS-SURG-ABDO'],
    symptoms: ['术前评估', '拟行手术', '术前禁食禁饮'],
  },
  {
    id: 'REL-SURG-ANES-02',
    deptA: 'DEP-SURG', deptAName: DEPARTMENT_NAMES['DEP-SURG'],
    deptB: 'DEP-ANES', deptBName: DEPARTMENT_NAMES['DEP-ANES'],
    relationType: 'perioperative',
    condition: '合并心血管基础病患者手术麻醉风险评估',
    description: '冠心病/高血压/心衰拟手术患者，麻醉科联合心内科完成 Goldman/RCRI 风险分层与围术期β阻滞剂/抗血小板用药桥接，平衡出血与缺血风险。',
    confidence: 0.88,
    evidence: '围术期心血管评估指南；ACC/AHA 非心脏手术围术期评估',
    diseaseIds: ['DIS-CARDIAC-SURG-RISK', 'DIS-ACS'],
    symptoms: ['高血压', '术前胸闷', '活动后气促'],
  },
  {
    id: 'REL-SURG-ANES-03',
    deptA: 'DEP-SURG', deptAName: DEPARTMENT_NAMES['DEP-SURG'],
    deptB: 'DEP-ANES', deptBName: DEPARTMENT_NAMES['DEP-ANES'],
    relationType: 'perioperative',
    condition: '术后多模式镇痛与 PACU 复苏',
    description: '麻醉科主导切口局部浸润+阿片节省的多模式镇痛方案，外科负责切口与引流管理，共同降低术后谵妄/心肺并发症并加速康复（ERAS）。',
    confidence: 0.82,
    evidence: '中国髋/膝关节置换术加速康复围术期管理策略专家共识；术后疼痛管理指南',
    diseaseIds: ['DIS-POSTOP-PAIN'],
    symptoms: ['术后疼痛', '切口痛', '术后恶心呕吐'],
  },
];

/* ------------------------------- 内部工具 ------------------------------- */

/** 判断科室编码是否合法（白名单内） */
function isKnownDept(deptCode: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEPARTMENT_NAMES, deptCode);
}

/** 科室输入归一：接受编码（DEP-*）或中文名任一写法，大小写/空白不敏感；无法识别返回 null */
export function normalizeDept(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  // 编码直配
  if (isKnownDept(raw.toUpperCase())) return raw.toUpperCase();
  // 中文名反查（含「心内科」「外科」等口语化简称）
  for (const [code, name] of Object.entries(DEPARTMENT_NAMES)) {
    if (name === raw || name.includes(raw) || raw.includes(name)) return code;
  }
  // 口语别名
  const alias: Readonly<Record<string, string>> = {
    '心内科': 'DEP-CARDIO',
    '心血管内科': 'DEP-CARDIO',
    '急诊': 'DEP-ED',
    '内分泌': 'DEP-ENDO',
    '营养': 'DEP-NUTRITION',
    '普外': 'DEP-SURG',
    '麻醉': 'DEP-ANES',
  };
  return alias[raw] ?? null;
}

/** 置信度过滤：confidence >= MIN_CONFIDENCE 才允许推荐（<0.5 一律不推荐） */
export function isRecommendable(confidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= MIN_CONFIDENCE;
}

/** 按 confidence 降序、再按 id 升序稳定排序 */
function byConfidenceDesc(a: Relation, b: Relation): number {
  if (b.confidence !== a.confidence) return b.confidence - a.confidence;
  return a.id.localeCompare(b.id);
}

/** 返回关系的深拷贝（纯函数：绝不泄露内部可变引用） */
function cloneRelation(r: Relation): Relation {
  return {
    ...r,
    diseaseIds: [...r.diseaseIds],
    symptoms: [...r.symptoms],
  };
}

/** 子串包含匹配（大小写不敏感） */
function contains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/* ------------------------------- 纯函数 ------------------------------- */

/**
 * 跨科室知识联邦：返回 deptA ↔ deptB 之间围绕 condition 的全部可推荐知识关系。
 *
 * 规则（越用越聪明深化，宁少勿滥）：
 *  - deptA / deptB 任一无法识别为白名单科室 → 返回空数组（不臆造跨科关系）；
 *  - 两科室对不在 CROSS_DEPT_MAP 白名单内 → 返回空数组（只推经过指南背书的科室对）；
 *  - condition 非空时进一步匹配 relation.condition 或疾病名包含该关键词；
 *  - 结果一律过滤 confidence >= MIN_CONFIDENCE(0.5)，按 confidence 降序返回拷贝。
 *
 * @param deptA     发起科室（编码或中文名）
 * @param deptB     协同科室（编码或中文名）
 * @param condition 临床场景/疾病关键词；传 '*' 或空串表示不限场景
 */
export function crossDeptKnowledgeFederation(
  deptA: string,
  deptB: string,
  condition?: string,
): Relation[] {
  const a = normalizeDept(deptA ?? '');
  const b = normalizeDept(deptB ?? '');
  if (!a || !b) return [];
  if (a === b) return []; // 同科室不构成跨科联邦
  // 白名单校验：仅 CROSS_DEPT_MAP 登记的科室对可推荐（双向等价）
  const paired =
    (CROSS_DEPT_MAP[a] ?? []).includes(b) || (CROSS_DEPT_MAP[b] ?? []).includes(a);
  if (!paired) return [];

  const cond = (condition ?? '').trim();
  return KNOWLEDGE_RELATIONS.filter((r) => {
    // 无向科室对匹配（A↔B 两种登记方向都认）
    const hitPair =
      (r.deptA === a && r.deptB === b) || (r.deptA === b && r.deptB === a);
    if (!hitPair) return false;
    if (!cond || cond === '*') return true;
    // 场景关键词：命中 condition 描述或任一关联疾病名即算相关
    const diseaseHit = r.diseaseIds.some((did) =>
      contains(DISEASE_REGISTRY[did]?.name ?? '', cond),
    );
    return contains(r.condition, cond) || diseaseHit;
  })
    .filter((r) => isRecommendable(r.confidence))
    .map(cloneRelation)
    .sort(byConfidenceDesc);
}

/**
 * 症状 → 疾病的跨科知识关联检索。
 *
 * 准确性红线（跨科知识关联要准确，不能乱推荐）：
 *  - symptom 与 disease 必须同时命中「同一条」关系——
 *    即：症状关键词出现在该关系 symptoms[] 中，且疾病命中该关系 diseaseIds 对应疾病名；
 *  - 任一参数为空 → 返回空数组（绝不凭单侧线索硬凑推荐）；
 *  - 置信度 < 0.5 不推荐；结果按 confidence 降序返回拷贝。
 *
 * @param symptom 症状关键词（如「压榨样胸痛」「多饮」）
 * @param disease 疾病关键词（如「急性冠脉综合征」「2型糖尿病」）
 */
export function findKnowledgeRelations(symptom: string, disease: string): Relation[] {
  const sym = (symptom ?? '').trim();
  const dis = (disease ?? '').trim();
  if (!sym || !dis) return [];

  return KNOWLEDGE_RELATIONS.filter((r) => {
    const symptomHit =
      r.symptoms.some((s) => contains(s, sym) || contains(sym, s)) ||
      contains(r.condition, sym);
    const diseaseHit =
      r.diseaseIds.some((did) => {
        const entry = DISEASE_REGISTRY[did];
        return entry && (contains(entry.name, dis) || contains(dis, entry.name));
      }) || contains(r.condition, dis);
    return symptomHit && diseaseHit; // 二者必须落在同一条关系上
  })
    .filter((r) => isRecommendable(r.confidence))
    .map(cloneRelation)
    .sort(byConfidenceDesc);
}

/**
 * 以某疾病为中心构建知识图谱节点：聚合该疾病全部跨科知识关系边。
 *
 * - diseaseId 可传疾病编码（DIS-*）或疾病中文名/关键词；
 * - 命中：返回节点（primaryDept 取注册表主管科室），relations 为该疾病全部
 *   confidence >= 0.5 的跨科关系（降序拷贝）；
 * - 未命中：matched=false、relations=[]，前端据此提示「暂无可信跨科关联」，绝不臆造。
 */
export function buildKnowledgeGraphNode(diseaseId: string): GraphNode {
  const raw = (diseaseId ?? '').trim();
  const empty: GraphNode = {
    diseaseId: raw,
    name: raw,
    primaryDept: '',
    description: '',
    matched: false,
    relations: [],
  };
  if (!raw) return empty;

  // 1) 编码直查
  let entry = DISEASE_REGISTRY[raw.toUpperCase()];
  let matchedId = raw.toUpperCase();
  // 2) 名称/关键词反查
  if (!entry) {
    for (const [id, e] of Object.entries(DISEASE_REGISTRY)) {
      if (contains(e.name, raw) || contains(raw, e.name)) {
        entry = e;
        matchedId = id;
        break;
      }
    }
  }
  if (!entry) return empty;

  const relations = KNOWLEDGE_RELATIONS.filter((r) => r.diseaseIds.includes(matchedId))
    .filter((r) => isRecommendable(r.confidence))
    .map(cloneRelation)
    .sort(byConfidenceDesc);

  return {
    diseaseId: matchedId,
    name: entry.name,
    primaryDept: entry.primaryDept,
    description: entry.description,
    matched: true,
    relations,
  };
}
