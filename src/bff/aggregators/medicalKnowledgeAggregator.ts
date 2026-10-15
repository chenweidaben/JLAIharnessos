/**
 * 健澜科技 jlmedaios - 医学知识智能问答聚合器（M126-C，AI 能力升级）
 *
 * 面向临床医生 / 护士 / 药师 / 行政人员的自然语言医学知识问答：
 * 把「高血压诊断标准是什么」「术前禁食多久」这类问题，在内置的
 * 院内权威知识种子库（MedicalKnowledgeEntry）中做意图识别 + 关键词
 * 加权检索，输出一段可直接阅读的答案 + 可溯源来源列表 + 0~1 置信度。
 *
 * AI 能力升级点（相对 M118-B 经验问答）：
 *  1. 问题理解：识别「定义 / 诊断标准 / 治疗 / 预防 / 注意事项」五类意图，
 *     命中不同意图时答案侧重不同段落；
 *  2. 知识检索：标题权重 +3、关键要点权重 +2、正文权重 +1，科室一致
 *     加权 +0.1，上下文命中（年龄 / 症状 / 检查）额外 +0.05；
 *  3. 答案生成：模板化拼装「核心结论 → 关键要点 → 适用边界 → 免责声明」
 *     四段式，确定性、可单测、不臆造。
 *
 * 医疗安全红线（依据宪法第七章）：
 *  - 本聚合器纯函数：不触库、不调外部 LLM、不碰 WebSocket、零新增依赖；
 *  - 知识种子为院内权威指南摘要（脱敏），不包含任何患者个人标识符；
 *  - 答案必须附带 sources（指南 / 教材来源），全程可溯源；
 *  - 答案末尾固定追加免责声明「仅供参考，不构成医疗建议」；
 *  - 低置信度（<0.4）时答案明确提示「未检索到强相关证据」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 知识条目分类 */
export type KnowledgeCategory =
  | 'disease'      // 疾病
  | 'symptom'      // 症状 / 体征
  | 'drug'         // 药物 / 药事
  | 'procedure'    // 操作 / 流程
  | 'nursing'      // 护理
  | 'management';  // 医院管理 / 院感

/** 意图识别结果 */
export type QuestionIntent =
  | 'definition'    // 定义 / 是什么
  | 'diagnosis'     // 诊断标准
  | 'treatment'     // 治疗 / 处理
  | 'prevention'    // 预防 / 护理
  | 'caution'       // 注意事项 / 禁忌
  | 'general';      // 未识别

/** 单条医学知识种子条目 */
export interface MedicalKnowledgeEntry {
  /** 条目 id（稳定，用于溯源） */
  id: string;
  /** 主题词（用于关键词匹配） */
  topic: string;
  /** 中文标题 */
  title: string;
  /** 分类 */
  category: KnowledgeCategory;
  /** 适用科室编码（用于科室加权） */
  deptCodes: string[];
  /** 定义段（回答「是什么」） */
  definition: string;
  /** 诊断标准段 */
  diagnosis: string;
  /** 治疗 / 处理段 */
  treatment: string;
  /** 预防 / 护理段 */
  prevention: string;
  /** 注意事项 / 禁忌段 */
  caution: string;
  /** 关键要点（bullet，答案中以列表呈现） */
  keyPoints: string[];
  /** 来源（指南 / 教材名称 + 年份） */
  sources: Array<{ name: string; year?: string; publisher?: string }>;
  /** 证据强度 0~1（0.9 = 指南强推荐，0.5 = 专家共识） */
  evidenceLevel: number;
}

/** 问答上下文（可选，用于相关性加权） */
export interface MedicalKnowledgeContext {
  /** 患者年龄段：adult / pediatric / geriatric */
  ageGroup?: string;
  /** 已知症状 / 检查关键词 */
  symptoms?: string[];
  /** 当前所在科室 */
  deptCode?: string;
}

/** 答案溯源条目 */
export interface MedicalKnowledgeSource {
  id: string;
  title: string;
  category: KnowledgeCategory;
  matchedTopic: string;
  score: number;
  guideline: string;
}

