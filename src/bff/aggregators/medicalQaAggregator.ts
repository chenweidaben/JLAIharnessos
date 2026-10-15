/**
 * 健澜科技 jlmedaios - AI 知识问答深化聚合器（M154-D）「AI深化与运营预测」
 *
 * 面向临床医护的医学知识问答：在内置轻量知识词典之上，回答疾病/用药/检查/指南
 * 四类问题，每条回答必带可追溯引用（Citation）。
 *
 * 纯函数约定：answerMedicalQuestion / searchMedicalKnowledge / generateCitation
 * 均无 I/O、确定性、对非法输入安全降级；不在词典内的问题一律返回
 * 「未在知识库中找到」，绝不臆造医学结论。
 *
 * 知识边界：本模块为教学/科普级要点摘要，不替代医师诊断与处方；
 * 词典条目取自公开权威教材与临床指南（见各条 citation），生产环境应替换为
 * 机构订阅的正版医学知识库。最终诊疗决定由执业医师作出（人在回路）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型契约（纯数据）
// ---------------------------------------------------------------------------

/** 知识四类：疾病 / 用药 / 检查 / 指南 */
export type KnowledgeCategory = 'disease' | 'drug' | 'exam' | 'guideline';

/** 引用来源类型 */
export type CitationSourceType = 'textbook' | 'drug-label' | 'guideline' | 'exam-reference';

/** 一条可追溯引用 */
export interface Citation {
  sourceType: CitationSourceType;
  title: string;
  publisher: string;
  year: number;
  edition?: string;
  url?: string;
}

/** 内置知识条目 */
export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  /** 规范名 */
  name: string;
  /** 别名 / 俗称，用于提升召回 */
  aliases: string[];
  /** 召回关键词 */
  keywords: string[];
  /** 分节要点：key 为子主题（病因/症状/适应症/注意事项…），value 为该节要点 */
  sections: Record<string, string[]>;
  /** 综述要点：未命中具体子主题时使用 */
  summary: string[];
  source: Citation;
}

/** 问答结果 */
export interface AnswerResult {
  question: string;
  /** 是否命中知识库 */
  matched: boolean;
  entryId?: string;
  category?: KnowledgeCategory;
  title?: string;
  /** 命中的子主题意图（未命中具体子主题为 undefined） */
  intent?: string;
  /** 回答正文（纯文本，分节以换行分隔） */
  answer: string;
  citations: Citation[];
  /** 未命中提示语（命中时为空串） */
  notFoundHint: string;
  /** 通用免责声明 */
  disclaimer: string;
}

/** 子主题意图词表（中文）。key 为规范子主题，value 为触发词列表 */
const INTENT_PATTERNS: Record<string, string[]> = {
  病因: ['病因', '原因', '怎么引起', '怎么会得', '发病机制', '危险因素', '为什么会'],
  症状: ['症状', '表现', '征兆', '体征', '有什么反应', '哪些表现'],
  治疗: ['治疗', '怎么治', '治法', '用药', '方案', '处理', '干预'],
  预后: ['预后', '能活多久', '复发', '转归', '能不能治好', '后遗症'],
  预防: ['预防', '怎么防', '筛查', '高危人群'],
  适应症: ['适应症', '适应证', '治什么', '用于什么', '哪些情况用'],
  禁忌症: ['禁忌症', '禁忌证', '不能用', '哪些人不能', '慎用', '禁用'],
  相互作用: ['相互作用', '一起用', '配伍', '冲突', '合用'],
  剂量: ['剂量', '用量', '怎么吃', '一次多少', '一天几次', '用法用量'],
  不良反应: ['不良反应', '副作用', '风险', '注意事项'],
  注意事项: ['注意事项', '要注意什么', '检查前', '采血', '准备', '禁忌'],
  结果解读: ['结果解读', '怎么看', '正常值', '偏高', '偏低', '异常', '临床意义', '解读'],
  指南要点: ['指南', '最新', '推荐意见', '共识', '诊断标准', '治疗目标', '要点'],
};

