/**
 * 健澜科技杠OS - 权威开放医疗知识库数据源清单
 *
 * 这里登记医疗知识中台可接入的权威数据源。每条记录明确：
 *  - 发布机构与官方入口
 *  - 许可证类型与是否允许再分发
 *  - 获取方式（开放直下 / 免费注册 / 持证认证 / 仅在线查阅）
 *
 * 合规红线：
 *  1. 标记 credentialed / registration / online-only 的数据源，下载器绝不自动抓取，
 *     只生成申请与合规使用指引；平台仓库不打包、不再分发这些数据。
 *  2. 允许再分发的数据，也必须保留来源与版权声明（NOTICE / DATA_LICENSES.md）。
 *  3. 具体文件版本会更新，直链可能变化；open 类源给出官方下载入口，下载前请核对。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

/** 获取方式 */
export type AccessKind =
  | 'open' // 开放，可匿名直接下载 / 调用
  | 'registration' // 免费注册账号并接受条款后下载
  | 'credentialed' // 需资质 / 培训认证后受限访问
  | 'online-only'; // 仅在线查阅，无批量再分发授权

/** 许可证族（用于合规校验与声明生成） */
export type LicenseKind =
  | 'cc0'
  | 'cc-by'
  | 'cc-by-sa'
  | 'cc-by-nc'
  | 'cc-by-nd-igo'
  | 'apache-2.0'
  | 'mit'
  | 'us-gov-pd' // 美国政府作品 / 公有领域
  | 'loinc' // LOINC 专有免费许可（带版权声明可再分发）
  | 'umls' // UMLS Metathesaurus License
  | 'physionet-cred' // PhysioNet Credentialed Health Data License
  | 'gov-open' // 中国政府公开发布（以官方公告为准）
  | 'research-only' // 仅研究用途
  | 'proprietary'; // 商业专有，需授权