/** askMedicalKnowledge 返回信封 */
export interface MedicalKnowledgeResult {
  /** 拼接后的可读答案；无命中时为兜底提示语 */
  answer: string;
  /** 命中来源列表（按命中分降序，最多 3 条）；无命中为空数组 */
  sources: MedicalKnowledgeSource[];
  /** 置信度 0~1；无命中为 0 */
  confidence: number;
  /** 识别出的意图 */
  intent: QuestionIntent;
  /** 是否命中任何知识条目 */
  matched: boolean;
}

/* ------------------------------ 工具函数 ------------------------------ */

/** 中文疑问词 / 助词（去停用后再切词） */
const STOP_WORDS =
  /(怎么|怎样|怎么样|如何|为什么|为何|什么|哪些|多少|多久|吗|呢|啊|呀|哦|的|了|是|我|我们|请|请问|问一下|关于|一下|的时候|需要|可以|能不能|要不要|应该|必须|标准|原则|规范|指南|诊断|治疗|预防|护理|注意|禁忌|定义|概念)/g;

/**
 * tokenizeQuestion：把自然语言问句切成关键词数组（确定性、可单测）。
 *
 * 口径：去空白 → 去掉疑问词 / 助词 → 按空白与中英文标点切分 → 去重、去空串。
 * 不引入任何分词库（零新增依赖）。
 */
