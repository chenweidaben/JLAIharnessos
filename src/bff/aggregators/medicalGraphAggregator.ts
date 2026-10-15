/**
 * 健澜科技 jlmedaios - 医学知识图谱聚合器（M131-D，AI 能力深化）
 *
 * 面向临床辅助决策（CDS）的「疾病—症状—药物—检查—手术」知识图谱：
 *  1. 节点查询   searchMedicalNodes(keyword, type?)      —— 按关键词/类型检索医学概念；
 *  2. 关系遍历   queryMedicalGraph(startNode, relation?) —— 从某节点出发一跳展开邻接图；
 *  3. 路径搜索   findMedicalPaths(from, to, maxDepth)    —— 两节点之间的有向简单路径。
 *
 * 【AI 能力深化】
 *   相对传统 CDS 规则表（if-else 硬编码），知识图谱把医学关系结构化为二部图：
 *   - 医生输入「胸痛」即可沿 symptom_suggests_disease 边反推冠心病，再沿
 *     disease_treated_by_drug / disease_needs_exam 边展开完整诊疗建议链；
 *   - 处方审核侧沿 drug_interacts_with_drug 边做 DDI 双向遍历，输出风险路径
 *     （如 阿司匹林 → 华法林：出血风险），把「告警」升级为「可解释推理链」；
 *   - 路径搜索为后续多 Agent 推理（鉴别诊断 Agent 调用图推理工具）预留图接口。
 *
 * 医疗安全红线：
 *  - 本聚合器纯函数：不触库、不调外部 LLM、不碰 WebSocket、零新增依赖；
 *  - 种子知识源自国内权威指南/专家共识摘要（见各节点 sources），不包含任何
 *    患者个人标识符；
 *  - 所有结果固定附带免责声明「仅供参考，不构成医疗建议」；
 *  - 未命中节点时 matched=false 明确返回空图，绝不臆造医学关系。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 节点类型：疾病 / 症状 / 药物 / 检查 / 手术 / 科室（M147-A 新增科室） */
export type MedicalGraphNodeType =
  | 'disease'
  | 'symptom'
  | 'drug'
  | 'exam'
  | 'surgery'
  | 'department';

/** 边类型（有向医学关系；M147-A 新增 disease_visit_department 疾病→科室） */
export type MedicalGraphRelation =
  | 'disease_has_symptom'        // 疾病 → 症状
  | 'disease_treated_by_drug'    // 疾病 → 药物
  | 'symptom_suggests_disease'   // 症状 → 疾病
  | 'drug_interacts_with_drug'  // 药物 → 药物（DDI）
  | 'disease_needs_exam'         // 疾病 → 检查
  | 'disease_has_surgery'        // 疾病 → 手术
  | 'disease_visit_department';  // 疾病 → 科室（首诊 / 转诊）

/**
 * 关系细分 qualifier（M147-A）：
 *   disease_has_symptom     → 常见 / 鉴别
 *   disease_treated_by_drug → 一线 / 二线
 *   disease_needs_exam       → 必做 / 选做
 *   disease_visit_department → 首诊 / 转诊
 * 其余关系（症状反推 / DDI / 手术）留空串。
 */
export type EdgeQualifier = '' | '常见' | '鉴别' | '一线' | '二线' | '必做' | '选做' | '首诊' | '转诊';

/** 图节点（与 clinical.medical_graph_node 同构） */
export interface GraphNode {
  /** 稳定 id（种子图内唯一；生产库对应 node_code） */
  id: string;
  /** 中文标准名 */
  name: string;
  /** 节点类型 */
  type: MedicalGraphNodeType;
  /** 概念简述 */
  description: string;
  /** 来源：指南 / 教材名称 + 年份（可溯源） */
  sources: Array<{ name: string; year?: string }>;
  /** 证据强度 0~1 */
  evidenceLevel: number;
}

/** 图边（与 clinical.medical_graph_edge 同构） */
export interface GraphEdge {
  /** 起点节点 id */
  source: string;
  /** 终点节点 id */
  target: string;
  /** 关系类型 */
  relation: MedicalGraphRelation;
  /** 中文短标注 */
  label: string;
  /** 关系强度 0~1（DDI 边为风险等级） */
  weight: number;
  /**
   * 关系细分（M147-A）：常见/鉴别、一线/二线、必做/选做、首诊/转诊；
   * 旧种子边未标注时为空串，读取侧用 edgeQualifier() 兜底。
   */
  qualifier?: EdgeQualifier;
}

/** 两节点之间的一条有向推理路径 */
export interface GraphPath {
  /** 路径上的节点 id 序列（含起点与终点） */
  nodes: string[];
  /** 相邻节点间的关系序列 */
  relations: MedicalGraphRelation[];
  /** 相邻节点间的中文标注序列 */
  labels: string[];
}

/** queryMedicalGraph 返回信封（前端力导向图直接消费 nodes / edges） */
export interface GraphResult {
  /** 命中的起点节点；未命中为 null */
  startNode: GraphNode | null;
  /** 图节点列表（起点 + 一跳邻接；路径模式下含路径中间节点） */
  nodes: GraphNode[];
  /** 图边列表 */
  edges: GraphEdge[];
  /** 请求时指定的关系类型过滤；未指定为 null */
  relationType: MedicalGraphRelation | null;
  /** 是否命中起点节点 */
  matched: boolean;
  /** 一跳邻接节点数 */
  neighborCount: number;
  /** 若指定 endNode，返回两节点间的有向路径（最多 MAX_PATHS 条） */
  paths: GraphPath[];
  /** 固定免责声明 */
  disclaimer: string;
}

/* ------------------------------ 常量与词典 ------------------------------ */

/** 关系类型 → 中文标注（前端边 label 默认值） */
export const RELATION_LABELS: Record<MedicalGraphRelation, string> = {
  disease_has_symptom: '典型症状',
  disease_treated_by_drug: '推荐用药',
  symptom_suggests_disease: '提示疾病',
  drug_interacts_with_drug: '相互作用',
  disease_needs_exam: '所需检查',
  disease_has_surgery: '可选手术',
  disease_visit_department: '就诊科室',
};

/** 节点类型 → 中文标注（前端图例） */
export const NODE_TYPE_LABELS: Record<MedicalGraphNodeType, string> = {
  disease: '疾病',
  symptom: '症状',
  drug: '药物',
  exam: '检查',
  surgery: '手术',
  department: '科室',
};