export interface KnowledgeSource {
  id: string;
  /** 中文名 */
  name: string;
  /** 英文名（可选） */
  nameEn?: string;
  /** 知识类别 */
  category:
    | 'terminology' // 术语与编码
    | 'drug' // 药品
    | 'knowledge-graph' // 知识图谱 / 语言资源
    | 'corpus' // NLP 语料
    | 'evidence' // 循证 / 文献 / 指南
    | 'classification' // 分组与付费（DRG/DIP）
    | 'platform'; // 聚合平台
  /** 发布机构 */
  publisher: string;
  /** 官方入口（下载页 / API 文档 / 申请页） */
  url: string;
  /** 许可证族 */
  license: LicenseKind;
  /** 人类可读许可证说明 */
  licenseNote: string;
  /** 获取方式 */
  access: AccessKind;
  /** 是否允许随平台再分发（默认 false，保守处理） */
  redistributable: boolean;
  /** 是否允许商业使用 */
  commercialUse: boolean;
  /** 交付形态 */
  artifacts: string[];
  /** 下载器是否可自动拉取（仅 open 且给出稳定入口时为 true） */
  autoDownload: boolean;
  /** 自动下载时的相对落盘子目录（相对 data/knowledge/raw） */
  targetDir?: string;
  /** 注册 / 认证 / 查阅的具体指引 */
  instructions: string;
  /** 备注 */
  notes?: string;
}

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  // ───────────────────────── 术语与编码 ─────────────────────────
  {
    id: 'icd11',
    name: '国际疾病分类第十一次修订本（ICD-11）',
    nameEn: 'ICD-11 (WHO)',
    category: 'terminology',
    publisher: '世界卫生组织 WHO',
    url: 'https://icd.who.int/en',
    license: 'cc-by-nd-igo',
    licenseNote: 'ICD-11 采用 WHO 许可（类 CC BY-ND 3.0 IGO），允许使用与引用，不得改编后再授权；需保留 WHO 版权声明。',
    access: 'open',
    redistributable: false,
    commercialUse: true,
    artifacts: ['在线浏览', 'ICD-11 REST API', '官方导出工具'],
    autoDownload: false,
    instructions: '通过 ICD-11 API（https://icd.who.int/icdapi）申请免费 client id/secret 后按术语拉取，或使用官方导出；落库时保留 WHO 版权与版本号。',
    notes: '建议以 API 增量同步，不整库再分发。',
  },
  {
    id: 'icd10',
    name: '国际疾病分类第十版（ICD-10）',
    nameEn: 'ICD-10 (WHO)',
    category: 'terminology',
    publisher: '世界卫生组织 WHO',
    url: 'https://icd.who.int/browse10',
    license: 'proprietary',
    licenseNote: 'WHO 持有 ICD-10 版权，允许成员国使用；中文译本版权与发布以国家卫健委/国家医保局为准。',
    access: 'online-only',
    redistributable: false,
    commercialUse: false,
    artifacts: ['在线分类', '官方译本'],
    autoDownload: false,
    instructions: '在线查阅 WHO 版；中文临床编码请使用国家医保版 ICD-10（见 cn-icd-insurance），以官方发布文件为准，勿从非授权镜像抓取。',
  },
  {
    id: 'cn-icd-insurance',
    name: '国家医保版 ICD-10 / ICD-9-CM-3 编码',
    category: 'terminology',
    publisher: '国家医疗保障局（中国）',
    url: 'https://www.nhsa.gov.cn/',
    license: 'gov-open',
    licenseNote: '政府部门公开发布的编码标准，供医疗机构执行；再分发与商用以官方公告/授权为准。',
    access: 'online-only',
    redistributable: false,
    commercialUse: false,
    artifacts: ['官方公告', '编码对照表文件'],
    autoDownload: false,
    instructions: '在国家医保局官网检索“医疗保障疾病诊断分类及代码”“医疗保障手术操作分类与编码”，以官方最新版本文件导入；院内使用请遵循当地医保与卫健要求。',
  },
  {
    id: 'loinc',
    name: 'LOINC 检验观测标识符',
    nameEn: 'LOINC (Regenstrief Institute)',
    category: 'terminology',
    publisher: 'Regenstrief Institute',
    url: 'https://loinc.org/downloads/',
    license: 'loinc',
    licenseNote: 'LOINC 免费使用，接受 LOINC License 后可再分发，但必须保留 LOINC/Regenstrief 版权声明。',
    access: 'registration',
    redistributable: true,
    commercialUse: true,
    artifacts: ['LOINC Table (CSV)', 'RELMA', '多语言版（含中文简体 zh-CN）'],
    autoDownload: false,
    instructions: '在 loinc.org 免费注册账号、接受 LOINC License 后下载官方压缩包与中文语言包；放置到 data/knowledge/raw/loinc 并保留 LICENSE 文件。',
  },
  {
    id: 'snomed-ct',
    name: 'SNOMED CT 临床术语集',
    nameEn: 'SNOMED CT',
    category: 'terminology',
    publisher: 'SNOMED International',
    url: 'https://www.snomed.org/get-snomed',
    license: 'proprietary',
    licenseNote: 'SNOMED CT 受版权保护；成员国/地区通过 MLDS 或 UMLS 授权使用，中国需确认所属渠道许可。',
    access: 'credentialed',
    redistributable: false,
    commercialUse: false,
    artifacts: ['RF2 发布包', '浏览器', '映射表'],
    autoDownload: false,
    instructions: '通过 MLDS（mlds.snomed.org）注册并加入有权限的国家/地区，或通过 UMLS（见 umls）获取；未获授权不得下载、打包或商用。',
  },
  {
    id: 'rxnorm',
    name: 'RxNorm 临床药品术语',
    category: 'drug',
    publisher: '美国国家医学图书馆 NLM',
    url: 'https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html',
    license: 'umls',
    licenseNote: 'RxNorm 作为 UMLS 源词汇免费提供，需注册 UMLS 账号并接受 Metathesaurus License；RxNorm 自身条款较宽松。',
    access: 'registration',
    redistributable: false,
    commercialUse: true,
    artifacts: ['RRF 月度发布', 'RxNorm API', 'Open-Rx 参考'],
    autoDownload: false,
    instructions: '申请免费 UMLS 账号（uts.nlm.nih.gov），接受许可后下载 RxNorm RRF 或调用 RxNorm API；保留 NLM 来源声明。',
  },
  {
    id: 'umls',
    name: '统一医学语言系统 UMLS',
    nameEn: 'Unified Medical Language System',
    category: 'terminology',
    publisher: '美国国家医学图书馆 NLM',
    url: 'https://www.nlm.nih.gov/research/umls/',
    license: 'umls',
    licenseNote: '需注册并接受 UMLS Metathesaurus License；各源词汇另有其版权约束。',
    access: 'credentialed',
    redistributable: false,
    commercialUse: false,
    artifacts: ['Metathesaurus', 'Semantic Network', 'SPECIALIST Lexicon'],
    autoDownload: false,
    instructions: '在 uts.nlm.nih.gov 注册、完成身份与用途说明、接受许可后下载；严禁将受限源词汇再分发。',
  },
  {
    id: 'mesh',
    name: '医学主题词表 MeSH',
    nameEn: 'Medical Subject Headings',
    category: 'terminology',
    publisher: '美国国家医学图书馆 NLM',
    url: 'https://www.nlm.nih.gov/databases/download/mesh.html',
    license: 'us-gov-pd',
    licenseNote: 'NLM 作品，条款宽松，可免费使用与再分发，建议保留来源声明。',
    access: 'open',
    redistributable: true,
    commercialUse: true,
    artifacts: ['XML/ASCII 年度文件', 'MeSH Browser', 'RDF'],
    autoDownload: true,
    targetDir: 'mesh',
    instructions: '可直接从 NLM 下载页获取年度 desc/pa/supp 词表；用于文献检索与同义词归一。',
  },
  {
    id: 'atc',
    name: 'ATC 解剖学治疗学及化学分类系统',
    nameEn: 'Anatomical Therapeutic Chemical Classification',
    category: 'drug',
    publisher: 'WHO Collaborating Centre for Drug Statistics Methodology',
    url: 'https://www.whocc.no/atc_ddd_index/',
    license: 'proprietary',
    licenseNote: 'ATC/DDD 由 WHOCC 维护，在线查询免费；结构化数据库再分发需授权。',
    access: 'online-only',
    redistributable: false,
    commercialUse: false,
    artifacts: ['在线索引', '受限数据库'],
    autoDownload: false,
    instructions: '在线查询 ATC 编码与 DDD；如需批量数据库，联系 WHOCC 申请，不得抓取其在线索引整库再分发。',
  },

  // ───────────────────────── 药品 ─────────────────────────
  {
    id: 'openfda',
    name: 'openFDA 开放数据（药品/器械/不良事件/NDC）',
    category: 'drug',
    publisher: '美国 FDA',
    url: 'https://open.fda.gov/apis/',
    license: 'us-gov-pd',
    licenseNote: '基于美国政府开放数据，公开 API 与批量下载，条款宽松（CC0 风格），需标注来源。',
    access: 'open',
    redistributable: true,
    commercialUse: true,
    artifacts: ['REST API', '批量数据下载', 'NDC SPL'],
    autoDownload: false,
    instructions: '可直接调用 openFDA API（建议申请免费 API key 提高限额）或下载 bulk data；用于药品说明书、NDC、不良事件信号参考。',
    notes: '国外数据，仅作研究参考，不替代中国药监审批信息。',
  },
  {
    id: 'chembl',
    name: 'ChEMBL 生物活性数据库',
    category: 'drug',
    publisher: 'EMBL-EBI',
    url: 'https://www.ebi.ac.uk/chembl/',
    license: 'cc-by-sa',
    licenseNote: 'ChEMBL 采用 CC BY-SA 3.0，可使用、再分发与商用，需署名并以相同方式共享衍生作品。',
    access: 'open',
    redistributable: true,
    commercialUse: true,
    artifacts: ['SQL dump', 'RDF', 'REST API', 'FASTA'],
    autoDownload: true,
    targetDir: 'chembl',
    instructions: '从 EMBL-EBI ChEMBL 下载页获取最新 SQL/RDF 发布；再分发或衍生时遵守 CC BY-SA 并署名 EMBL-EBI。',
  },
  {
    id: 'drugbank',
    name: 'DrugBank 药品数据库',
    category: 'drug',
    publisher: 'OMx Personal Health Analytics (DrugBank)',
    url: 'https://go.drugbank.com/',
    license: 'cc-by-nc',
    licenseNote: '学术/非商业用途为 CC BY-NC 4.0；商业使用需商业授权。',
    access: 'registration',
    redistributable: false,
    commercialUse: false,
    artifacts: ['XML/CSV 学术发布', 'API'],
    autoDownload: false,
    instructions: '注册并说明用途后下载学术版；本平台为商业医疗产品时必须购买商业授权，仓库不打包 DrugBank 数据。',
  },
  {
    id: 'cde',
    name: '国家药监局药品信息（CDE/NMPA）',
    category: 'drug',
    publisher: '国家药品监督管理局 / 药品审评中心 CDE',
    url: 'https://www.cde.org.cn/',
    license: 'gov-open',
    licenseNote: '政府公开信息，以官网发布为准；无明确批量再分发授权。',
    access: 'online-only',
    redistributable: false,
    commercialUse: false,
    artifacts: ['药品说明书', '受理/审批信息', '指导原则'],
    autoDownload: false,
    instructions: '通过 CDE/NMPA 官网或其公开查询接口核对国内药品说明书与审批信息；中文用药数据应以国家药监局权威信息为准。',
  },
  {
    id: 'cn-drug-lists',
    name: '国家基本药物目录 / 国家医保药品目录',
    category: 'drug',
    publisher: '国家卫生健康委 / 国家医疗保障局',
    url: 'https://www.nhsa.gov.cn/',
    license: 'gov-open',
    licenseNote: '政府公开发布目录，供执行；再分发以官方文件为准。',
    access: 'online-only',
    redistributable: false,
    commercialUse: false,
    artifacts: ['目录文件', '调整方案'],
    autoDownload: false,
    instructions: '从国家卫健委/医保局官网下载最新版基药目录、医保药品目录及备注限定支付范围，按官方版本维护。',
  },

  // ───────────────────────── 知识图谱 / 语言资源 ─────────────────────────
  {
    id: 'tcm-mkg',
    name: '中医药知识图谱 TCM-MKG',
    category: 'knowledge-graph',
    publisher: '学术团队（Zenodo 发布）',
    url: 'https://zenodo.org/record/8225529',
    license: 'cc-by',
    licenseNote: 'Zenodo 上的 TCM-MKG V2.0 多以 CC BY 4.0 发布（以具体记录页标注为准），可使用与再分发，需署名。',
    access: 'open',
    redistributable: true,
    commercialUse: true,
    artifacts: ['实体关系数据', '图谱文件'],
    autoDownload: true,
    targetDir: 'tcm-mkg',
    instructions: '从 Zenodo 记录页下载数据文件并保存其元数据与许可；用于中医证候、方剂、中药知识图谱构建。',
    notes: '下载前核对记录页实际许可证与版本。',
  },
  {
    id: 'cmekg',
    name: '中文医学知识图谱 CMeKG',
    nameEn: 'Chinese Medical Knowledge Graph',
    category: 'knowledge-graph',
    publisher: 'CMeKG 项目组（郑州大学等）',
    url: 'http://cmekg.pcl.ac.cn/',
    license: 'research-only',
    licenseNote: '以项目官网声明为准，多为科研/教学开放，商用与再分发需联系作者授权。',
    access: 'registration',
    redistributable: false,
    commercialUse: false,
    artifacts: ['在线图谱', '示例数据', 'API（申请）'],
    autoDownload: false,
    instructions: '通过官网申请数据/接口；商业产品使用前取得书面授权，仓库不打包 CMeKG 数据。',
  },
  {
    id: 'medct',
    name: 'MedCT 医学自然语言处理资源',
    category: 'knowledge-graph',
    publisher: 'TigerResearch（开源社区）',
    url: 'https://github.com/TigerResearch/MedCT',
    license: 'apache-2.0',
    licenseNote: '以 GitHub 仓库 LICENSE 文件为准（开源许可），使用前核对。',
    access: 'open',
    redistributable: true,
    commercialUse: true,
    artifacts: ['预训练模型', '处理脚本', '语料说明'],
    autoDownload: false,
    instructions: '从 GitHub 克隆仓库，阅读并保留其 LICENSE；模型与语料的商用条款需逐项核对。',
  },
  {
    id: 'opendrg',
    name: 'OpenDRG（CHS-DRG/DIP 开源实现）',
    category: 'classification',
    publisher: 'OpenDRG 开源社区（Gitee 镜像）',
    url: 'https://gitee.com/mirrors/OpenDRG',
    license: 'apache-2.0',
    licenseNote: 'Apache License 2.0，可自由使用、修改与再分发，需保留版权与许可声明。',
    access: 'open',
    redistributable: true,
    commercialUse: true,
    artifacts: ['分组器代码', '规则', '示例数据'],
    autoDownload: false,
    instructions: '从 Gitee/GitHub 克隆，作为 DRG/DIP 分组引擎参考；正式分组规则与费率以当地医保官方版本为准。',
  },

  // ───────────────────────── NLP 语料 ─────────────────────────
  {
    id: 'meddialog',
    name: 'MedDialog 中英文医患对话语料',
    category: 'corpus',
    publisher: '学术研究团队',
    url: 'https://github.com/UCSD-AI4H/COVID-Dialogue',
    license: 'research-only',
    licenseNote: '主要面向学术研究，使用以仓库声明/论文许可为准。',
    access: 'open',
    redistributable: false,
    commercialUse: false,
    artifacts: ['中英文对话 JSON'],
    autoDownload: false,
    instructions: '从 GitHub 获取用于研究与模型评测；商用训练需另行确认授权；不得用于还原真实患者身份。',
  },
  {
    id: 'cn-medical-dialogue',
    name: '中文医疗对话数据 Chinese-medical-dialogue-data',
    category: 'corpus',
    publisher: '开源社区（Toyhom 等）',
    url: 'https://github.com/Toyhom/Chinese-medical-dialogue-data',
    license: 'research-only',
    licenseNote: '以仓库 LICENSE 为准，多为科研用途。',
    access: 'open',
    redistributable: false,
    commercialUse: false,
    artifacts: ['科室对话语料'],
    autoDownload: false,
    instructions: '克隆后按仓库许可用于研究；商用前取得授权，并做隐私与质量审查。',
  },
  {
    id: 'mimic',
    name: 'MIMIC-III / MIMIC-IV 重症医学数据库',
    category: 'corpus',
    publisher: 'MIT Lab for Computational Physiology（PhysioNet）',
    url: 'https://physionet.org/content/mimiciv/',
    license: 'physionet-cred',
    licenseNote: 'PhysioNet Credentialed Health Data License；使用人须完成 CITI 数据/伦理培训并通过身份认证。',
    access: 'credentialed',
    redistributable: false,
    commercialUse: false,
    artifacts: ['去标识化住院/ICU 数据', '派生表'],
    autoDownload: false,
    instructions: '在 physionet.org 注册、完成 Human Subjects/ HIPAA 培训、签署数据使用协议（DUA）后访问；严禁随平台分发或用于直接临床决策。',
  },
  {
    id: 'eicu',
    name: 'eICU Collaborative Research Database',
    category: 'corpus',
    publisher: 'Philips Healthcare / MIT（PhysioNet）',
    url: 'https://physionet.org/content/eicu-crd/',
    license: 'physionet-cred',
    licenseNote: 'PhysioNet Credentialed Health Data License，需培训认证与 DUA。',
    access: 'credentialed',
    redistributable: false,
    commercialUse: false,
    artifacts: ['多中心 ICU 表'],
    autoDownload: false,
    instructions: '同 MIMIC，完成 PhysioNet 认证与 DUA 后访问，仅限研究，不得再分发。',
  },
  {
    id: 'pubmed',
    name: 'PubMed / PubMed Central 开放文献',
    category: 'evidence',
    publisher: '美国国家医学图书馆 NLM/NCBI',
    url: 'https://www.ncbi.nlm.nih.gov/home/develop/api/',
    license: 'us-gov-pd',
    licenseNote: 'E-utilities API 公开；PMC 开放获取（OA）子集允许文本挖掘，需遵守 NCBI 调用条款与各文章版权。',
    access: 'open',
    redistributable: true,
    commercialUse: true,
    artifacts: ['E-utilities API', 'PMC OA 批量包', '基线数据'],
    autoDownload: false,
    instructions: '通过 E-utilities 检索（≤3 次/秒，带 email/tool 参数），PMC OA bulk 用于本地循证库；注意区分 OA 与非 OA 文章版权。',
  },

  // ───────────────────────── 临床路径 / 指南 ─────────────────────────
  {
    id: 'cn-clinical-pathways',
    name: '国家临床路径（卫健委/中华医学会）',
    category: 'evidence',
    publisher: '国家卫生健康委 / 中华医学会',
    url: 'http://www.nhc.gov.cn/',
    license: 'gov-open',
    licenseNote: '政府与学会公开发布，免费供医疗机构执行；批量再分发以官方为准。',
    access: 'online-only',
    redistributable: false,
    commercialUse: false,
    artifacts: ['临床路径文本', '诊疗指南', '专家共识'],
    autoDownload: false,
    instructions: '从卫健委医政医管栏目、中华医学会系列期刊获取各病种临床路径与指南原文，按版本号维护并标注来源链接与发布日期。',
  },

  // ───────────────────────── 聚合平台 ─────────────────────────
  {
    id: 'hita',
    name: 'HiTA 知识服务平台（OMAHA）',
    category: 'platform',
    publisher: '浙江数字医疗卫生技术研究院（OMAHA）',
    url: 'https://knowledge.hita.org.cn/',
    license: 'proprietary',
    licenseNote: '平台资源需注册并遵循其会员/资源许可。',
    access: 'registration',
    redistributable: false,
    commercialUse: false,
    artifacts: ['术语集', '知识图谱', '白皮书'],
    autoDownload: false,
    instructions: '注册 HiTA 账号，按资源各自许可获取；需商用或再分发时取得相应授权。',
  },
  {
    id: 'omaha-mednum',
    name: '医数开放平台',
    category: 'platform',
    publisher: 'OMAHA 医数',
    url: 'https://www.omaha.org.cn/',
    license: 'proprietary',
    licenseNote: '以平台条款为准，多需注册与授权。',
    access: 'registration',
    redistributable: false,
    commercialUse: false,
    artifacts: ['开放数据集', 'API'],
    autoDownload: false,
    instructions: '注册并按平台协议申请数据/接口，遵守其使用与再分发限制。',
  },
];

/** 按类别分组 */
export function groupByCategory(): Record<string, KnowledgeSource[]> {
  return KNOWLEDGE_SOURCES.reduce<Record<string, KnowledgeSource[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});
}

export function getSource(id: string): KnowledgeSource | undefined {
  return KNOWLEDGE_SOURCES.find((s) => s.id === id);
}