/** 未命中提示语（禁止编造） */
export const NOT_FOUND_HINT =
  '未在知识库中找到与该问题直接对应的权威条目。本助手仅基于内置权威知识词典作答，不臆造医学结论；如需进一步诊疗，请咨询执业医师或检索机构订阅的正版医学知识库。';

/** 通用免责声明 */
export const QA_DISCLAIMER =
  '以上内容为教学/科普级知识要点摘要，不构成诊断或处方建议，具体诊疗请以执业医师面诊与最新版指南为准。';

// ---------------------------------------------------------------------------
// 内置知识词典
// 说明：条目取自公开权威教材/指南，每条均带 citation；仅收录证据充分的标准要点。
// ---------------------------------------------------------------------------

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'dis-hypertension',
    category: 'disease',
    name: '原发性高血压',
    aliases: ['高血压', '原发性高血压病', '高血压病'],
    keywords: ['血压', '收缩压', '舒张压', 'SBP', 'DBP', '降压'],
    summary: [
      '高血压是以体循环动脉血压持续升高为主要表现的常见慢性心血管病，多数为原因不明的原发性高血压。',
      '在未使用降压药情况下，非同日 3 次测量诊室血压收缩压≥140 mmHg 和/或舒张压≥90 mmHg 可诊断。',
      '治疗以生活方式干预为基础，必要时启动降压药物，目标一般为 <140/90 mmHg，能耐受者可进一步降至 <130/80 mmHg。',
    ],
    sections: {
      病因: [
        '遗传与家族史是重要危险因素。',
        '高钠低钾饮食、超重/肥胖、过量饮酒、长期精神紧张、缺乏体力活动为主要环境危险因素。',
        '年龄增长使血管弹性下降，患病率随年龄升高。',
      ],
      症状: [
        '多数起病隐匿，常见头晕、头胀、头痛、颈项发紧、心悸、耳鸣、健忘等。',
        '约半数患者无明显自觉症状，仅在体检或并发症发生时发现。',
        '血压骤升时可出现剧烈头痛、呕吐、视物模糊等高血压急症表现。',
      ],
      治疗: [
        '生活方式干预：限盐（每日 <5 g）、控制体重、戒烟限酒、规律有氧运动、心理平衡。',
        '常用一线降压药包括钙通道阻滞剂（CCB）、血管紧张素转换酶抑制剂（ACEI）、血管紧张素Ⅱ受体拮抗剂（ARB）、利尿剂、β受体阻滞剂。',
        '多数患者需长期规律服药，不可自行停药或频繁换药；血压应平稳达标。',
      ],
      预后: [
        '长期 uncontrolled 高血压可损害心、脑、肾、眼底及血管，是脑卒中、冠心病、心衰、肾衰的重要危险因素。',
        '规范降压、平稳达标可显著降低心脑血管事件风险。',
        '预后与血压控制水平、靶器官损害及合并症密切相关。',
      ],
      预防: [
        '定期监测血压，35 岁以上首诊应测血压。',
        '限盐减重、戒烟限酒、适量运动、心理平衡为全民健康生活方式基石。',
      ],
    },
    source: {
      sourceType: 'guideline',
      title: '中国高血压防治指南（2024年版）',
      publisher: '中国高血压防治指南修订委员会',
      year: 2024,
    },
  },
  {
    id: 'dis-t2dm',
    category: 'disease',
    name: '2型糖尿病',
    aliases: ['糖尿病', '2型糖尿病', '非胰岛素依赖型糖尿病'],
    keywords: ['血糖', '空腹血糖', 'HbA1c', '糖化血红蛋白', '胰岛素抵抗', '降糖'],
    summary: [
      '2型糖尿病是以胰岛素抵抗伴相对性胰岛素分泌不足为特征的慢性代谢性疾病，占糖尿病患者 90% 以上。',
      '诊断标准：空腹血糖≥7.0 mmol/L、或 OGTT 2 小时血糖≥11.1 mmol/L、或 HbA1c≥6.5%、或随机血糖≥11.1 mmol/L 伴典型症状，需重复确认。',
      '治疗以医学营养、运动、体重管理为基础，按需使用口服降糖药或胰岛素，目标个体化，多数成人 HbA1c <7.0%。',
    ],
    sections: {
      病因: [
        '遗传易感性与环境因素共同作用。',
        '核心机制为胰岛素抵抗伴 β 细胞功能进行性减退。',
        '超重/肥胖（尤其腹型肥胖）、久坐、高热量饮食、增龄为主要可控危险因素。',
      ],
      症状: [
        '典型“三多一少”：多饮、多尿、多食、体重减轻。',
        '可伴乏力、视力模糊、皮肤瘙痒、反复感染、伤口愈合缓慢。',
        '早期常无症状，多在体检或并发症筛查时发现。',
      ],
      治疗: [
        '生活方式干预是基础：控制总热量、均衡膳食、规律运动、减重。',
        '口服药首选二甲双胍；合并 ASCVD/心衰/慢性肾病者优先选用有明确心肾获益的 GLP-1 受体激动剂或 SGLT2 抑制剂。',
        '血糖显著升高或口服药不达标时应及时起始/强化胰岛素治疗。',
      ],
      预后: [
        '血糖长期控制不佳可致视网膜病变、肾病、神经病变、下肢溃疡及心脑血管事件。',
        '早期规范控糖、降压、调脂、抗血小板综合管理可显著减少并发症。',
        '预后与血糖、血压、血脂综合达标及自我管理水平密切相关。',
      ],
    },
    source: {
      sourceType: 'guideline',
      title: '中国2型糖尿病防治指南（2020年版）',
      publisher: '中华医学会糖尿病学分会',
      year: 2021,
    },
  },
  {
    id: 'dis-cap',
    category: 'disease',
    name: '社区获得性肺炎',
    aliases: ['肺炎', 'CAP', '大叶性肺炎', '支气管肺炎'],
    keywords: ['发热', '咳嗽', '咳痰', '胸片', '肺部啰音', '抗感染'],
    summary: [
      '社区获得性肺炎（CAP）指在医院外罹患的感染性肺实质炎症，常见病原体为肺炎链球菌、支原体、流感嗜血杆菌等。',
      '典型表现为新近出现的咳嗽、咳痰或原有呼吸道症状加重，伴发热、肺实变体征/湿啰音，胸片可见新发浸润影。',
      '治疗以经验性抗感染为核心，结合严重程度评分决定门诊或住院，同时予退热、补液、氧疗等支持治疗。',
    ],
    sections: {
      病因: [
        '细菌：肺炎链球菌最常见，其次为流感嗜血杆菌、卡他莫拉菌。',
        '非典型病原体：肺炎支原体、肺炎衣原体、嗜肺军团菌。',
        '病毒：流感病毒、呼吸道合胞病毒等；受凉、劳累、基础疾病为诱因。',
      ],
      症状: [
        '发热（可伴寒战）、咳嗽、咳痰（铁锈色痰见于肺炎链球菌）、胸痛、气促。',
        '老年人体温可不高，而以精神萎靡、食欲差、乏力为主要表现。',
        '查体可闻及肺部湿啰音，累及胸膜时有胸膜摩擦音。',
      ],
      治疗: [
        '根据病情严重程度决定治疗场所；青壮年无基础病门诊常选用青霉素类/大环内酯类/呼吸喹诺酮。',
        '重症或有基础病者需住院，按指南经验性选药并尽早病原学检测。',
        '注意休息、补液、氧疗，合理退热，疗程通常 5–7 天或视病原与并发症调整。',
      ],
      预后: [
        '多数经规范抗感染治疗后可痊愈。',
        '老年人、免疫低下、有多脏器基础病或重症肺炎者预后较差。',
        '并发症包括感染性休克、脓胸、肺脓肿、呼吸衰竭。',
      ],
    },
    source: {
      sourceType: 'textbook',
      title: '内科学（第9版）',
      publisher: '人民卫生出版社',
      year: 2018,
      edition: '第9版',
    },
  },
  {
    id: 'drug-metformin',
    category: 'drug',
    name: '盐酸二甲双胍',
    aliases: ['二甲双胍', 'Metformin', '格华止'],
    keywords: ['降糖', '双胍', '胰岛素抵抗', '2型糖尿病', '口服降糖药'],
    summary: [
      '二甲双胍属双胍类口服降糖药，主要通过减少肝脏糖异生、改善外周胰岛素抵抗降低血糖，是2型糖尿病的一线首选和全程用药。',
      '可降低空腹及餐后血糖，单用一般不引起低血糖，并对体重有中性或轻度减轻作用。',
      '常见不良反应为胃肠道反应，餐中或餐后服用、小剂量起始可减轻。',
    ],
    sections: {
      适应症: [
        '用于单纯饮食、运动控制不佳的2型糖尿病，尤其适用于超重/肥胖患者。',
        '可单独或与其他口服降糖药、胰岛素联合使用。',
      ],
      禁忌症: [
        '中度至重度肾功能不全（eGFR <30 mL/min/1.73m²）禁用。',
        '急性代谢性酸中毒、糖尿病酮症酸中毒、严重感染、缺氧、大手术围术期禁用。',
        '严重肝功能不全、酗酒者慎用/禁用；对本品过敏者禁用。',
      ],
      相互作用: [
        '与胰岛素或磺脲类合用增加低血糖风险，需注意监测。',
        '与含碘造影剂检查前后应按肾功能暂停使用，以防乳酸酸中毒。',
        '西咪替丁可减少本品肾排泄，合用时需谨慎。',
      ],
      剂量: [
        '一般从小剂量起始，餐中或餐后服用以减轻胃肠道反应。',
        '常用维持剂量每日 1500–2000 mg，分 2–3 次服用，每日最大剂量一般不超过 2550 mg。',
        '具体剂量应遵医嘱并按肾功能个体化调整。',
      ],
      不良反应: [
        '常见腹泻、恶心、腹胀、金属味等胃肠道反应，多为一过性。',
        '罕见但严重的不良反应为乳酸酸中毒，肾功能不全、缺氧、酗酒者风险升高。',
        '长期使用可能影响维生素 B12 吸收，必要时监测并补充。',
      ],
    },
    source: {
      sourceType: 'drug-label',
      title: '中华人民共和国药典·临床用药须知（化学药和生物制品卷）',
      publisher: '国家药典委员会',
      year: 2020,
    },
  },
  {
    id: 'drug-aspirin',
    category: 'drug',
    name: '阿司匹林',
    aliases: ['乙酰水杨酸', 'Aspirin', '拜阿司匹灵'],
    keywords: ['抗血小板', '解热镇痛', '心梗', '脑梗', '二级预防', '抗凝'],
    summary: [
      '阿司匹林通过不可逆抑制环氧合酶、减少血栓素 A2 合成发挥抗血小板聚集作用，是心脑血管疾病二级预防的基础用药。',
      '小剂量（75–100 mg/日）用于抗血小板，较大剂量用于解热镇痛。',
      '主要风险为出血，尤其是消化道出血与过敏（阿司匹林哮喘）。',
    ],
    sections: {
      适应症: [
        '降低急性心肌梗死疑似患者发病风险，预防心肌梗死复发。',
        '用于脑卒中二级预防、短暂性脑缺血（TIA）及其后预防。',
        '用于稳定/不稳定型心绞痛、动脉介入术后抗血小板治疗。',
      ],
      禁忌症: [
        '活动性消化性溃疡、消化道出血或其他活动性出血患者禁用。',
        '血友病、血小板减少等出血倾向者禁用。',
        '对本品或含水杨酸类药物过敏、阿司匹林哮喘史者禁用；严重肝肾功能不全者禁用。',
      ],
      相互作用: [
        '与华法林等抗凝药、其他抗血小板药合用显著增加出血风险。',
        '与非甾体抗炎药（NSAIDs）合用增加胃肠道出血风险并降低抗血小板作用。',
        '与甲氨蝶呤合用增加其毒性；与碳酸酐酶抑制剂等合用需监测。',
      ],
      剂量: [
        '心脑血管二级预防常用剂量为每日 75–100 mg，口服。',
        '急性心梗等紧急情况按医嘱嚼服负荷剂量后再行维持。',
        '具体剂量与疗程应由医师根据缺血/出血风险个体化决定。',
      ],
      不良反应: [
        '常见上腹部不适、恶心；长期使用可致消化道溃疡与出血。',
        '可引起牙龈出血、皮肤瘀斑等出血表现。',
        '少数出现过敏反应（荨麻疹、阿司匹林哮喘）；儿童病毒感染时使用可能发生 Reye 综合征。',
      ],
    },
    source: {
      sourceType: 'drug-label',
      title: '中华人民共和国药典·临床用药须知（化学药和生物制品卷）',
      publisher: '国家药典委员会',
      year: 2020,
    },
  },
  {
    id: 'drug-atorvastatin',
    category: 'drug',
    name: '阿托伐他汀钙',
    aliases: ['阿托伐他汀', 'Atorvastatin', '立普妥', '他汀'],
    keywords: ['降脂', '胆固醇', 'LDL', '低密度脂蛋白', '他汀', '调脂'],
    summary: [
      '阿托伐他汀为羟甲基戊二酰辅酶 A（HMG-CoA）还原酶抑制剂，通过抑制胆固醇合成显著降低低密度脂蛋白胆固醇（LDL-C）。',
      '用于高胆固醇血症及动脉粥样硬化性心血管疾病（ASCVD）的一级/二级预防。',
      '主要不良反应为肌痛与肝酶升高，用药期间应监测肝功能与肌肉症状。',
    ],
    sections: {
      适应症: [
        '高胆固醇血症、混合型高脂血症。',
        '冠心病或等危症、脑梗死后等 ASCVD 患者调脂稳定斑块。',
        '用于具有多种危险因素人群的心血管事件一级预防（按医嘱评估）。',
      ],
      禁忌症: [
        '活动性肝病、不明原因持续性肝酶升高者禁用。',
        '对本品任何成分过敏者禁用。',
        '孕妇及哺乳期妇女禁用；育龄期用药期间应避孕。',
      ],
      相互作用: [
        '与 CYP3A4 强抑制剂（如克拉霉素、伊曲康唑、部分抗病毒药）合用增加肌病/横纹肌溶解风险。',
        '与吉非贝齐等贝特类合用增加肌肉毒性，需谨慎。',
        '大量西柚汁可升高血药浓度，用药期间应避免。',
      ],
      剂量: [
        '常用起始剂量为每日 10–20 mg，顿服；可在一日内任何时间服用，不受进餐影响。',
        '根据 LDL-C 达标情况调整剂量，每日最大剂量一般为 80 mg。',
        '高龄、肝肾功能异常者宜从低剂量起始。',
      ],
      不良反应: [
        '常见肌痛、关节痛、恶心、腹泻。',
        '可出现转氨酶升高，多为一过性，用药前及用药后应监测肝功能。',
        '罕见但严重者为横纹肌溶解，表现为明显肌痛、乏力、茶色尿，应立即停药就医。',
      ],
    },
    source: {
      sourceType: 'drug-label',
      title: '中华人民共和国药典·临床用药须知（化学药和生物制品卷）',
      publisher: '国家药典委员会',
      year: 2020,
    },
  },
  {
    id: 'exam-cbc',
    category: 'exam',
    name: '血常规',
    aliases: ['血象', 'CBC', '全血细胞计数', '血常规检查'],
    keywords: ['白细胞', '红细胞', '血红蛋白', '血小板', 'WBC', 'RBC', 'Hb', 'PLT'],
    summary: [
      '血常规是最常用的基础检验项目，主要包括白细胞计数与分类、红细胞/血红蛋白、血小板计数。',
      '用于筛查感染、贫血、出血倾向、血液系统疾病及治疗监测。',
      '结果需结合症状、病史与其他检查综合判断，单项目轻度异常不必过度解读。',
    ],
    sections: {
      适应症: [
        '不明原因发热、乏力、面色苍白等的初筛。',
        '术前常规检查、感染与炎症监测、贫血鉴别、化疗后骨髓抑制监测。',
        '皮肤瘀斑、牙龈出血等出血倾向的评估。',
      ],
      注意事项: [
        '一般无需空腹，采静脉血或末梢血。',
        '剧烈运动、情绪激动、妊娠、吸烟等可使白细胞一过性升高。',
        '采血后按压止血 3–5 分钟，避免揉搓。',
      ],
      结果解读: [
        '白细胞计数升高常见于细菌感染、应激；降低见于病毒感染、血液系统疾病或药物影响。',
        '血红蛋白降低提示贫血，需结合 MCV/MCH 等鉴别大细胞性/正细胞性/小细胞性贫血。',
        '血小板减少增加出血风险，显著升高需警惕骨髓增殖性疾病或反应性增多。',
      ],
    },
    source: {
      sourceType: 'exam-reference',
      title: '诊断学（第9版）',
      publisher: '人民卫生出版社',
      year: 2018,
      edition: '第9版',
    },
  },
  {
    id: 'exam-fbg',
    category: 'exam',
    name: '空腹血糖',
    aliases: ['FBG', '空腹血糖检测', '空腹血糖测定'],
    keywords: ['血糖', '空腹', '糖尿病', 'FBG', '糖代谢'],
    summary: [
      '空腹血糖（FBG）指至少禁食 8 小时后测得的静脉血浆葡萄糖，是筛查与诊断糖尿病、评估糖代谢的基础项目。',
      '正常范围一般为 3.9–6.1 mmol/L；6.1–<7.0 mmol/L 为空腹血糖受损；≥7.0 mmol/L 需重复确认并考虑糖尿病诊断。',
      '结果需结合症状、餐后血糖、HbA1c 综合判断。',
    ],
    sections: {
      适应症: [
        '糖尿病筛查、诊断与治疗监测。',
        '多饮多尿、体重不明原因下降等症状评估。',
        '术前检查及高危人群（肥胖、家族史、妊娠）定期监测。',
      ],
      注意事项: [
        '需至少禁食 8 小时，可饮少量白水。',
        '检测前一日应避免过量摄入糖类、饮酒及剧烈运动。',
        '应激、感染、某些药物（如糖皮质激素）可使血糖暂时升高。',
      ],
      结果解读: [
        '正常：3.9–6.1 mmol/L。',
        '空腹血糖受损（糖尿病前期）：6.1–<7.0 mmol/L。',
        '≥7.0 mmol/L 伴或不伴典型症状，需另日复查确认，达到诊断标准时应转诊内分泌科。',
      ],
    },
    source: {
      sourceType: 'guideline',
      title: '中国2型糖尿病防治指南（2020年版）',
      publisher: '中华医学会糖尿病学分会',
      year: 2021,
    },
  },
  {
    id: 'exam-ecg',
    category: 'exam',
    name: '静息心电图',
    aliases: ['心电图', 'ECG', 'EKG', '常规心电图'],
    keywords: ['心律', '心肌缺血', '心梗', 'ST段', '心律失常', '心率'],
    summary: [
      '静息心电图（ECG）记录心脏电活动，是筛查心律失常、心肌缺血/梗死、房室肥大及电解质紊乱的基础无创检查。',
      '检查便捷、无创伤、可重复，常作为胸痛、心悸、胸闷及术前评估的首选检查。',
      '一次正常心电图不能完全排除阵发性心律失常或间歇性心肌缺血，需结合动态心电图等进一步评估。',
    ],
    sections: {
      适应症: [
        '胸痛、胸闷、心悸、晕厥等症状评估。',
        '术前常规检查、高血压/心脏病随访、心律失常筛查。',
        '药物（如洋地黄、抗心律失常药）及电解质紊乱监测。',
      ],
      注意事项: [
        '检查前安静休息数分钟，避免剧烈运动、饱餐、吸烟、喝咖啡浓茶。',
        '保持放松、平稳呼吸，不要移动肢体或说话。',
        '去除身上金属物品，女性避免穿连衣裙。',
      ],
      结果解读: [
        '正常窦性心律心率一般为 60–100 次/分；过快为心动过速，过慢为心动过缓。',
        'ST 段抬高/压低、T 波改变提示心肌缺血或损伤，需结合临床与心肌标志物。',
        '各型早搏、房颤、传导阻滞等心律失常需由心内科医师结合临床判断。',
      ],
    },
    source: {
      sourceType: 'textbook',
      title: '诊断学（第9版）',
      publisher: '人民卫生出版社',
      year: 2018,
      edition: '第9版',
    },
  },
  {
    id: 'guide-hypertension-2024',
    category: 'guideline',
    name: '中国高血压防治指南要点',
    aliases: ['高血压指南', '2024高血压指南', '高血压防治指南'],
    keywords: ['高血压', '指南', '降压目标', '诊断标准', '生活方式'],
    summary: [
      '《中国高血压防治指南（2024年版）》强调高血压全人群防控、分级管理与靶器官保护。',
      '诊断切点仍为诊室血压 ≥140/90 mmHg；家庭自测血压 ≥135/85 mmHg。',
      '在生活方式干预基础上，根据风险分层启动药物治疗，降压目标一般 <140/90 mmHg，能耐受者及高危者可降至 <130/80 mmHg。',
    ],
    sections: {
      指南要点: [
        '诊断：非同日 3 次诊室血压 ≥140/90 mmHg；家庭血压 ≥135/85 mmHg。',
        '生活方式干预是贯穿全程的基础：限盐、控体重、戒烟限酒、规律运动、心理平衡。',
        '五大类一线降压药（CCB/ACEI/ARB/利尿剂/β受体阻滞剂）均可选用，根据合并症个体化。',
        '降压目标：一般 <140/90 mmHg，能耐受者及高危患者可进一步降至 <130/80 mmHg。',
        '强调家庭血压监测与长期规范随访，关注心、脑、肾、眼底等靶器官损害评估。',
      ],
    },
    source: {
      sourceType: 'guideline',
      title: '中国高血压防治指南（2024年版）',
      publisher: '中国高血压防治指南修订委员会',
      year: 2024,
    },
  },
];

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