/** 合法边类型枚举（路由层参数校验用） */
export const ALL_RELATIONS: MedicalGraphRelation[] = [
  'disease_has_symptom',
  'disease_treated_by_drug',
  'symptom_suggests_disease',
  'drug_interacts_with_drug',
  'disease_needs_exam',
  'disease_has_surgery',
  'disease_visit_department',
];

/** 合法节点类型枚举 */
export const ALL_NODE_TYPES: MedicalGraphNodeType[] = [
  'disease',
  'symptom',
  'drug',
  'exam',
  'surgery',
  'department',
];

/** 路径搜索最大跳数（防止图爆炸；临床推理 4 跳已覆盖完整诊疗链） */
export const MAX_PATH_DEPTH = 4;

/** 路径搜索最多返回条数 */
export const MAX_PATHS = 16;

/** 固定免责声明（医疗安全红线） */
export const GRAPH_DISCLAIMER =
  '本图谱内容整理自权威医学指南，仅供临床参考，不构成医疗建议；具体诊疗请结合患者实际由执业医师判断。';

/* --------------------------- 权威医学知识种子 --------------------------- */
/* 【AI 能力深化】种子来源：中国高血压/2型糖尿病/冠心病/社区获得性肺炎/   */
/* 消化性溃疡/急性缺血性脑卒中等诊疗指南与抗血小板治疗专家共识（脱敏摘要）。 */