export function tokenizeQuestion(question: string | undefined): string[] {
  const raw = (question ?? '').trim().toLowerCase();
  if (!raw) return [];
  const cleaned = raw.replace(STOP_WORDS, ' ');
  const terms = cleaned
    .split(/[\s,，。、？?！!；;：:（）()《》〈〉「」"'`~]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1); // 过滤单字（无检索意义）
  return Array.from(new Set(terms));
}

/**
 * detectIntent：识别问句意图（定义 / 诊断 / 治疗 / 预防 / 注意事项 / 通用）。
 *
 * 口径：基于关键词命中，多意图时取优先级最高者
 * （诊断 > 治疗 > 预防 > 注意事项 > 定义 > 通用）。
 */
export function detectIntent(question: string | undefined): QuestionIntent {
  const q = (question ?? '').trim();
  if (!q) return 'general';
  if (/诊断|标准|确诊|分类|分期/.test(q)) return 'diagnosis';
  if (/治疗|处理|用药|手术|方案|降压|降糖|止痛/.test(q)) return 'treatment';
  if (/预防|护理|怎么防|如何防|避免|疫苗|筛查/.test(q)) return 'prevention';
  if (/注意|禁忌|不能|慎用|不良反应|风险|警惕|红旗/.test(q)) return 'caution';
  if (/是什么|什么是|定义|概念|哪些|何为/.test(q)) return 'definition';
  return 'general';
}

/** 意图中文标签（答案拼装用） */
const INTENT_LABEL_ZH: Record<QuestionIntent, string> = {
  definition: '核心定义',
  diagnosis: '诊断要点',
  treatment: '治疗与处理',
  prevention: '预防与护理',
  caution: '注意事项与禁忌',
  general: '知识要点',
};

/* --------------------------- 内置医学知识种子库 --------------------------- */

/**
 * 默认医学知识种子库（AI 能力升级：M126-C）。
 *
 * 为院内常见临床主题提供脱敏、可溯源的指南摘要。生产环境可由知识库
 * 摄入流程（knowledgeAggregator.ingestDocument）替换为持久化条目；
 * 此处作为纯函数默认语料，保证离线可跑、可单测。
 *
 * 条目均为公开指南 / 教材的脱敏摘要，不涉及任何具体患者信息。
 */
export function buildDefaultMedicalKnowledge(): MedicalKnowledgeEntry[] {
  return [
    {
      id: 'mk-hypertension',
      topic: '高血压 高血压病 血压',
      title: '原发性高血压',
      category: 'disease',
      deptCodes: ['cardio', 'internal', 'general'],
      definition:
        '原发性高血压是以体循环动脉血压持续升高为主要表现、可伴心脑肾等靶器官损害的临床综合征，占高血压人群 90% 以上。',
      diagnosis:
        '非同日三次诊室血压测量，收缩压 ≥140 mmHg 和/或舒张压 ≥90 mmHg 即可诊断；家庭血压 ≥135/85 mmHg、动态血压白天均值 ≥135/85 mmHg 亦可作为依据。',
      treatment:
        '生活方式干预为基础（限盐 <5g/d、控重、戒烟限酒、规律运动）；单药起始常用 ACEI/ARB、CCB 或利尿剂；2 级及以上高血压可起始两药联合。目标血压一般 <140/90 mmHg，能耐受者可降至 <130/80 mmHg。',
      prevention:
        '定期监测血压（≥35 岁每年至少 1 次）；限盐、控体重、规律有氧运动、限酒、心理平衡；高血压家族史 / 肥胖 / 高盐饮食人群为高危，应每半年测量一次。',
      caution:
        '避免血压骤降（尤其老年患者）；ACEI/ARB 禁用于妊娠中晚期、双侧肾动脉狭窄；突然停药可致反跳性高血压。',
      keyPoints: [
        '非同日三次 ≥140/90 mmHg 诊断',
        '生活方式干预贯穿全程',
        '多数患者需长期规律用药',
      ],
      sources: [
        { name: '中国高血压防治指南（2024 年修订版）', publisher: '中国高血压联盟' },
      ],
      evidenceLevel: 0.95,
    },
    {
      id: 'mk-diabetes-t2dm',
      topic: '糖尿病 2型糖尿病 血糖 糖化血红蛋白',
      title: '2 型糖尿病',
      category: 'disease',
      deptCodes: ['endo', 'internal', 'general'],
      definition:
        '2 型糖尿病是以胰岛素抵抗为主伴相对胰岛素分泌不足为特征的代谢性疾病，占糖尿病总数 90% 以上。',
      diagnosis:
        '空腹血糖 ≥7.0 mmol/L，或 OGTT 2h 血糖 ≥11.1 mmol/L，或 HbA1c ≥6.5%，或随机血糖 ≥11.1 mmol/L 伴典型三多一少症状；需重复确认一次。',
      treatment:
        '医学营养治疗 + 运动为基础；二甲双胍为一线首选；HbA1c 不达标者按个体化加用 SGLT-2i、GLP-1RA、DPP-4i、磺脲类或胰岛素；合并 ASCVD / 心衰 / 慢性肾病者优先选用有心肾获益证据的药物。',
      prevention:
        '维持健康体重（BMI 18.5~23.9）；每周 ≥150 分钟中等强度有氧运动；低升糖指数饮食；糖尿病前期人群每年复查 OGTT。',
      caution:
        '警惕低血糖（磺脲类 / 胰岛素）；SGLT-2i 注意泌尿生殖系统感染与酮症；二甲双胍在 eGFR <30 mL/min/1.73m² 禁用。',
      keyPoints: [
        'HbA1c 一般目标 <7.0%，个体化放宽',
        '定期筛查眼底、肾功能、足部',
        '低血糖处理：15g 速效糖，15 分钟复测',
      ],
      sources: [
        { name: '中国 2 型糖尿病防治指南（2024 年版）', publisher: '中华医学会糖尿病学分会' },
      ],
      evidenceLevel: 0.95,
    },
    {
      id: 'mk-chest-pain',
      topic: '胸痛 胸闷 心绞痛 心肌梗死',
      title: '急性胸痛鉴别',
      category: 'symptom',
      deptCodes: ['er', 'cardio', 'emergency'],
      definition:
        '急性胸痛是病因跨度极大的急症症状，涵盖心、肺、消化道、肌肉骨骼等多系统疾病，其中急性冠脉综合征、主动脉夹层、肺栓塞、张力性气胸为致死性四大病因。',
      diagnosis:
        '首份心电图应在接诊 10 分钟内完成；监测肌钙蛋白动态变化；高危特征包括：持续 >20 分钟、向左肩背放射、伴大汗 / 呼吸困难 / 晕厥、血流动力学不稳定。',
      treatment:
        '疑似 ACS：立即卧床、心电监护、建立静脉通路、嚼服阿司匹林 300mg；ST 段抬高型心梗要求 10 分钟内启动再灌注（入门-球囊 90 分钟内）。',
      prevention:
        '胸痛中心绿色通道常态化；高危人群（高血压 / 糖尿病 / 吸烟 / 家族史）出现胸痛应立即拨打 120，避免自行驾车就医。',
      caution:
        '禁止因「患者年轻」「症状不典型」而漏诊 ACS；女性、糖尿病、老年患者症状常不典型。',
      keyPoints: [
        '10 分钟内完成首份心电图',
        '致死性四大病因：ACS / 夹层 / 肺栓 / 气胸',
        '高危胸痛一律走绿色通道',
      ],
      sources: [
        { name: '胸痛中心建设与管理指南（2023）', publisher: '中华医学会心血管病学分会' },
      ],
      evidenceLevel: 0.92,
    },
    {
      id: 'mk-fever',
      topic: '发热 发烧 体温',
      title: '发热待查与处理',
      category: 'symptom',
      deptCodes: ['general', 'internal', 'er', 'pediatrics'],
      definition:
        '发热指机体在致热原作用下体温调节中枢调定点上移，口温 ≥37.3℃ 或肛温 ≥37.5℃。',
      diagnosis:
        '重点采集热型、伴随症状（寒战 / 皮疹 / 咽痛 / 咳嗽 / 尿路刺激征）、流行病学史；血尿常规、CRP/PCT、影像学为常用筛查；发热 >3 周且病因不明为 FUO。',
      treatment:
        '低热（<38.5℃）以补液、休息为主；≥38.5℃ 或明显不适可予对乙酰氨基酚或布洛芬；细菌感染证据明确时方使用抗菌药物。',
      prevention:
        '手卫生、呼吸道防护；疫苗接种（流感、肺炎球菌）；老年人 / 婴幼儿 / 免疫抑制人群发热应尽早就医。',
      caution:
        '避免糖皮质激素作为常规退热剂；不明发热未明确细菌感染前不经验性使用抗菌药；儿童禁用阿司匹林（Reye 综合征风险）。',
      keyPoints: [
        '38.5℃ 为对症退热常用阈值',
        '细菌感染证据未明前不滥用抗菌药',
        '儿童禁用阿司匹林退热',
      ],
      sources: [
        { name: '发热待查诊治专家共识（2022）', publisher: '中华医学会感染病学分会' },
      ],
      evidenceLevel: 0.85,
    },
    {
      id: 'mk-antibiotic-stewardship',
      topic: '抗生素 抗菌药 抗菌药物 滥用',
      title: '抗菌药物合理使用原则',
      category: 'drug',
      deptCodes: ['pharma', 'internal', 'surgery', 'er'],
      definition:
        '抗菌药物合理使用是指在明确指征下选用适宜药物、采用适当剂量与疗程，以杀灭 / 抑制致病微生物并减少不良反应与耐药产生。',
      diagnosis:
        '用药前应尽量留取标本（血、痰、尿、分泌物）送检；结合感染部位、常见致病菌、患者肝肾功能与过敏史选药。',
      treatment:
        '经验治疗覆盖常见致病菌；病原学回报后及时降阶梯；剂量依据肝肾功能调整；疗程按感染类型决定（急性单纯性膀胱炎 3~5 天、肺炎 5~7 天等）。',
      prevention:
        'I 类切口手术预防用药不超过 24 小时；推广手卫生与接触隔离；监测本院抗菌药物使用强度（DDDs）。',
      caution:
        '病毒性上呼吸道感染不使用抗菌药；喹诺酮类 18 岁以下禁用、妊娠 / 哺乳慎用；氨基糖苷类注意耳肾毒性。',
      keyPoints: [
        '先留标本再经验用药',
        '病原学回报后及时降阶梯',
        'I 类切口预防用药 ≤24 小时',
      ],
      sources: [
        { name: '抗菌药物临床应用指导原则（2015 版）', publisher: '国家卫生健康委' },
      ],
      evidenceLevel: 0.95,
    },
    {
      id: 'mk-vte-prophylaxis',
      topic: '深静脉血栓 VTE 肺栓塞 气压泵 抗凝',
      title: '住院患者 VTE 预防',
      category: 'nursing',
      deptCodes: ['surgery', 'nursing', 'internal', 'oncology', 'orthopedics'],
      definition:
        '静脉血栓栓塞症（VTE）包括深静脉血栓（DVT）与肺栓塞（PE），是住院患者可预防的首位死亡原因之一。',
      diagnosis:
        'Caprini 评分用于外科住院患者风险分层；Padua 评分用于内科；高风险患者应常规评估出血风险后启动预防。',
      treatment:
        '基础预防（早期活动、足量补液）+ 机械预防（间歇充气加压装置 IPC）+ 药物预防（低分子肝素为首选）；出血高风险者先用机械预防。',
      prevention:
        '入院 24 小时内完成 VTE 风险评估；术后早期下床活动；骨科大手术药物预防通常维持 10~35 天。',
      caution:
        '活动性出血 / 严重凝血障碍为药物预防禁忌；ICP 与药物预防可联合；下肢 DVT 急性期禁止按摩患肢。',
      keyPoints: [
        '入院 24h 内完成风险评估',
        '基础 + 机械 + 药物三位一体',
        '骨科大手术后预防 10~35 天',
      ],
      sources: [
        { name: '医院内静脉血栓栓塞症防治与管理建议（2021）', publisher: '中华医学会血栓与止血学组' },
      ],
      evidenceLevel: 0.9,
    },
    {
      id: 'mk-fall-prevention',
      topic: '跌倒 坠床 防跌倒 Morse',
      title: '住院患者跌倒预防',
      category: 'nursing',
      deptCodes: ['nursing', 'geriatrics', 'neurology', 'orthopedics'],
      definition:
        '跌倒是指突发、不自主、非故意的体位改变，倒在地面或更低平面，是住院患者不良事件的首位类型。',
      diagnosis:
        '入院即采用 Morse 跌倒风险评估量表评分；≥45 分为高危；高危因素包括：年龄 ≥65、步态不稳、视力障碍、服用镇静 / 降压药、夜间如厕、既往跌倒史。',
      treatment:
        '高危患者床头悬挂警示标识；床栏拉起、床高适宜、地面干燥、照明充足；呼叫器置于易取处；协助如厕。',
      prevention:
        '入院与病情变化时动态复评；开展患者与家属健康教育；共用步行辅助器具。',
      caution:
        '避免约束带滥用（可增加伤害风险）；夜间留灯；服用降压 / 降糖药后警惕体位性低血压。',
      keyPoints: [
        'Morse ≥45 分即为高危',
        '床头警示 + 床栏 + 呼叫器易取',
        '动态复评，病情变化即评',
      ],
      sources: [
        { name: '成人住院患者跌倒风险评估及预防（WS/T 785-2021）', publisher: '国家卫生健康委' },
      ],
      evidenceLevel: 0.9,
    },
    {
      id: 'mk-preop-fasting',
      topic: '术前禁食 禁饮 清流质 麻醉',
      title: '术前禁食禁饮指南',
      category: 'procedure',
      deptCodes: ['surgery', 'anesthesia', 'nursing'],
      definition:
        '术前禁食禁饮（NPO）是为减少麻醉诱导时胃内容物反流误吸风险的常规术前准备。',
      diagnosis:
        '无需「午夜后禁食」旧规；按摄入物性质分层：清流质 2h、母乳 4h、配方奶 / 轻食 6h、高脂肉类 8h。',
      treatment:
        '择期手术患者术前 2h 可饮清流质（≤5 mL/kg，≤300 mL）；合并胃排空延迟（糖尿病自主神经病变、肠梗阻、急诊）例外。',
      prevention:
        '术前宣教告知禁食时间表；护士术前一日与当日晨双人核对。',
      caution:
        '急诊饱胃患者按饱胃麻醉处理；避免长时间禁食导致低血糖 / 脱水。',
      keyPoints: [
        '清流质术前 2h 即可',
        '轻食 6h、高脂肉类 8h',
        '急诊饱胃例外处理',
      ],
      sources: [
        { name: '成人与小儿手术麻醉前禁食指南（2020 版）', publisher: '中华医学会麻醉学分会' },
      ],
      evidenceLevel: 0.88,
    },
    {
      id: 'mk-skin-test',
      topic: '皮试 青霉素 头孢 过敏',
      title: '抗菌药物皮肤试验',
      category: 'drug',
      deptCodes: ['pharma', 'nursing', 'internal', 'er'],
      definition:
        '皮肤试验是通过皮内 / 表皮试验检测患者是否对药物（主要是 β-内酰胺类）存在速发型超敏反应。',
      diagnosis:
        '青霉素类用药前常规皮试；头孢菌素参照说明书与本院规范；皮试液应现配现用、浓度准确、对照可靠。',
      treatment:
        '皮试阳性者禁用对应药物并记录于病历；疑似阳性应在另一侧前臂以生理盐水对照复核。',
      prevention:
        '用药前详细询问过敏史；皮试后观察 20 分钟；急救车与肾上腺素常备。',
      caution:
        '皮试阴性不等于绝对不过敏；用药后仍需观察 30 分钟；肾上腺素为过敏性休克首选用药。',
      keyPoints: [
        '青霉素类用药前常规皮试',
        '皮试后观察 20 分钟',
        '过敏性休克首选肾上腺素',
      ],
      sources: [
        { name: 'β-内酰胺类抗菌药物皮肤试验指导原则（2021）', publisher: '国家卫生健康委' },
      ],
      evidenceLevel: 0.9,
    },
    {
      id: 'mk-nutrition-screening',
      topic: '营养筛查 NRS2002 营养不良 BMI',
      title: '住院患者营养风险筛查',
      category: 'nursing',
      deptCodes: ['nursing', 'nutrition', 'surgery', 'oncology'],
      definition:
        '营养风险筛查是识别患者是否因营养因素发生不良临床结局风险的快速评估工具。',
      diagnosis:
        'NRS-2002 为首选：BMI <18.5、近 3 月体重下降 >5%、近 1 周摄入 <50%、疾病严重度评分相加 ≥3 分即存在营养风险。',
      treatment:
        '存在营养风险者应由营养支持小组制定营养支持方案；肠内营养优先于肠外；应激性高血糖需严格控糖。',
      prevention:
        '入院 24~48h 内完成首次筛查；慢性病 / 老年 / 肿瘤患者每周复评。',
      caution:
        '严重应激 / 肠梗阻为肠内营养禁忌；再喂养综合征高危者补充硫胺素并缓慢加量。',
      keyPoints: [
        'NRS-2002 ≥3 分提示营养风险',
        '肠内营养优先于肠外',
        '再喂养综合征注意补硫胺素',
      ],
      sources: [
        { name: '成人患者营养风险筛查与营养支持治疗指南（2023）', publisher: '中华医学会肠外肠内营养学分会' },
      ],
      evidenceLevel: 0.88,
    },
    {
      id: 'mk-hai-hand-hygiene',
      topic: '院感 手卫生 交叉感染 多重耐药',
      title: '医务人员手卫生规范',
      category: 'management',
      deptCodes: ['nursing', 'admin', 'icu', 'all'],
      definition:
        '手卫生是预防医院感染与多重耐药菌传播最经济、最有效的措施，包括洗手、卫生手消毒与外科手消毒。',
      diagnosis:
        'WHO 五个时刻：接触患者前、清洁 / 无菌操作前、暴露患者体液风险后、接触患者后、接触患者周围环境后。',
      treatment:
        '无明显污染时使用速干手消毒剂揉搓 20~30 秒；有明显污染或艰难梭菌等芽孢菌接触后使用皂液流动水洗手 40~60 秒。',
      prevention:
        '手卫生依从率目标 ≥95%；定期暗访 + 反馈；床尾 / 床旁配备速干手消。',
      caution:
        '戴手套不能替代手卫生；手套破损 / 脱除后必须立即手卫生。',
      keyPoints: [
        'WHO 五个时刻',
        '无明显污染用速干手消',
        '芽孢菌污染必须皂液流动水洗手',
      ],
      sources: [
        { name: '医务人员手卫生规范（WS/T 313-2019）', publisher: '国家卫生健康委' },
      ],
      evidenceLevel: 0.95,
    },
  ];
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * askMedicalKnowledge：医学知识智能问答（AI 能力升级 M126-C）。
 *
 * 口径：
 *  1. 问句经 tokenizeQuestion 切词；无有效词 → 直接返回「未命中」兜底答案；
 *  2. 同时调用 detectIntent 识别意图，决定答案侧重段落；
 *  3. 对每条知识条目：逐词在 topic（权重 +3）/ keyPoints（权重 +2）/
 *     definition+diagnosis+treatment+prevention+caution（权重 +1）做包含匹配；
 *  4. 加权：提问科室与条目 deptCodes 一致 +0.1；上下文 symptoms 命中条目正文
 *     +0.05；ageGroup 与条目适用人群匹配 +0.05；
 *  5. 置信度 = clamp(0.2 + 0.4*coverage + deptBoost + contextBoost
 *     + 0.1*evidenceLevel, 0, 1)；
 *  6. 排序：置信度降序 → 命中分降序 → 标题字典序；取 Top1 拼答案，Top3 入 sources；
 *  7. 纯函数：不修改入参数组 / 对象，返回新对象；答案末尾固定追加免责声明。
 *
 * @param question  自然语言问句（可空）
 * @param deptCode 提问人所在科室编码（空值忽略加权）
 * @param context   可选上下文（年龄组 / 症状 / 科室），用于相关性加权
 * @param knowledge 可选知识条目数组（默认使用内置种子库；测试可注入 mock）
 * @returns { answer, sources, confidence, intent, matched }
 */
export function askMedicalKnowledge(
  question: string | undefined,
  deptCode?: string,
  context?: MedicalKnowledgeContext,
  knowledge?: readonly MedicalKnowledgeEntry[],
): MedicalKnowledgeResult {
  const terms = tokenizeQuestion(question);
  const intent = detectIntent(question);
  const deptFilter = (deptCode ?? context?.deptCode ?? '').trim().toLowerCase();
  const symptoms = (context?.symptoms ?? []).map((s) => s.toLowerCase());
  const ageGroup = (context?.ageGroup ?? '').toLowerCase();

  const corpus = knowledge ?? buildDefaultMedicalKnowledge();

  // 空问句：直接兜底（不臆造）
  if (terms.length === 0) {
    return {
      answer:
        '请输入您的医学问题，例如「高血压诊断标准是什么」「术前禁食多久」「VTE 如何预防」。',
      sources: [],
      confidence: 0,
      intent,
      matched: false,
    };
  }

  interface Scored extends MedicalKnowledgeEntry {
    hitTerms: number;
    coverage: number;
    hitScore: number;
    deptBoost: number;
    contextBoost: number;
    confidence: number;
  }

  const scored: Scored[] = [];
  for (const entry of corpus) {
    const topic = entry.topic.toLowerCase();
    const keyPoints = entry.keyPoints.join(' ').toLowerCase();
    const body =
      `${entry.definition} ${entry.diagnosis} ${entry.treatment} ${entry.prevention} ${entry.caution}`.toLowerCase();

    let hitTerms = 0;
    let hitScore = 0;
    for (const term of terms) {
      if (topic.includes(term)) {
        hitTerms += 1;
        hitScore += 3;
      } else if (keyPoints.includes(term)) {
        hitTerms += 1;
        hitScore += 2;
      } else if (body.includes(term)) {
        hitTerms += 1;
        hitScore += 1;
      }
    }
    if (hitTerms === 0) continue;

    const coverage = hitTerms / terms.length;
    const deptBoost = deptFilter && entry.deptCodes.some((d) => d.toLowerCase() === deptFilter) ? 0.1 : 0;

    let contextBoost = 0;
    if (symptoms.length > 0) {
      const bodyAll = `${topic} ${keyPoints} ${body}`;
      for (const s of symptoms) {
        if (s && bodyAll.includes(s)) {
          contextBoost += 0.05;
          break; // 命中一项即加，不重复累加
        }
      }
    }
    if (ageGroup === 'pediatrics' && entry.deptCodes.includes('pediatrics')) contextBoost += 0.05;
    if (ageGroup === 'geriatric' && (entry.deptCodes.includes('geriatrics') || entry.deptCodes.includes('nursing'))) {
      contextBoost += 0.05;
    }
    contextBoost = Math.min(contextBoost, 0.1);

    let confidence = 0.2 + 0.4 * coverage + deptBoost + contextBoost + 0.1 * entry.evidenceLevel;
    confidence = Math.max(0, Math.min(1, confidence));

    scored.push({ ...entry, hitTerms, coverage, hitScore, deptBoost, contextBoost, confidence });
  }

  // 排序：置信度降序 → 命中分降序 → 标题字典序升序（结果确定、可单测）
  scored.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (b.hitScore !== a.hitScore) return b.hitScore - a.hitScore;
    return a.title.localeCompare(b.title);
  });

  // 无命中：兜底答案（不臆造）
  if (scored.length === 0) {
    return {
      answer:
        `院内医学知识库中暂未检索到与「${(question ?? '').trim()}」直接相关的条目，` +
        '建议换个问法（如指定疾病 / 症状 / 药物名称），或联系医务科 / 质控科补充对应知识条目。',
      sources: [],
      confidence: 0,
      intent,
      matched: false,
    };
  }

  const top = scored[0];

  // 根据意图选取答案侧重段落
  const focusParagraph =
    intent === 'definition' ? top.definition
    : intent === 'diagnosis' ? top.diagnosis
    : intent === 'treatment' ? top.treatment
    : intent === 'prevention' ? top.prevention
    : intent === 'caution' ? top.caution
    : top.definition;

  // 关键要点
  const bullets = top.keyPoints.map((p) => `• ${p}`).join('\n');

  // 指南来源摘要
  const guidelineText = top.sources
    .map((s) => `${s.name}${s.year ? `（${s.year}）` : ''}`)
    .join('；');

  // 低置信度提示
  const lowConfidenceTag =
    top.confidence < 0.4
      ? '⚠ 未检索到强相关证据，以下为最接近的条目摘要，请结合临床实际判断。\n\n'
      : '';

  const answer =
    `${lowConfidenceTag}` +
    `【${top.title} · ${INTENT_LABEL_ZH[intent]}】${focusParagraph}\n\n` +
    `【关键要点】\n${bullets}\n\n` +
    `【适用边界】本条目适用成人常见临床场景；特殊人群（妊娠 / 儿童 / 老年 / 肝肾功能不全）请参照对应专科指南与药品说明书。\n\n` +
    `【证据来源】${guidelineText}\n\n` +
    `—— 本答案由健澜医学知识助手生成，仅供参考，不构成医疗建议。`;

  const sources: MedicalKnowledgeSource[] = scored.slice(0, 3).map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    matchedTopic: e.topic.split(' ')[0],
    score: e.hitScore,
    guideline: e.sources[0]?.name ?? '院内知识条目',
  }));

  return {
    answer,
    sources,
    confidence: Math.round(top.confidence * 100) / 100,
    intent,
    matched: true,
  };
}