/** 归一化：去空白、转小写、去标点，便于中英混排匹配 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\u3000，。、；：？！,.!?;:'"()（）\[\]【】]/g, '');
}

/** 对单条知识条目计算与 query 的相关分 */
function scoreEntry(entry: KnowledgeEntry, normQuery: string): number {
  if (!normQuery) return 0;
  let score = 0;
  const names = [entry.name, ...entry.aliases].map(normalize);
  const kws = entry.keywords.map(normalize);

  for (const name of names) {
    if (!name) continue;
    if (normQuery === name) score += 100;
    else if (normQuery.includes(name)) score += 60;
    else if (name.includes(normQuery) && normQuery.length >= 2) score += 30;
  }
  for (const kw of kws) {
    if (kw && normQuery.includes(kw)) score += 15;
  }
  // 子主题命中加权（病因/症状…出现在 query 中）
  for (const section of Object.keys(entry.sections)) {
    if (normQuery.includes(normalize(section))) score += 10;
  }
  return score;
}

/** 从问题中识别子主题意图 */
function detectIntent(question: string): string | undefined {
  const q = normalize(question);
  if (!q) return undefined;
  let best: { intent: string; hits: number } | undefined;
  for (const [intent, triggers] of Object.entries(INTENT_PATTERNS)) {
    let hits = 0;
    for (const t of triggers) {
      if (q.includes(normalize(t))) hits += 1;
    }
    if (hits > 0 && (!best || hits > best.hits)) best = { intent, hits };
  }
  return best?.intent;
}