/** 节点种子：6 疾病 / 12 症状 / 14 药物 / 9 检查 / 3 手术 */
export const GRAPH_NODES: GraphNode[] = [
  // —— 疾病 ——
  { id: 'D-HTN', name: '高血压', type: 'disease', description: '体循环动脉血压持续升高（收缩压≥140mmHg 和/或舒张压≥90mmHg）的慢性心血管综合征。', sources: [{ name: '中国高血压防治指南', year: '2024' }], evidenceLevel: 0.95 },
  { id: 'D-DM2', name: '2型糖尿病', type: 'disease', description: '以胰岛素抵抗伴分泌不足为特征的代谢性疾病，慢性高血糖为核心标志。', sources: [{ name: '中国2型糖尿病防治指南', year: '2020' }], evidenceLevel: 0.95 },
  { id: 'D-CHD', name: '冠心病', type: 'disease', description: '冠状动脉粥样硬化致血管腔狭窄/闭塞，引起心肌缺血缺氧或坏死的心脏病。', sources: [{ name: '稳定性冠心病诊断与治疗指南', year: '2018' }], evidenceLevel: 0.95 },
  { id: 'D-CAP', name: '社区获得性肺炎', type: 'disease', description: '在医院外罹患的感染性肺实质炎症，常见病原体为肺炎链球菌、支原体等。', sources: [{ name: '社区获得性肺炎诊断和治疗指南', year: '2016' }], evidenceLevel: 0.9 },
  { id: 'D-PU', name: '胃溃疡', type: 'disease', description: '胃黏膜防御因子与侵袭因子失衡致胃黏膜局限性缺损，幽门螺杆菌为主要病因。', sources: [{ name: '消化性溃疡诊断与治疗规范', year: '2022' }], evidenceLevel: 0.9 },
  { id: 'D-IS', name: '脑梗死', type: 'disease', description: '脑部血液供应障碍致脑组织缺血性坏死/软化，约占全部脑卒中的 70%~80%。', sources: [{ name: '中国急性缺血性脑卒中诊治指南', year: '2023' }], evidenceLevel: 0.95 },

  // —— 症状 ——
  { id: 'S-DIZZ', name: '头晕', type: 'symptom', description: '头昏、头胀、失衡感的主观感觉，高血压常见神经系统表现。', sources: [{ name: '诊断学', year: '2018' }], evidenceLevel: 0.7 },
  { id: 'S-HEAD', name: '头痛', type: 'symptom', description: '额颞枕部疼痛，血压骤升时可出现搏动性头痛。', sources: [{ name: '诊断学', year: '2018' }], evidenceLevel: 0.65 },
  { id: 'S-POLY', name: '多饮多尿', type: 'symptom', description: '高血糖致渗透性利尿，伴口渴多饮，糖尿病典型「三多」表现之一。', sources: [{ name: '诊断学', year: '2018' }], evidenceLevel: 0.85 },
  { id: 'S-WLOSS', name: '体重下降', type: 'symptom', description: '糖利用障碍致脂肪、蛋白质分解增加，伴乏力。', sources: [{ name: '诊断学', year: '2018' }], evidenceLevel: 0.6 },
  { id: 'S-CHESTP', name: '胸痛', type: 'symptom', description: '胸骨后压榨样疼痛，劳力诱发、休息或含服硝酸甘油缓解，心绞痛典型表现。', sources: [{ name: '稳定性冠心病诊断与治疗指南', year: '2018' }], evidenceLevel: 0.85 },
  { id: 'S-CHESTT', name: '胸闷', type: 'symptom', description: '胸部憋闷、压迫感，心肌缺血常见伴随症状。', sources: [{ name: '诊断学', year: '2018' }], evidenceLevel: 0.7 },
  { id: 'S-FEVER', name: '发热', type: 'symptom', description: '病理性体温升高，感染性肺炎常见全身表现。', sources: [{ name: '诊断学', year: '2018' }], evidenceLevel: 0.7 },
  { id: 'S-COUGH', name: '咳嗽咳痰', type: 'symptom', description: '呼吸道炎症刺激致咳嗽伴脓性痰，肺炎核心呼吸道症状。', sources: [{ name: '社区获得性肺炎诊断和治疗指南', year: '2016' }], evidenceLevel: 0.8 },
  { id: 'S-EPIG', name: '上腹痛', type: 'symptom', description: '上腹隐痛/灼痛，胃溃疡多餐后半小时至 1 小时出现。', sources: [{ name: '消化性溃疡诊断与治疗规范', year: '2022' }], evidenceLevel: 0.8 },
  { id: 'S-MELA', name: '黑便', type: 'symptom', description: '上消化道出血经肠道作用呈柏油样黑便，提示溃疡出血。', sources: [{ name: '消化性溃疡诊断与治疗规范', year: '2022' }], evidenceLevel: 0.75 },
  { id: 'S-HEMI', name: '偏瘫', type: 'symptom', description: '一侧上下肢肌力下降，颈内动脉系统脑梗死典型体征。', sources: [{ name: '中国急性缺血性脑卒中诊治指南', year: '2023' }], evidenceLevel: 0.85 },
  { id: 'S-DYS', name: '言语不清', type: 'symptom', description: 'Broca 区受累致运动性失语或构音障碍。', sources: [{ name: '中国急性缺血性脑卒中诊治指南', year: '2023' }], evidenceLevel: 0.7 },

  // —— 药物 ——
  { id: 'M-AMLO', name: '氨氯地平', type: 'drug', description: '长效二氢吡啶类钙通道阻滞剂（CCB），高血压一线用药。', sources: [{ name: '中国高血压防治指南', year: '2024' }], evidenceLevel: 0.9 },
  { id: 'M-VALS', name: '缬沙坦', type: 'drug', description: '血管紧张素Ⅱ受体拮抗剂（ARB），降压兼保护靶器官。', sources: [{ name: '中国高血压防治指南', year: '2024' }], evidenceLevel: 0.85 },
  { id: 'M-METF', name: '二甲双胍', type: 'drug', description: '双胍类一线降糖药，改善胰岛素抵抗、抑制肝糖输出。', sources: [{ name: '中国2型糖尿病防治指南', year: '2020' }], evidenceLevel: 0.95 },
  { id: 'M-INS', name: '门冬胰岛素', type: 'drug', description: '速效胰岛素类似物，餐时血糖控制。', sources: [{ name: '中国2型糖尿病防治指南', year: '2020' }], evidenceLevel: 0.7 },
  { id: 'M-ASA', name: '阿司匹林', type: 'drug', description: '环氧化酶抑制剂，抗血小板聚集，冠心病二级预防基石。', sources: [{ name: '抗血小板治疗中国专家共识', year: '2021' }], evidenceLevel: 0.95 },
  { id: 'M-ATO', name: '阿托伐他汀', type: 'drug', description: '他汀类调脂药，稳定动脉粥样硬化斑块。', sources: [{ name: '稳定性冠心病诊断与治疗指南', year: '2018' }], evidenceLevel: 0.9 },
  { id: 'M-NTG', name: '硝酸甘油', type: 'drug', description: '硝酸酯类，扩张冠脉，心绞痛急性发作舌下含服急救。', sources: [{ name: '稳定性冠心病诊断与治疗指南', year: '2018' }], evidenceLevel: 0.8 },
  { id: 'M-AMOX', name: '阿莫西林', type: 'drug', description: '广谱青霉素类，CAP 经验性口服治疗常用。', sources: [{ name: '社区获得性肺炎诊断和治疗指南', year: '2016' }], evidenceLevel: 0.7 },
  { id: 'M-CFU', name: '头孢呋辛', type: 'drug', description: '第二代头孢菌素，呼吸道感染经验治疗。', sources: [{ name: '社区获得性肺炎诊断和治疗指南', year: '2016' }], evidenceLevel: 0.75 },
  { id: 'M-OME', name: '奥美拉唑', type: 'drug', description: '质子泵抑制剂（PPI），抑制胃酸分泌，溃疡抑酸治疗核心。', sources: [{ name: '消化性溃疡诊断与治疗规范', year: '2022' }], evidenceLevel: 0.95 },
  { id: 'M-GAV', name: '铝碳酸镁', type: 'drug', description: '抗酸与胃黏膜保护剂，快速中和胃酸。', sources: [{ name: '消化性溃疡诊断与治疗规范', year: '2022' }], evidenceLevel: 0.6 },
  { id: 'M-CLOP', name: '氯吡格雷', type: 'drug', description: 'P2Y12 受体拮抗剂，与阿司匹林双联抗血小板（DAPT）。', sources: [{ name: '抗血小板治疗中国专家共识', year: '2021' }], evidenceLevel: 0.9 },
  { id: 'M-WARF', name: '华法林', type: 'drug', description: '维生素 K 拮抗剂口服抗凝药，治疗窗窄。', sources: [{ name: '抗血小板治疗中国专家共识', year: '2021' }], evidenceLevel: 0.85 },
  { id: 'M-CLAR', name: '克拉霉素', type: 'drug', description: '大环内酯类抗生素，与他汀联用可显著升高他汀血药浓度。', sources: [{ name: '药物相互作用指南', year: '2020' }], evidenceLevel: 0.8 },

  // —— 检查 ——
  { id: 'E-BP', name: '血压监测', type: 'exam', description: '诊室/家庭血压测量，高血压诊断与疗效评估基础。', sources: [{ name: '中国高血压防治指南', year: '2024' }], evidenceLevel: 0.95 },
  { id: 'E-FPG', name: '空腹血糖', type: 'exam', description: '空腹 8h 静脉血糖，糖尿病诊断与监测核心指标。', sources: [{ name: '中国2型糖尿病防治指南', year: '2020' }], evidenceLevel: 0.9 },
  { id: 'E-HBA1C', name: '糖化血红蛋白', type: 'exam', description: '反映近 2~3 个月平均血糖水平，控糖金标准。', sources: [{ name: '中国2型糖尿病防治指南', year: '2020' }], evidenceLevel: 0.95 },
  { id: 'E-ECG', name: '心电图', type: 'exam', description: '静息 12 导联心电图，心肌缺血最便捷初筛。', sources: [{ name: '稳定性冠心病诊断与治疗指南', year: '2018' }], evidenceLevel: 0.9 },
  { id: 'E-ANGIO', name: '冠脉造影', type: 'exam', description: '选择性冠状动脉造影，冠脉狭窄确诊「金标准」。', sources: [{ name: '稳定性冠心病诊断与治疗指南', year: '2018' }], evidenceLevel: 0.9 },
  { id: 'E-CT', name: '胸部CT', type: 'exam', description: '肺部炎症影像学评估，敏感性高于胸片。', sources: [{ name: '社区获得性肺炎诊断和治疗指南', year: '2016' }], evidenceLevel: 0.85 },
  { id: 'E-CBC', name: '血常规', type: 'exam', description: '白细胞与中性粒细胞计数，感染程度判断。', sources: [{ name: '社区获得性肺炎诊断和治疗指南', year: '2016' }], evidenceLevel: 0.8 },
  { id: 'E-EGD', name: '胃镜', type: 'exam', description: '上消化道内镜直视观察+活检，胃溃疡确诊金标准。', sources: [{ name: '消化性溃疡诊断与治疗规范', year: '2022' }], evidenceLevel: 0.95 },
  { id: 'E-MRI', name: '头颅MRI', type: 'exam', description: '弥散加权成像（DWI）早期识别急性脑梗死。', sources: [{ name: '中国急性缺血性脑卒中诊治指南', year: '2023' }], evidenceLevel: 0.9 },

  // —— 手术 ——
  { id: 'O-PCI', name: 'PCI支架植入', type: 'surgery', description: '经皮冠状动脉介入治疗，球囊扩张+支架植入开通狭窄血管。', sources: [{ name: '稳定性冠心病诊断与治疗指南', year: '2018' }], evidenceLevel: 0.85 },
  { id: 'O-HEMO', name: '内镜下止血', type: 'surgery', description: '胃镜下注射/钛夹/电凝止血，溃疡出血首选内镜处理。', sources: [{ name: '消化性溃疡诊断与治疗规范', year: '2022' }], evidenceLevel: 0.8 },
  { id: 'O-LYTIC', name: '静脉溶栓', type: 'surgery', description: '时间窗（4.5h）内 rt-PA 静脉溶栓，恢复脑灌注。', sources: [{ name: '中国急性缺血性脑卒中诊治指南', year: '2023' }], evidenceLevel: 0.9 },

  // —— 科室（M147-A 知识图谱与患者教育：智能导诊 / 首诊转诊路径） ——
  { id: 'DPT-XGNK', name: '心血管内科', type: 'department', description: '高血压、冠心病等心血管疾病首诊与长期随访科室。', sources: [{ name: '中国高血压防治指南', year: '2024' }], evidenceLevel: 0.9 },
  { id: 'DPT-NFMK', name: '内分泌科', type: 'department', description: '2型糖尿病等代谢性疾病首诊与血糖管理科室。', sources: [{ name: '中国2型糖尿病防治指南', year: '2020' }], evidenceLevel: 0.9 },
  { id: 'DPT-HXXNK', name: '呼吸与危重症医学科', type: 'department', description: '社区获得性肺炎等呼吸道感染首诊科室。', sources: [{ name: '社区获得性肺炎诊断和治疗指南', year: '2016' }], evidenceLevel: 0.85 },
  { id: 'DPT-XHNK', name: '消化内科', type: 'department', description: '消化性溃疡、上消化道出血等胃肠疾病首诊科室。', sources: [{ name: '消化性溃疡诊断与治疗规范', year: '2022' }], evidenceLevel: 0.9 },
  { id: 'DPT-SJNK', name: '神经内科', type: 'department', description: '脑梗死等脑血管疾病卒中中心首诊与溶栓科室。', sources: [{ name: '中国急性缺血性脑卒中诊治指南', year: '2023' }], evidenceLevel: 0.9 },
  { id: 'DPT-JCYY', name: '全科医学科', type: 'department', description: '慢病初筛、未分化症状首诊与双向转诊入口科室。', sources: [{ name: '国家基层高血压防治管理指南', year: '2023' }], evidenceLevel: 0.8 },
];

