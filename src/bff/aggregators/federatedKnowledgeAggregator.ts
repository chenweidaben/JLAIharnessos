/**
 * 健澜科技 jlmedaios - 跨院知识联邦聚合器（M133-C，SaaS化+智慧度）
 *
 * 【SaaS化 + 智慧度】
 *  - SaaS 多租户：同一套 BFF 以「本租户医院」为知识接收方，从联邦成员医院
 *    拉取已脱敏的临床知识（路径 / 用药 / 诊断 / 教训），各院数据不出域、
 *    只交换脱敏后的「组织记忆」，天然满足数据本地化与互联互通要求；
 *  - 智慧度：对端高成功率经验按 successRate 降序联邦汇聚，失败教训（lesson）
 *    前置暴露，帮助本院少走弯路，形成跨院协同的智慧沉淀。
 *
 * 医疗安全红线：
 *  - 跨院知识必须脱敏，严禁携带患者 / 医生个人信息（PII）出域；
 *  - 本模块只做知识检索、排序与脱敏，不改变医嘱、不强制改派诊疗方案；
 *  - 跨院推荐仅作医师辅助参考，最终诊疗决策由主管医师作出并签名负责。
 *
 * 纯函数核心（可单测、不碰库、不碰 WebSocket、零新增依赖）：
 *  - federateKnowledge(sourceHospitalId, targetHospitalId, knowledgeType)：
 *      以 sourceHospitalId（本院/接收方）为视角，从联邦对端医院联邦汇聚同类型
 *      知识，逐条脱敏后按「成功率降序 → 使用次数降序 → 标题字典序升序」返回；
 *  - anonymizeKnowledge(knowledge, sourceHospitalId)：
 *      剥离患者/医生 PII 字段并掩码正文内的手机号/身份证/工号/署名/患者姓名，
 *      返回可跨院共享的 Knowledge 副本（不修改入参）。
 *
 * 权限：federated:knowledge:view（admin 全量放行）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 跨院知识类型白名单（与院内 dept_knowledge 对齐，lesson 为失败教训） */
export type FederatedKnowledgeType = 'pathway' | 'drug' | 'diagnosis' | 'lesson';

/** 合法知识类型枚举 */
export const FEDERATED_KNOWLEDGE_TYPES: readonly FederatedKnowledgeType[] = [
  'pathway',
  'drug',
  'diagnosis',
  'lesson',
];

/** 跨院浏览所需业务权限码 */
export const FEDERATED_KNOWLEDGE_PERMISSION = 'federated:knowledge:view';

/**
 * 本院（SaaS 租户医院）：跨院联邦的知识接收方。
 * 本医院自身的知识不参与联邦回传（本院已有，避免重复与自我暴露）。
 */
export const LOCAL_HOSPITAL_ID = 'HOSP-HOME';

/** 联邦成员医院注册表（hospitalId → 对外机构简称；不登记地址/法人等敏感信息） */
export const FEDERATED_HOSPITALS: Readonly<Record<string, string>> = {
  [LOCAL_HOSPITAL_ID]: '健澜示范医院（本院）',
  'HOSP-A': '华东协作医院A',
  'HOSP-B': '华东协作医院B',
  'HOSP-C': '华北协作医院C',
};

/** 联邦对端医院通配符：跨全部成员院联邦汇聚 */
export const FEDERATION_WILDCARD = '*';

/**
 * 原始跨院知识：对端医院本地沉淀，可能携带 PII，
 * 在出域 / 跨院共享前必须经 anonymizeKnowledge 脱敏。
 */
export interface RawHospitalKnowledge {
  /** 知识沉淀所在医院编码（对应 FEDERATED_HOSPITALS） */
  hospitalId: string;
  /** 知识类型 */
  knowledgeType: FederatedKnowledgeType;
  /** 条目标题 */
  title: string;
  /** 知识正文（可能夹带 PII，出域前掩码） */
  content: string;
  /* ------- 以下为 PII 字段，严禁随跨院知识出域 ------- */
  /** 关联患者姓名（不出域） */
  patientName?: string;
  /** 关联患者 ID（不出域） */
  patientId?: string;
  /** 作者/医生姓名（不出域） */
  authorName?: string;
  /** 作者/医生工号（不出域） */
  authorId?: string;
  /** 作者联系电话（不出域） */
  authorPhone?: string;
  /** 关联患者身份证号（不出域） */
  idCard?: string;
  /* ------- PII 字段结束 ------- */
  /** 采纳成功率 0~1 */
  successRate: number;
  /** 累计被采纳/调用次数 */
  usageCount: number;
}