// ---------------------------------------------------------------------------
// 导出纯函数
// ---------------------------------------------------------------------------

/**
 * 检索知识词典，返回按相关分降序排列的前 topK 条。
 * 纯函数、无 I/O；query 为空或无命中时返回空数组。
 */
export function searchMedicalKnowledge(query: string, topK = 5): KnowledgeEntry[] {
  if (typeof query !== 'string' || query.trim() === '') return [];
  const norm = normalize(query);
  const scored = KNOWLEDGE_BASE
    .map((entry) => ({ entry, score: scoreEntry(entry, norm) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const k = Math.max(1, Number.isFinite(topK) ? Math.floor(topK) : 5);
  return scored.slice(0, k).map((x) => x.entry);
}

/**
 * 由引用来源构造（并规范化）一条 Citation。
 * 纯函数：补全默认字段、保证类型安全，不做任何 I/O。
 */
export function generateCitation(source: Partial<Citation> | null | undefined): Citation {
  const s = source ?? {};
  return {
    sourceType: (s.sourceType as CitationSourceType) ?? 'textbook',
    title: typeof s.title === 'string' && s.title.trim() ? s.title.trim() : '未注明出处',
    publisher: typeof s.publisher === 'string' && s.publisher.trim() ? s.publisher.trim() : '未注明出版方',
    year: Number.isFinite(s.year) && (s.year as number) > 1900 ? Math.floor(s.year as number) : new Date().getFullYear(),
    edition: s.edition ? String(s.edition) : undefined,
    url: s.url ? String(s.url) : undefined,
  };
}

/**
 * 医学知识问答主函数。
 * @param question 用户问题（纯字符串）
 * @param context  可选上下文（保留扩展位：如科室、主诉），当前仅透传不参与匹配
 * @returns AnswerResult；未命中词典时 matched=false 并返回 NOT_FOUND_HINT
 */
export function answerMedicalQuestion(
  question: string,
  context?: Record<string, unknown> | null,
): AnswerResult {
  const q = typeof question === 'string' ? question.trim() : '';
  const base: AnswerResult = {
    question: q,
    matched: false,
    answer: '',
    citations: [],
    notFoundHint: '',
    disclaimer: QA_DISCLAIMER,
  };
  // context 为保留扩展位，此处仅做空值防护，不影响纯函数确定性
  void context;

  if (!q) {
    return { ...base, notFoundHint: '请输入您的医学问题。' };
  }

  const hits = searchMedicalKnowledge(q, 1);
  if (hits.length === 0) {
    return { ...base, notFoundHint: NOT_FOUND_HINT };
  }

  const entry = hits[0];
  const intent = detectIntent(q);

  // 组装回答正文
  const lines: string[] = [];
  lines.push(`【${entry.name}】`);
  if (intent && entry.sections[intent] && entry.sections[intent].length > 0) {
    lines.push(`◆ ${intent}`);
    for (const point of entry.sections[intent]) lines.push(`· ${point}`);
    // 若命中子主题，再补一句综述以保持上下文完整
    if (entry.summary.length > 0) {
      lines.push('◆ 概述');
      for (const point of entry.summary.slice(0, 2)) lines.push(`· ${point}`);
    }
  } else {
    // 未命中具体子主题：给综述
    for (const point of entry.summary) lines.push(`· ${point}`);
    // 同时列出可查询的子主题，引导用户精确提问
    const subs = Object.keys(entry.sections);
    if (subs.length > 0) {
      lines.push(`可进一步追问：${subs.join('、')}。`);
    }
  }

  return {
    ...base,
    matched: true,
    entryId: entry.id,
    category: entry.category,
    title: entry.name,
    intent,
    answer: lines.join('\n'),
    citations: [generateCitation(entry.source)],
  };
}