/** 边种子：疾病→症状/药物/检查/手术/科室、症状→疾病、药物↔药物 DDI */
/* 【M147-A 知识图谱与患者教育】每条疾病出边带 qualifier：常见/鉴别、一线/二线、 */
/* 必做/选做、首诊/转诊；症状反推与 DDI 边 qualifier 留空。 */
export const GRAPH_EDGES: GraphEdge[] = [
  // 高血压
  { source: 'D-HTN', target: 'S-DIZZ', relation: 'disease_has_symptom', label: '常见表现', weight: 0.8, qualifier: '常见' },
  { source: 'D-HTN', target: 'S-HEAD', relation: 'disease_has_symptom', label: '常见表现', weight: 0.7, qualifier: '常见' },
  { source: 'D-HTN', target: 'M-AMLO', relation: 'disease_treated_by_drug', label: '一线降压', weight: 0.9, qualifier: '一线' },
  { source: 'D-HTN', target: 'M-VALS', relation: 'disease_treated_by_drug', label: '一线降压', weight: 0.85, qualifier: '一线' },
  { source: 'D-HTN', target: 'E-BP', relation: 'disease_needs_exam', label: '诊断必查', weight: 0.95, qualifier: '必做' },

  // 2型糖尿病
  { source: 'D-DM2', target: 'S-POLY', relation: 'disease_has_symptom', label: '典型表现', weight: 0.9, qualifier: '常见' },
  { source: 'D-DM2', target: 'S-WLOSS', relation: 'disease_has_symptom', label: '常见表现', weight: 0.6, qualifier: '常见' },
  { source: 'D-DM2', target: 'M-METF', relation: 'disease_treated_by_drug', label: '一线用药', weight: 0.95, qualifier: '一线' },
  { source: 'D-DM2', target: 'M-INS', relation: 'disease_treated_by_drug', label: '餐时强化', weight: 0.6, qualifier: '二线' },
  { source: 'D-DM2', target: 'E-FPG', relation: 'disease_needs_exam', label: '诊断必查', weight: 0.9, qualifier: '必做' },
  { source: 'D-DM2', target: 'E-HBA1C', relation: 'disease_needs_exam', label: '金标准', weight: 0.95, qualifier: '必做' },

  // 冠心病
  { source: 'D-CHD', target: 'S-CHESTP', relation: 'disease_has_symptom', label: '典型表现', weight: 0.9, qualifier: '常见' },
  { source: 'D-CHD', target: 'S-CHESTT', relation: 'disease_has_symptom', label: '伴随症状', weight: 0.8, qualifier: '常见' },
  { source: 'D-CHD', target: 'M-ASA', relation: 'disease_treated_by_drug', label: '抗血小板基石', weight: 0.95, qualifier: '一线' },
  { source: 'D-CHD', target: 'M-ATO', relation: 'disease_treated_by_drug', label: '调脂稳斑', weight: 0.9, qualifier: '一线' },
  { source: 'D-CHD', target: 'M-NTG', relation: 'disease_treated_by_drug', label: '急救缓解', weight: 0.7, qualifier: '二线' },
  { source: 'D-CHD', target: 'E-ECG', relation: 'disease_needs_exam', label: '初筛', weight: 0.9, qualifier: '必做' },
  { source: 'D-CHD', target: 'E-ANGIO', relation: 'disease_needs_exam', label: '确诊金标准', weight: 0.85, qualifier: '选做' },
  { source: 'D-CHD', target: 'O-PCI', relation: 'disease_has_surgery', label: '血运重建', weight: 0.65 },

  // 社区获得性肺炎
  { source: 'D-CAP', target: 'S-FEVER', relation: 'disease_has_symptom', label: '全身表现', weight: 0.95, qualifier: '常见' },
  { source: 'D-CAP', target: 'S-COUGH', relation: 'disease_has_symptom', label: '呼吸道核心症状', weight: 0.9, qualifier: '常见' },
  { source: 'D-CAP', target: 'M-AMOX', relation: 'disease_treated_by_drug', label: '经验口服', weight: 0.7, qualifier: '一线' },
  { source: 'D-CAP', target: 'M-CFU', relation: 'disease_treated_by_drug', label: '经验治疗', weight: 0.75, qualifier: '一线' },
  { source: 'D-CAP', target: 'E-CT', relation: 'disease_needs_exam', label: '影像评估', weight: 0.85, qualifier: '选做' },
  { source: 'D-CAP', target: 'E-CBC', relation: 'disease_needs_exam', label: '感染指标', weight: 0.8, qualifier: '必做' },

  // 胃溃疡
  { source: 'D-PU', target: 'S-EPIG', relation: 'disease_has_symptom', label: '典型节律痛', weight: 0.9, qualifier: '常见' },
  { source: 'D-PU', target: 'S-MELA', relation: 'disease_has_symptom', label: '出血警报', weight: 0.6, qualifier: '鉴别' },
  { source: 'D-PU', target: 'M-OME', relation: 'disease_treated_by_drug', label: '抑酸核心', weight: 0.95, qualifier: '一线' },
  { source: 'D-PU', target: 'M-GAV', relation: 'disease_treated_by_drug', label: '黏膜保护', weight: 0.6, qualifier: '二线' },
  { source: 'D-PU', target: 'E-EGD', relation: 'disease_needs_exam', label: '确诊金标准', weight: 0.95, qualifier: '必做' },
  { source: 'D-PU', target: 'O-HEMO', relation: 'disease_has_surgery', label: '出血时首选', weight: 0.4 },

  // 脑梗死
  { source: 'D-IS', target: 'S-HEMI', relation: 'disease_has_symptom', label: '典型体征', weight: 0.85, qualifier: '常见' },
  { source: 'D-IS', target: 'S-DYS', relation: 'disease_has_symptom', label: '典型体征', weight: 0.7, qualifier: '常见' },
  { source: 'D-IS', target: 'M-ASA', relation: 'disease_treated_by_drug', label: '二级预防', weight: 0.85, qualifier: '一线' },
  { source: 'D-IS', target: 'M-CLOP', relation: 'disease_treated_by_drug', label: 'DAPT 联合', weight: 0.8, qualifier: '一线' },
  { source: 'D-IS', target: 'M-ATO', relation: 'disease_treated_by_drug', label: '他汀稳定斑块', weight: 0.85, qualifier: '一线' },
  { source: 'D-IS', target: 'E-MRI', relation: 'disease_needs_exam', label: '早期确诊', weight: 0.9, qualifier: '必做' },
  { source: 'D-IS', target: 'O-LYTIC', relation: 'disease_has_surgery', label: '时间窗内再灌注', weight: 0.5 },

  // 症状 → 疾病（反向鉴别诊断链；qualifier 留空，由 findDifferentialDiagnosis 聚合）
  { source: 'S-DIZZ', target: 'D-HTN', relation: 'symptom_suggests_disease', label: '可能诊断', weight: 0.6 },
  { source: 'S-HEAD', target: 'D-HTN', relation: 'symptom_suggests_disease', label: '可能诊断', weight: 0.55 },
  { source: 'S-POLY', target: 'D-DM2', relation: 'symptom_suggests_disease', label: '高度提示', weight: 0.85 },
  { source: 'S-WLOSS', target: 'D-DM2', relation: 'symptom_suggests_disease', label: '伴随提示', weight: 0.6 },
  { source: 'S-CHESTP', target: 'D-CHD', relation: 'symptom_suggests_disease', label: '高度提示', weight: 0.8 },
  { source: 'S-CHESTT', target: 'D-CHD', relation: 'symptom_suggests_disease', label: '可能诊断', weight: 0.7 },
  { source: 'S-FEVER', target: 'D-CAP', relation: 'symptom_suggests_disease', label: '可能诊断', weight: 0.6 },
  { source: 'S-COUGH', target: 'D-CAP', relation: 'symptom_suggests_disease', label: '高度提示', weight: 0.7 },
  { source: 'S-EPIG', target: 'D-PU', relation: 'symptom_suggests_disease', label: '高度提示', weight: 0.75 },
  { source: 'S-MELA', target: 'D-PU', relation: 'symptom_suggests_disease', label: '警报提示', weight: 0.7 },
  { source: 'S-HEMI', target: 'D-IS', relation: 'symptom_suggests_disease', label: '高度提示', weight: 0.8 },
  { source: 'S-DYS', target: 'D-IS', relation: 'symptom_suggests_disease', label: '可能诊断', weight: 0.7 },

  // 疾病 → 科室（M147-A：首诊 / 转诊，智能导诊）
  { source: 'D-HTN', target: 'DPT-XGNK', relation: 'disease_visit_department', label: '首诊科室', weight: 0.9, qualifier: '首诊' },
  { source: 'D-HTN', target: 'DPT-JCYY', relation: 'disease_visit_department', label: '基层管理转诊', weight: 0.6, qualifier: '转诊' },
  { source: 'D-DM2', target: 'DPT-NFMK', relation: 'disease_visit_department', label: '首诊科室', weight: 0.9, qualifier: '首诊' },
  { source: 'D-DM2', target: 'DPT-JCYY', relation: 'disease_visit_department', label: '基层随访转诊', weight: 0.55, qualifier: '转诊' },
  { source: 'D-CHD', target: 'DPT-XGNK', relation: 'disease_visit_department', label: '首诊科室', weight: 0.9, qualifier: '首诊' },
  { source: 'D-CAP', target: 'DPT-HXXNK', relation: 'disease_visit_department', label: '首诊科室', weight: 0.85, qualifier: '首诊' },
  { source: 'D-PU', target: 'DPT-XHNK', relation: 'disease_visit_department', label: '首诊科室', weight: 0.9, qualifier: '首诊' },
  { source: 'D-IS', target: 'DPT-SJNK', relation: 'disease_visit_department', label: '卒中中心首诊', weight: 0.9, qualifier: '首诊' },

  // 药物相互作用 DDI（双向边，处方前置审核告警；qualifier 留空）
  { source: 'M-ASA', target: 'M-WARF', relation: 'drug_interacts_with_drug', label: '出血风险显著升高', weight: 0.9 },
  { source: 'M-WARF', target: 'M-ASA', relation: 'drug_interacts_with_drug', label: '出血风险显著升高', weight: 0.9 },
  { source: 'M-ATO', target: 'M-CLAR', relation: 'drug_interacts_with_drug', label: '横纹肌溶解风险', weight: 0.85 },
  { source: 'M-CLAR', target: 'M-ATO', relation: 'drug_interacts_with_drug', label: '横纹肌溶解风险', weight: 0.85 },
  { source: 'M-OME', target: 'M-CLOP', relation: 'drug_interacts_with_drug', label: '降低抗血小板效应', weight: 0.7 },
  { source: 'M-CLOP', target: 'M-OME', relation: 'drug_interacts_with_drug', label: '降低抗血小板效应', weight: 0.7 },
];