/** 脱敏后可跨院共享的知识（联邦出域契约，绝不携带 PII） */
export interface Knowledge {
  /** 知识来源医院编码 */
  sourceHospitalId: string;
  /** 知识来源机构对外简称 */
  sourceHospitalName: string;
  /** 知识类型 */
  knowledgeType: FederatedKnowledgeType;
  /** 条目标题 */
  title: string;
  /** 知识正文（已脱敏，无 PII） */
  content: string;
  /** 采纳成功率 0~1 */
  successRate: number;
  /** 累计使用次数 */
  usageCount: number;
  /** 恒为 true：标记本条已通过跨院脱敏 */
  anonymized: boolean;
}

/** 正文 PII 掩码占位（与 hospitalKnowledgeAggregator 口径一致） */
const MASK = '「已脱敏」';

/* ------------------------------ 正文脱敏 ------------------------------ */

/**
 * 掩码知识正文中的个人标识：手机号 / 身份证号 / 工号 / 作者署名 / 患者姓名。
 * 纯函数：输入字符串 → 输出字符串，不抛错。
 */
function desensitizeContent(raw: string): string {
  return (raw ?? '')
    .replace(/1[3-9]\d{9}/g, MASK) // 手机号
    .replace(/\d{17}[\dXx]/g, MASK) // 身份证号
    .replace(/(工号|职工号|编号)\s*[:：]?\s*[A-Za-z0-9]+/g, `$1：${MASK}`)
    .replace(/(作者|署名)\s*[:：]?\s*[\u4e00-\u9fa5]{2,4}/g, `$1：${MASK}`)
    .replace(/(患者|病人)\s*[:：]?\s*[\u4e00-\u9fa5]{2,4}/g, `$1：${MASK}`);
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * anonymizeKnowledge：跨院知识出域脱敏。
 *
 * 口径：
 *  1. 彻底剥离 PII 字段（patientName/patientId/authorName/authorId/authorPhone/idCard），
 *     脱敏后的 Knowledge 结构中不包含任何患者/医生个人标识字段；
 *  2. 正文经 desensitizeContent 掩码手机号 / 身份证 / 工号 / 署名 / 患者姓名；
 *  3. 标注来源医院 sourceHospitalId 与对外机构简称 sourceHospitalName；
 *  4. 纯函数：返回全新对象副本，不修改入参；anonymized 恒为 true。
 *
 * @param knowledge         对端医院原始知识（可携带 PII）
 * @param sourceHospitalId  知识来源医院编码（用于标注来源；缺省回退 knowledge.hospitalId）
 * @returns 可跨院共享的脱敏知识
 */
export function anonymizeKnowledge(
  knowledge: RawHospitalKnowledge,
  sourceHospitalId?: string,
): Knowledge {
  const src = (sourceHospitalId ?? knowledge?.hospitalId ?? '').trim();
  return {
    sourceHospitalId: src,
    sourceHospitalName: FEDERATED_HOSPITALS[src] ?? src,
    knowledgeType: knowledge.knowledgeType,
    title: knowledge.title ?? '',
    content: desensitizeContent(knowledge.content ?? ''),
    successRate: Number(knowledge.successRate) || 0,
    usageCount: Number(knowledge.usageCount) || 0,
    anonymized: true,
  };
}

/**
 * federateKnowledge：跨院知识联邦汇聚。
 *
 * 口径：
 *  1. knowledgeType 不在白名单 → 返回 []；
 *  2. sourceHospitalId（本院/接收方）为空 → 返回 []；
 *  3. targetHospitalId 为联邦对端医院：
 *     - 传 FEDERATION_WILDCARD（'*'）：跨全部联邦成员医院汇聚；
 *     - 传具体对端 hospitalId：仅汇聚该对端；
 *     - 对端 === 本院 sourceHospitalId（查询自身）→ 返回 []（跨院不回传本院知识）；
 *     - 对端不在 FEDERATED_HOSPITALS 注册表 → 返回 []；
 *  4. 从 FEDERATED_POOL 收集「对端医院 + 同知识类型」条目，逐条经 anonymizeKnowledge 脱敏；
 *  5. 排序：successRate 降序 → usageCount 降序 → title 字典序升序，结果确定、可单测；
 *  6. 纯函数：返回全新数组与对象，不修改 FEDERATED_POOL / 入参。
 *
 * @param sourceHospitalId  本院（知识接收方）医院编码
 * @param targetHospitalId  联邦对端医院编码，或 '*' 表示跨全部成员院
 * @param knowledgeType     知识类型（pathway/drug/diagnosis/lesson）
 * @returns 跨院脱敏知识列表（已排序）
 */
export function federateKnowledge(
  sourceHospitalId: string,
  targetHospitalId: string,
  knowledgeType: FederatedKnowledgeType,
): Knowledge[] {
  const requester = (sourceHospitalId ?? '').trim();
  if (!requester || !FEDERATED_KNOWLEDGE_TYPES.includes(knowledgeType)) return [];

  const peer = (targetHospitalId ?? '').trim();

  // 解析允许汇聚的对端医院集合
  let allowedPeers: ReadonlySet<string>;
  if (peer === FEDERATION_WILDCARD || peer === '') {
    // 跨全部成员院，但排除本院自身
    allowedPeers = new Set(
      Object.keys(FEDERATED_HOSPITALS).filter((h) => h !== requester),
    );
  } else {
    // 指定对端：必须是已注册成员，且不能是本院自身
    if (peer === requester) return [];
    if (!FEDERATED_HOSPITALS[peer]) return [];
    allowedPeers = new Set([peer]);
  }

  // 联邦收集对端同类型知识并逐条脱敏
  const collected: Knowledge[] = [];
  for (const raw of FEDERATED_POOL) {
    if (raw.knowledgeType !== knowledgeType) continue;
    if (!allowedPeers.has(raw.hospitalId)) continue;
    collected.push(anonymizeKnowledge(raw, raw.hospitalId));
  }

  // 排序：成功率降序 → 使用次数降序 → 标题字典序升序
  return collected.sort((a, b) => {
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.title.localeCompare(b.title);
  });
}

/* ------------------------------ 权限判定 ------------------------------ */

/**
 * canViewFederation：跨院知识浏览权限纯判定（供路由与单测共用）。
 * 口径与 requirePermissionCode 对齐：admin 全量放行；其余需显式持有
 * federated:knowledge:view 权限码。
 *
 * @param roles       当前用户角色列表
 * @param permissions 当前用户权限码列表（可空）
 */
export function canViewFederation(
  roles: readonly string[],
  permissions?: readonly string[],
): boolean {
  if (roles.includes('admin')) return true;
  return !!permissions && permissions.includes(FEDERATED_KNOWLEDGE_PERMISSION);
}

/* ------------------------------ 联邦基线 ------------------------------ */

/**
 * 确定性联邦知识基线（对端医院本地沉淀，含 PII 字段与正文 PII，
 * 用于演示与单测：验证出域前已被彻底脱敏）。
 * 生产环境可由各院联邦节点经安全网关替换为实时拉取，纯函数口径不变。
 */
export const FEDERATED_POOL: RawHospitalKnowledge[] = [
  // HOSP-A 华东协作医院A
  {
    hospitalId: 'HOSP-A',
    knowledgeType: 'pathway',
    title: '急性STEMI 院内绿色通道路径',
    content: 'D-to-B ≤90min 双抗+他汀负荷，门球一体；参考病例作者：王建国 13812345678。',
    patientName: '李某某',
    patientId: 'P-10023',
    authorName: '王建国',
    authorId: 'GH-A-0091',
    authorPhone: '13812345678',
    successRate: 0.95,
    usageCount: 210,
  },
  {
    hospitalId: 'HOSP-A',
    knowledgeType: 'drug',
    title: '围术期低分子肝素桥接方案',
    content: '桥接期每日依诺肝素 1mg/kg q12h，术前 24h 末次停用；工号：A-2048 作者：赵敏。',
    authorName: '赵敏',
    authorId: 'GH-A-2048',
    successRate: 0.9,
    usageCount: 88,
  },
  // HOSP-B 华东协作医院B
  {
    hospitalId: 'HOSP-B',
    knowledgeType: 'diagnosis',
    title: '不明原因发热（FUO）分层诊断路径',
    content: '感染/肿瘤/自身免疫三分流，PCT+血培养先行，避免经验性广谱抗生素滥用。',
    authorName: '陈立新',
    authorId: 'GH-B-1177',
    successRate: 0.88,
    usageCount: 132,
  },
  {
    hospitalId: 'HOSP-B',
    knowledgeType: 'lesson',
    title: '教训：造影剂肾病漏监测',
    content: '患者：孙某某 造影后 48h 未复查肌酐，发生 AKI；后续强制 eGFR 基线+72h 内复查。',
    patientName: '孙某某',
    patientId: 'P-20981',
    authorName: '周涛',
    authorId: 'GH-B-3302',
    idCard: '330106199001011234',
    successRate: 0.97,
    usageCount: 64,
  },
  // HOSP-C 华北协作医院C
  {
    hospitalId: 'HOSP-C',
    knowledgeType: 'pathway',
    title: '2 型糖尿病胰岛素强化路径',
    content: '三短一长方案，空腹目标 4.4~7.0mmol/L，警惕夜间低血糖并配备动态血糖监测。',
    authorName: '刘芳',
    authorId: 'GH-C-5510',
    successRate: 0.92,
    usageCount: 176,
  },
  {
    hospitalId: 'HOSP-C',
    knowledgeType: 'drug',
    title: '老年多重用药精简（ deprescribing ）清单',
    content: 'PIM 筛查优先停用苯二氮䓬与长效磺脲类，每次复诊评估用药清单。',
    authorName: '刘洋',
    authorId: 'GH-C-6621',
    successRate: 0.86,
    usageCount: 57,
  },
];

/* ------------------------------- 对外视图 ------------------------------- */

/** 归一知识类型，非法值回退 pathway */
function normalizeType(type: string | undefined): FederatedKnowledgeType {
  return FEDERATED_KNOWLEDGE_TYPES.includes(type as FederatedKnowledgeType)
    ? (type as FederatedKnowledgeType)
    : 'pathway';
}

/** GET /api/v1/federated/knowledge 返回的视图 data */
export interface FederatedKnowledgeView {
  /** 本院（知识接收方）医院编码 */
  requesterHospitalId: string;
  /** 联邦对端医院（'*' 表示跨全部成员院） */
  targetHospitalId: string;
  /** 查询的知识类型 */
  knowledgeType: FederatedKnowledgeType;
  /** 汇聚到的跨院知识条数 */
  count: number;
  /** 跨院脱敏知识列表（已排序） */
  items: Knowledge[];
  /** 视图生成时间（ISO 8601） */
  generatedAt: string;
}

/**
 * getFederatedKnowledgeView：跨院知识联邦视图（路由层入口）。
 *
 * @param type     知识类型（pathway/drug/diagnosis/lesson，缺省或非法回退 pathway）
 * @param requester 本院（接收方）医院编码，缺省 LOCAL_HOSPITAL_ID
 * @param peer     联邦对端医院编码，缺省 '*'（跨全部成员院）
 */
export function getFederatedKnowledgeView(
  type: string | undefined,
  requester?: string,
  peer?: string,
): FederatedKnowledgeView {
  const normalized = normalizeType(type);
  const from = (requester ?? '').trim() || LOCAL_HOSPITAL_ID;
  const to = (peer ?? '').trim() || FEDERATION_WILDCARD;
  const items = federateKnowledge(from, to, normalized);
  return {
    requesterHospitalId: from,
    targetHospitalId: to,
    knowledgeType: normalized,
    count: items.length,
    items,
    generatedAt: new Date().toISOString(),
  };
}