/* ------------------------------ 内部工具 ------------------------------ */

/** 节点 id → 节点索引 */
const NODE_BY_ID = new Map<string, GraphNode>(GRAPH_NODES.map((n) => [n.id, n]));

/** 节点名 → 节点索引（精确匹配用；名字已按权威指南标准化） */
const NODE_BY_NAME = new Map<string, GraphNode>(GRAPH_NODES.map((n) => [n.name, n]));

/**
 * 定位节点：先精确名匹配，再按「输入包含于节点名 / 节点名包含输入」模糊匹配。
 * 未命中返回 null。纯函数、确定性。
 */
export function resolveNode(name: string): GraphNode | null {
  const key = (name ?? '').trim();
  if (!key) return null;
  const exact = NODE_BY_NAME.get(key);
  if (exact) return exact;
  // 模糊：优先「节点名包含输入」（医生输入「糖尿」命中「2型糖尿病」）
  const contains = GRAPH_NODES.find((n) => n.name.includes(key) || key.includes(n.name));
  return contains ?? null;
}

/** 校验关系类型字符串；非法/空返回 null */
export function asRelation(value: string | null | undefined): MedicalGraphRelation | null {
  if (!value) return null;
  return (ALL_RELATIONS as string[]).includes(value) ? (value as MedicalGraphRelation) : null;
}

/** 校验节点类型字符串；非法/空返回 null */
export function asNodeType(value: string | null | undefined): MedicalGraphNodeType | null {
  if (!value) return null;
  return (ALL_NODE_TYPES as string[]).includes(value) ? (value as MedicalGraphNodeType) : null;
}

/* ------------------------------ 对外能力 ------------------------------ */

/**
 * searchMedicalNodes：节点查询（纯函数）。
 *
 * 口径：关键词 trim 后按「名称包含」过滤；type 可选限定节点类型；
 * 精确名命中排最前，其余按名称长度升序；空关键词返回空数组（不返回全图）。
 *
 * @param keyword 节点中文名片段，如「高血压」「糖尿」「阿司匹林」
 * @param type    可选节点类型过滤
 * @returns 命中节点列表（去重、稳定顺序）
 */
export function searchMedicalNodes(keyword: string, type?: string): GraphNode[] {
  const kw = (keyword ?? '').trim();
  if (!kw) return [];
  const t = asNodeType(type ?? null);
  const matched = GRAPH_NODES.filter((n) => n.name.includes(kw) && (t === null || n.type === t));
  // 精确命中置顶，其余按名称长度升序（短名更通用，排前）
  return matched.sort((a, b) => {
    const aExact = a.name === kw ? 0 : 1;
    const bExact = b.name === kw ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return a.name.length - b.name.length;
  });
}

/**
 * queryMedicalGraph：关系遍历（纯函数，AI 能力深化核心入口）。
 *
 * 行为：
 *  1. resolveNode(startNode) 定位起点；未命中 → matched=false 空图；
 *  2. 取起点全部「出边」；relationType 指定时按关系类型过滤；
 *  3. 返回 {起点 + 邻接节点, 边} 构成的一跳 ego 图；
 *  4. 若 endNode 有效，额外在有向图上搜两节点间简单路径（≤MAX_PATH_DEPTH 跳）。
 *
 * @param startNode    起点中文名（可模糊）
 * @param relationType 可选关系类型过滤（disease_has_symptom 等）
 * @param endNode      可选终点中文名；提供时返回路径推理链
 */
export function queryMedicalGraph(
  startNode: string,
  relationType?: string | null,
  endNode?: string | null,
): GraphResult {
  const start = resolveNode(startNode);
  const rel = asRelation(relationType ?? null);

  const empty: GraphResult = {
    startNode: null,
    nodes: [],
    edges: [],
    relationType: rel,
    matched: false,
    neighborCount: 0,
    paths: [],
    disclaimer: GRAPH_DISCLAIMER,
  };
  if (!start) return empty;

  const edges = GRAPH_EDGES.filter(
    (e) => e.source === start.id && (rel === null || e.relation === rel),
  );
  const neighborIds = new Set<string>(edges.map((e) => e.target));
  const nodes: GraphNode[] = [start, ...GRAPH_NODES.filter((n) => neighborIds.has(n.id))];

  let paths: GraphPath[] = [];
  if (endNode) {
    const end = resolveNode(endNode);
    if (end && end.id !== start.id) {
      paths = findMedicalPathsById(start.id, end.id, MAX_PATH_DEPTH);
      // 路径模式下把路径中间节点也并入视图，便于前端高亮完整推理链
      for (const p of paths) {
        for (const id of p.nodes) {
          if (!nodes.some((n) => n.id === id)) {
            const node = NODE_BY_ID.get(id);
            if (node) nodes.push(node);
          }
        }
      }
    }
  }

  return {
    startNode: start,
    nodes,
    edges,
    relationType: rel,
    matched: true,
    neighborCount: neighborIds.size,
    paths,
    disclaimer: GRAPH_DISCLAIMER,
  };
}

/**
 * findMedicalPaths：路径搜索（纯函数）。
 *
 * 在有向边上做 DFS 找全部简单路径（不重复经过节点），最多 maxDepth 跳、
 * 最多 MAX_PATHS 条；按路径长度升序（短路径=更直接的诊疗链，优先展示）。
 *
 * @param fromName 起点中文名（可模糊）
 * @param toName   终点中文名（可模糊）
 * @param maxDepth 最大跳数，默认 MAX_PATH_DEPTH
 */
export function findMedicalPaths(fromName: string, toName: string, maxDepth: number = MAX_PATH_DEPTH): GraphPath[] {
  const from = resolveNode(fromName);
  const to = resolveNode(toName);
  if (!from || !to || from.id === to.id) return [];
  return findMedicalPathsById(from.id, to.id, Math.max(1, Math.min(maxDepth, MAX_PATH_DEPTH)));
}

/** 按 id 的有向图 DFS 路径搜索（内部实现） */
function findMedicalPathsById(fromId: string, toId: string, maxDepth: number): GraphPath[] {
  const out = new Map<string, GraphEdge[]>();
  for (const e of GRAPH_EDGES) {
    const list = out.get(e.source) ?? [];
    list.push(e);
    out.set(e.source, list);
  }

  const results: GraphPath[] = [];
  const visited = new Set<string>([fromId]);

  const dfs = (current: string, pathNodes: string[], pathEdges: GraphEdge[]): void => {
    if (results.length >= MAX_PATHS) return;
    if (pathEdges.length >= maxDepth) return;
    const next = out.get(current) ?? [];
    for (const edge of next) {
      if (visited.has(edge.target)) continue;
      const newNodes = [...pathNodes, edge.target];
      const newEdges = [...pathEdges, edge];
      if (edge.target === toId) {
        results.push({
          nodes: newNodes,
          relations: newEdges.map((e) => e.relation),
          labels: newEdges.map((e) => e.label),
        });
        if (results.length >= MAX_PATHS) return;
        continue;
      }
      visited.add(edge.target);
      dfs(edge.target, newNodes, newEdges);
      visited.delete(edge.target);
    }
  };

  dfs(fromId, [fromId], []);
  // 短路径优先（更直接的诊疗链）
  return results.sort((a, b) => a.relations.length - b.relations.length);
}

/* ===================== M147-A 知识图谱与患者教育深化 ===================== */

/** 鉴别诊断候选数量上限（防止一次返回过多稀释医生注意力） */
export const MAX_DIAGNOSIS = 5;

/** 读取边的 qualifier；旧种子边未标注时回退空串（按关系类型默认桶处理） */
export function edgeQualifier(e: GraphEdge): EdgeQualifier {
  return e.qualifier ?? '';
}

/**
 * queryDiseaseGraph 返回信封（患者教育版疾病全景图）。
 * 把疾病的出边按「症状/药物/检查/科室/手术」五类、再按 qualifier 分桶，
 * 前端可直接渲染成「常见症状 vs 鉴别警报」「一线用药 vs 二线」「必做 vs 选做」。
 */
export interface DiseaseGraph {
  /** 命中的疾病节点；未命中为 null */
  disease: GraphNode | null;
  /** 常见症状（qualifier=常见） */
  commonSymptoms: GraphEdge[];
  /** 鉴别/警报症状（qualifier=鉴别，如黑便提示出血） */
  differentialSymptoms: GraphEdge[];
  /** 一线用药（指南强推荐） */
  firstLineDrugs: GraphEdge[];
  /** 二线/补救用药 */
  secondLineDrugs: GraphEdge[];
  /** 必做检查（诊断/随访核心） */
  requiredExams: GraphEdge[];
  /** 选做/影像/侵入性检查 */
  optionalExams: GraphEdge[];
  /** 首诊科室 */
  firstVisitDepartments: GraphEdge[];
  /** 转诊科室（基层/上级） */
  referralDepartments: GraphEdge[];
  /** 可选手术方式 */
  surgeries: GraphEdge[];
  /** 视图内全部节点（疾病 + 全部邻接节点） */
  nodes: GraphNode[];
  /** 视图内全部边 */
  edges: GraphEdge[];
  /** 是否命中疾病节点 */
  matched: boolean;
  /** 固定免责声明 */
  disclaimer: string;
}

/**
 * findDifferentialDiagnosis 返回的单条鉴别诊断结果。
 * 面向「主诉症状 → 可能疾病」的分诊/患者教育场景，附置信度与下一步建议。
 */
export interface Diagnosis {
  /** 疾病节点 id */
  diseaseId: string;
  /** 疾病中文名 */
  diseaseName: string;
  /** 原始匹配分：命中症状边 weight 之和（越大越可能） */
  score: number;
  /** 归一化置信度 0~1（按本次候选最大值归一，Top1=1） */
  confidence: number;
  /** 用户主诉中命中的症状节点 */
  matchedSymptoms: GraphNode[];
  /** 该疾病的典型症状中用户未提及者（患者教育：「还要警惕…」） */
  missingTypicalSymptoms: GraphNode[];
  /** 首诊科室节点 */
  firstVisitDepartments: GraphNode[];
  /** 一线用药节点（患者教育仅展示，不作处方） */
  firstLineDrugs: GraphNode[];
  /** 必做检查节点 */
  requiredExams: GraphNode[];
  /** 疾病来源指南 */
  sources: Array<{ name: string; year?: string }>;
}

/** 把某疾病的出边按关系类型 + qualifier 分桶 */
function bucketDiseaseEdges(diseaseId: string): {
  commonSymptoms: GraphEdge[];
  differentialSymptoms: GraphEdge[];
  firstLineDrugs: GraphEdge[];
  secondLineDrugs: GraphEdge[];
  requiredExams: GraphEdge[];
  optionalExams: GraphEdge[];
  firstVisitDepartments: GraphEdge[];
  referralDepartments: GraphEdge[];
  surgeries: GraphEdge[];
} {
  const out = GRAPH_EDGES.filter((e) => e.source === diseaseId);
  const pick = (rel: MedicalGraphRelation, qual: string) =>
    out.filter((e) => e.relation === rel && edgeQualifier(e) === qual);
  return {
    commonSymptoms: pick('disease_has_symptom', '常见'),
    differentialSymptoms: pick('disease_has_symptom', '鉴别'),
    firstLineDrugs: pick('disease_treated_by_drug', '一线'),
    secondLineDrugs: pick('disease_treated_by_drug', '二线'),
    requiredExams: pick('disease_needs_exam', '必做'),
    optionalExams: pick('disease_needs_exam', '选做'),
    firstVisitDepartments: pick('disease_visit_department', '首诊'),
    referralDepartments: pick('disease_visit_department', '转诊'),
    surgeries: out.filter((e) => e.relation === 'disease_has_surgery'),
  };
}

/**
 * queryDiseaseGraph：按疾病 id（或中文名）展开疾病全景图（纯函数）。
 *
 * 与 queryMedicalGraph 的区别：
 *  - 入参是疾病 id（如 D-HTN）而非任意节点；
 *  - 出边按 qualifier 结构化分桶，前端无需再做中文 label 匹配；
 *  - 显式输出首诊/转诊科室，支撑智能导诊与患者教育页。
 *
 * @param diseaseId 疾病节点 id 或中文名（可模糊）
 */
export function queryDiseaseGraph(diseaseId: string): DiseaseGraph {
  const empty: DiseaseGraph = {
    disease: null,
    commonSymptoms: [],
    differentialSymptoms: [],
    firstLineDrugs: [],
    secondLineDrugs: [],
    requiredExams: [],
    optionalExams: [],
    firstVisitDepartments: [],
    referralDepartments: [],
    surgeries: [],
    nodes: [],
    edges: [],
    matched: false,
    disclaimer: GRAPH_DISCLAIMER,
  };

  const key = (diseaseId ?? '').trim();
  if (!key) return empty;
  // 先按 id 精确查，再回退中文名模糊定位
  const disease = NODE_BY_ID.get(key) ?? resolveNode(key);
  if (!disease || disease.type !== 'disease') return empty;

  const buckets = bucketDiseaseEdges(disease.id);
  const edges = GRAPH_EDGES.filter((e) => e.source === disease.id);
  const neighborIds = new Set<string>(edges.map((e) => e.target));
  const nodes: GraphNode[] = [disease, ...GRAPH_NODES.filter((n) => neighborIds.has(n.id))];

  return {
    disease,
    ...buckets,
    nodes,
    edges,
    matched: true,
    disclaimer: GRAPH_DISCLAIMER,
  };
}

/**
 * findDifferentialDiagnosis：由主诉症状列表反推可能疾病（纯函数，鉴别诊断核心）。
 *
 * 算法（医学准确、可解释）：
 *  1. 逐个解析症状名（模糊），沿 symptom_suggests_disease 出边收集候选疾病；
 *  2. 同一疾病被多个症状命中时，权重累加（多症状叠加提示诊断概率上升）；
 *  3. 置信度按本次候选最大值归一（Top1=1），避免跨批次绝对值漂移；
 *  4. 每条结果附「未提及的典型症状」（患者教育：还要警惕什么）、
 *     首诊科室、一线用药、必做检查——形成可解释的下一步建议；
 *  5. 未命中任何症状返回空数组，绝不臆造疾病。
 *
 * @param symptoms 主诉症状中文名数组（如 ['胸痛','胸闷']）
 */
export function findDifferentialDiagnosis(symptoms: string[]): Diagnosis[] {
  const list = (Array.isArray(symptoms) ? symptoms : [])
    .map((s) => resolveNode((s ?? '').trim()))
    .filter((n): n is GraphNode => n !== null && n.type === 'symptom');

  if (list.length === 0) return [];

  // diseaseId → { score, matchedSymptomIds }
  const acc = new Map<string, { score: number; matched: Set<string> }>();
  for (const sym of list) {
    for (const e of GRAPH_EDGES) {
      if (e.source !== sym.id || e.relation !== 'symptom_suggests_disease') continue;
      const cur = acc.get(e.target) ?? { score: 0, matched: new Set<string>() };
      cur.score += e.weight;
      cur.matched.add(sym.id);
      acc.set(e.target, cur);
    }
  }

  if (acc.size === 0) return [];

  const maxScore = Math.max(...[...acc.values()].map((v) => v.score));
  const results: Diagnosis[] = [];

  for (const [diseaseId, v] of acc.entries()) {
    const disease = NODE_BY_ID.get(diseaseId);
    if (!disease || disease.type !== 'disease') continue;
    const buckets = bucketDiseaseEdges(diseaseId);

    const matchedSymptomIds = new Set(v.matched);
    // 该疾病的典型症状边 → 节点；未被用户提及者即「还要警惕」
    const typicalSymptomIds = buckets.commonSymptoms.map((e) => e.target);
    const missingTypicalSymptoms = GRAPH_NODES.filter(
      (n) => typicalSymptomIds.includes(n.id) && !matchedSymptomIds.has(n.id),
    );
    const matchedSymptoms = GRAPH_NODES.filter((n) => matchedSymptomIds.has(n.id));

    results.push({
      diseaseId: disease.id,
      diseaseName: disease.name,
      score: Math.round(v.score * 100) / 100,
      confidence: maxScore > 0 ? Math.round((v.score / maxScore) * 100) / 100 : 0,
      matchedSymptoms,
      missingTypicalSymptoms,
      firstVisitDepartments: GRAPH_NODES.filter((n) =>
        buckets.firstVisitDepartments.some((e) => e.target === n.id),
      ),
      firstLineDrugs: GRAPH_NODES.filter((n) =>
        buckets.firstLineDrugs.some((e) => e.target === n.id),
      ),
      requiredExams: GRAPH_NODES.filter((n) =>
        buckets.requiredExams.some((e) => e.target === n.id),
      ),
      sources: disease.sources,
    });
  }

  // 按匹配分降序，同分按疾病证据强度降序
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_DIAGNOSIS);
}
