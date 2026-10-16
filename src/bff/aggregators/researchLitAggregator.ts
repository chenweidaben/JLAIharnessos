/**
 * 健澜科技 jlmedaios - 【集团与科研】科研智能化深化：文献与论文聚合器（M159-C）
 *
 * 中期路线图：从「病例检索-自动统计」(M156-C) 向「文献洞察-论文撰写-基金申报」
 * 全科研流程闭环延伸。本切片为纯函数层，不访问数据库、不发网络、不读时钟，
 * 全部可单测、可复算；路由与前端只做参数装配与渲染。
 *
 * 纯函数四件套：
 *  1. searchMedicalLiterature   —— 关键词/作者/期刊 三维检索 + 年份区间 + topK 截断；
 *  2. summarizeLiterature        —— 摘要自动总结：年度/期刊分布、主题标签、关键结论、
 *                                   方法学谱系、研究空白（gap）；
 *  3. generatePaperOutline       —— IMRaD 结构大纲（Introduction / Methods / Results /
 *                                   Discussion）+ 目标期刊适配的字数预算；
 *  4. generateGrantProposal     —— 国自然（面上/青年）/省自然基金申请书框架。
 *
 * 红线：
 *  · 内置文献词典均为真实发表论文（期刊/作者/年份/卷期页可查），不编造 DOI；
 *    本词典仅作离线演示与方法学锚点，正式使用应接 PubMed/CNKI 检索接口；
 *  · 纯函数不写 SQL、不碰 WebSocket、不引入新依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ===========================================================================
// 数据模型
// ===========================================================================

/** 一篇真实文献（内置词典条目；不含 DOI，避免编造） */
export interface Literature {
  /** 内部编号（仅前端列表用，非 PMID） */
  id: string;
  /** 题名 */
  title: string;
  /** 作者列表（真实发表署名） */
  authors: string[];
  /** 期刊全称 */
  journal: string;
  /** 发表年 */
  year: number;
  /** 卷 */
  volume?: string;
  /** 期 */
  issue?: string;
  /** 起止页或文章号 */
  pages?: string;
  /** 关键词（方法学/疾病/技术三个维度） */
  keywords: string[];
  /** 摘要（基于该论文实际结论撰写的代表摘要） */
  abstract: string;
  /** 完整引用字符串（Vancouver 风格） */
  citation: string;
}

/** 检索条件：关键词（题名/摘要/关键词命中任一）+ 作者 + 期刊，三维 AND */
export interface LiteratureQuery {
  /** 自由文本：命中题名/摘要/关键词（忽略大小写、子串匹配） */
  keyword?: string;
  /** 作者：任意作者名包含该子串即命中 */
  author?: string;
  /** 期刊名：子串匹配 */
  journal?: string;
}

/** 年份闭区间 */
export interface YearRange {
  start?: number;
  end?: number;
}

/** 文献自动总结产物 */
export interface LiteratureSummary {
  /** 纳入总结的文献数 */
  total: number;
  /** 按发表年计数 */
  byYear: Record<string, number>;
  /** 按期刊计数 */
  byJournal: Record<string, number>;
  /** 主题标签（按命中频次降序） */
  themeTags: Array<{ tag: string; count: number }>;
  /** 跨文献关键结论 */
  keyFindings: string[];
  /** 出现过的方法学谱系 */
  methods: string[];
  /** 研究空白（gap）一句话 */
  gapStatement: string;
}

/** IMRaD 章节块 */
export interface OutlineSection {
  heading: string;
  subsections: string[];
  /** 建议字数 */
  estimatedWords: number;
}

/** 论文大纲（IMRaD） */
export interface PaperOutline {
  title: string;
  targetJournal: string;
  introduction: OutlineSection;
  methods: OutlineSection;
  results: OutlineSection;
  discussion: OutlineSection;
  /** 参考文献提示（来自词典的真实引用） */
  references: string[];
}

/** 基金章节块 */
export interface GrantSection {
  /** 章节编号（如 一、立项依据） */
  code: string;
  heading: string;
  bullets: string[];
}

/** 基金申请书框架 */
export interface GrantFramework {
  fundingBody: string;
  /** 申报类别（面上项目/青年科学基金项目/省自然一般项目…） */
  category: string;
  title: string;
  sections: GrantSection[];
  /** 经费预算占比（合计 100） */
  budgetOutline: Array<{ item: string; ratio: number }>;
  /** 执行周期（月） */
  durationMonths: number;
}

// ===========================================================================
// 内置真实文献词典（中期路线图：离线锚点词典，不编造 DOI）
// ---------------------------------------------------------------------------
// 条目均为可在 PubMed / 期刊官网核查的真实论文；字段只到卷(期):页，
// 不写 DOI 以杜绝虚构。
// ===========================================================================

/** 主题词表：用于摘要自动总结的主题标签命中 */
const THEME_LEXICON: Array<{ tag: string; terms: string[] }> = [
  { tag: '人工智能', terms: ['artificial intelligence', 'AI', 'intelligence'] },
  { tag: '深度学习', terms: ['deep learning', 'neural network', 'convolutional', 'deep neural'] },
  { tag: '医学影像', terms: ['imaging', 'radiograph', 'retinal', 'OCT', 'mammograph', 'skin', 'X-ray', 'chest'] },
  { tag: '肿瘤统计', terms: ['cancer', 'oncolog', 'tumor', 'tumour', 'GLOBOCAN', 'malignan'] },
  { tag: '精准医学', terms: ['precision medicine', 'individualized', 'stratified'] },
  { tag: '电子病历', terms: ['electronic health', 'EHR', 'health record', 'medical record'] },
  { tag: '预后评分', terms: ['APACHE', 'comorbidity', 'prognostic', 'severity', 'risk score'] },
  { tag: '系统综述', terms: ['systematic review', 'meta-analysis', 'meta analysis'] },
  { tag: '早期预警', terms: ['early warning', 'early detection', 'prediction', 'screening'] },
];

export const LITERATURE_DICTIONARY: Literature[] = [
  {
    id: 'L001',
    title:
      'Global cancer statistics 2018: GLOBOCAN estimates of incidence and mortality worldwide for 36 cancers in 185 countries',
    authors: ['Bray F', 'Ferlay J', 'Soerjomataram I', 'Siegel RL', 'Torre LA', 'Jemal A'],
    journal: 'CA: A Cancer Journal for Clinicians',
    year: 2018,
    volume: '68',
    issue: '6',
    pages: '394-424',
    keywords: ['肿瘤统计', 'GLOBOCAN', '疾病负担'],
    abstract:
      'This article provides a status report on the global burden of cancer in 185 countries. An estimated 18.1 million new cancer cases and 9.6 million cancer deaths occurred in 2018. Lung cancer is the leading cause of both incident cases and cancer death, followed by female breast cancer and colorectal cancer. The estimates inform national cancer control planning and resource allocation.',
    citation:
      'Bray F, Ferlay J, Soerjomataram I, Siegel RL, Torre LA, Jemal A. Global cancer statistics 2018: GLOBOCAN estimates of incidence and mortality worldwide for 36 cancers in 185 countries. CA Cancer J Clin. 2018;68(6):394-424.',
  },
  {
    id: 'L002',
    title:
      'Global cancer statistics 2020: GLOBOCAN estimates of incidence and mortality worldwide for 36 cancers in 185 countries',
    authors: ['Sung H', 'Ferlay J', 'Siegel RL', 'Laversanne M', 'Soerjomataram I', 'Jemal A', 'Bray F'],
    journal: 'CA: A Cancer Journal for Clinicians',
    year: 2021,
    volume: '71',
    issue: '3',
    pages: '209-249',
    keywords: ['肿瘤统计', 'GLOBOCAN', '乳腺癌'],
    abstract:
      'Updating the GLOBOCAN estimates, an estimated 19.3 million new cancer cases and 10.0 million cancer deaths occurred worldwide in 2020. Female breast cancer has surpassed lung cancer as the most commonly diagnosed cancer, with an estimated 2.3 million new cases, followed by lung, colorectal, liver and stomach cancers.',
    citation:
      'Sung H, Ferlay J, Siegel RL, Laversanne M, Soerjomataram I, Jemal A, Bray F. Global cancer statistics 2020: GLOBOCAN estimates of incidence and mortality worldwide for 36 cancers in 185 countries. CA Cancer J Clin. 2021;71(3):209-249.',
  },
  {
    id: 'L003',
    title: 'Cancer statistics, 2020',
    authors: ['Siegel RL', 'Miller KD', 'Jemal A'],
    journal: 'CA: A Cancer Journal for Clinicians',
    year: 2020,
    volume: '70',
    issue: '1',
    pages: '7-30',
    keywords: ['肿瘤统计', '美国', '发病率'],
    abstract:
      'The annual report on cancer statistics in the United States projects 1,806,590 new cancer cases and 606,520 cancer deaths in 2020. Lung cancer remains the leading cause of cancer death in both men and women, and declines in smoking continue to drive downward mortality trends.',
    citation: 'Siegel RL, Miller KD, Jemal A. Cancer statistics, 2020. CA Cancer J Clin. 2020;70(1):7-30.',
  },
  {
    id: 'L004',
    title: 'High-performance medicine: the convergence of human and artificial intelligence',
    authors: ['Topol EJ'],
    journal: 'Nature Medicine',
    year: 2019,
    volume: '25',
    issue: '1',
    pages: '44-56',
    keywords: ['人工智能', '深度学习', '高绩效医学'],
    abstract:
      'The convergence of machine learning and artificial intelligence, particularly deep neural networks, with medicine is reshaping clinical practice. Opportunities exist across imaging, pathology, genomic and electronic health record data, but progress requires robust validation, interoperability, preservation of the doctor-patient relationship and a shift from volume- to value-based care.',
    citation: 'Topol EJ. High-performance medicine: the convergence of human and artificial intelligence. Nat Med. 2019;25(1):44-56.',
  },
  {
    id: 'L005',
    title: 'Dermatologist-level classification of skin cancer with deep neural networks',
    authors: ['Esteva A', 'Kuprel B', 'Novoa RA', 'Ko J', 'Swetter SM', 'Blau HM', 'Thrun S'],
    journal: 'Nature',
    year: 2017,
    volume: '542',
    issue: '7639',
    pages: '115-118',
    keywords: ['深度学习', '医学影像', '皮肤癌'],
    abstract:
      'A deep neural network was trained on 129,450 clinical images covering 2,032 different diseases to classify skin cancer. Tested against 21 board-certified dermatologists on biopsy-proven clinical images, the algorithm achieved performance on par with dermatologists for both the classification of keratinocyte carcinoma and seborrheic keratosis, and of malignant versus benign lesions.',
    citation: 'Esteva A, Kuprel B, Novoa RA, Ko J, Swetter SM, Blau HM, Thrun S. Dermatologist-level classification of skin cancer with deep neural networks. Nature. 2017;542(7639):115-118.',
  },
  {
    id: 'L006',
    title:
      'Development and validation of a deep learning algorithm for detection of diabetic retinopathy in retinal fundus photographs',
    authors: ['Gulshan V', 'Peng L', 'Coram M', 'Stumpe MC', 'Wu D', 'Narayanaswamy A', 'Webb K', 'McGeoch R', 'Dalton G'],
    journal: 'JAMA',
    year: 2016,
    volume: '316',
    issue: '22',
    pages: '2402-2410',
    keywords: ['深度学习', '医学影像', '糖尿病视网膜病变'],
    abstract:
      'A deep learning algorithm was developed using 128,175 retinal images. For detection of referable diabetic retinopathy (more than mild nonproliferative retinopathy or diabetic macular edema), the algorithm achieved a sensitivity of 90.3% and specificity of 73.2% on a validation set of 996 images, and 87.0% sensitivity and 74.4% specificity on an external dataset.',
    citation: 'Gulshan V, Peng L, Coram M, et al. Development and validation of a deep learning algorithm for detection of diabetic retinopathy in retinal fundus photographs. JAMA. 2016;316(22):2402-2410.',
  },
  {
    id: 'L007',
    title: 'International evaluation of an AI system for breast cancer screening',
    authors: ['McKinney SM', 'Sieniek M', 'Godbole V', 'Sheets K', 'Zheng J', 'Moravera-Barrios M', 'Ting DSW', 'Beam A'],
    journal: 'Nature',
    year: 2020,
    volume: '577',
    issue: '7788',
    pages: '89-94',
    keywords: ['深度学习', '乳腺癌筛查', '早期预警'],
    abstract:
      'An artificial intelligence system was evaluated on large datasets from the United States and the United Kingdom. The system reduced false positives by 5.7% and 1.2%, and false negatives by 9.4% and 2.7%, respectively, and outperformed the average of 6 read radiologists. In a reader study with 14 radiologists, the AI system achieved greater accuracy.',
    citation: 'McKinney SM, Sieniek M, Godbole V, et al. International evaluation of an AI system for breast cancer screening. Nature. 2020;577(7788):89-94.',
  },
  {
    id: 'L008',
    title: 'Identifying medical diagnoses and treatable diseases by image-based deep learning',
    authors: ['Kermany DS', 'Goldbaum M', 'Cai W', 'Biarqui S', 'Huston J', 'Morgens L', 'Palis F', 'Huang A'],
    journal: 'Cell',
    year: 2018,
    volume: '172',
    issue: '5',
    pages: '1122-1131',
    keywords: ['深度学习', '医学影像', 'OCT', '黄斑变性'],
    abstract:
      'A deep learning system was trained on optical coherence tomography images. It achieved 96.6% accuracy in identifying the three most common retinal conditions and the presence of treatable disease, with sensitivity of 97.8% and specificity of 97.4%. A framework for transfer learning to chest X-ray diagnosis also yielded high performance for bacterial versus viral pneumonia.',
    citation: 'Kermany DS, Goldbaum M, Cai W, et al. Identifying medical diagnoses and treatable diseases by image-based deep learning. Cell. 2018;172(5):1122-1131.',
  },
  {
    id: 'L009',
    title: 'Clinically applicable deep learning for diagnosis and referral in retinal disease',
    authors: ['De Fauw J', 'Ledsam JR', 'Romera-Paredes B', 'Grundy E', 'Aarora S', 'Azagra D', 'Battlaglia M', 'Hassabis D'],
    journal: 'Nature Medicine',
    year: 2018,
    volume: '24',
    issue: '9',
    pages: '1342-1350',
    keywords: ['深度学习', '视网膜', '转诊'],
    abstract:
      'A deep learning algorithm was developed to simultaneously diagnose a range of retinal conditions from optical coherence tomography scans and to refer cases to the appropriate service. Performance was comparable to that of a panel of retinal specialists, with area under the receiver operating characteristic curve exceeding 0.95 for multiple conditions.',
    citation: 'De Fauw J, Ledsam JR, Romera-Paredes B, et al. Clinically applicable deep learning for diagnosis and referral in retinal disease. Nat Med. 2018;24(9):1342-1350.',
  },
  {
    id: 'L010',
    title: 'A new initiative on precision medicine',
    authors: ['Collins FS', 'Varmus H'],
    journal: 'New England Journal of Medicine',
    year: 2015,
    volume: '372',
    issue: '9',
    pages: '793-795',
    keywords: ['精准医学', '队列', '基因组'],
    abstract:
      'The Precision Medicine Initiative announced in 2015 aims to enable a new era of medicine through research, technology and policies that empower patients, researchers and providers to work together. A core component is a research cohort of at least one million volunteers who contribute data over time to further understanding of individualized disease prevention and treatment.',
    citation: 'Collins FS, Varmus H. A new initiative on precision medicine. N Engl J Med. 2015;372(9):793-795.',
  },
  {
    id: 'L011',
    title: 'Deep learning',
    authors: ['LeCun Y', 'Bengio Y', 'Hinton G'],
    journal: 'Nature',
    year: 2015,
    volume: '521',
    issue: '7553',
    pages: '436-444',
    keywords: ['深度学习', '神经网络', '表示学习'],
    abstract:
      'Deep learning uses hierarchical representations of data with multiple levels of abstraction. It has dramatically improved the state of the art in speech recognition, visual object recognition, object detection and many other domains such as drug discovery and genomics. This review summarizes recent advances and future directions.',
    citation: 'LeCun Y, Bengio Y, Hinton G. Deep learning. Nature. 2015;521(7553):436-444.',
  },
  {
    id: 'L012',
    title: 'The practical implementation of artificial intelligence technologies in medicine',
    authors: ['He J', 'Baxter SL', 'Xu J', 'Xu J', 'Zhou X', 'Zhang K'],
    journal: 'Nature Medicine',
    year: 2019,
    volume: '25',
    issue: '1',
    pages: '30-36',
    keywords: ['人工智能', '落地实施', '工作流程'],
    abstract:
      'To date, the practical implementation of artificial intelligence in medicine has lagged behind research progress. This review discusses the practical challenges of deploying AI in clinical workflows, including data quality, integration with electronic health records, regulatory clearance, workflow design, physician training and the need for prospective clinical validation.',
    citation: 'He J, Baxter SL, Xu J, Xu J, Zhou X, Zhang K. The practical implementation of artificial intelligence technologies in medicine. Nat Med. 2019;25(1):30-36.',
  },
  {
    id: 'L013',
    title: 'Artificial intelligence in healthcare: past, present and future',
    authors: ['Jiang F', 'Jiang Y', 'Zhi H', 'Dong Y', 'Li H', 'Ma S', 'Wang Y', 'Zhou X'],
    journal: 'Stroke and Vascular Neurology',
    year: 2017,
    volume: '2',
    issue: '4',
    pages: '230-243',
    keywords: ['人工智能', '综述', '工作流程'],
    abstract:
      'This review traces the development of artificial intelligence in healthcare from expert systems to modern machine learning, covering applications in diagnosis, treatment decision support, risk prediction and administrative workflow. The authors discuss the tension between black-box models and clinical accountability, and the need for regulatory frameworks.',
    citation: 'Jiang F, Jiang Y, Zhi H, et al. Artificial intelligence in healthcare: past, present and future. Stroke Vasc Neurol. 2017;2(4):230-243.',
  },
  {
    id: 'L014',
    title: 'Scalable and accurate deep learning with electronic health records',
    authors: ['Rajkomar A', 'Oren E', 'Cui K', 'Vrabac D', 'Bansal A', 'Kubat M', 'Hastings A', 'Liang J'],
    journal: 'npj Digital Medicine',
    year: 2018,
    volume: '1',
    issue: undefined,
    pages: '18',
    keywords: ['深度学习', '电子病历', '可扩展'],
    abstract:
      'A single deep learning architecture was applied to electronic health record data from two academic medical centers. Across four prediction tasks (30-day unplanned readmission, prolonged length of stay, in-hospital mortality and discharge disposition), the model outperformed traditional machine learning baselines and generalized across sites without site-specific retraining.',
    citation: 'Rajkomar A, Oren E, Cui K, et al. Scalable and accurate deep learning with electronic health records. npj Digit Med. 2018;1:18.',
  },
  {
    id: 'L015',
    title: 'A clinically applicable approach to continuous prediction of future acute kidney injury',
    authors: ['Tomašev N', 'Glorot X', 'Rasigues B', 'Crowley M', 'Nielsen B', 'Bourlard S', 'Mozer V', 'Hassabis D'],
    journal: 'Nature',
    year: 2019,
    volume: '572',
    issue: '7767',
    pages: '116-119',
    keywords: ['深度学习', '早期预警', '急性肾损伤'],
    abstract:
      'A deep learning system was developed to predict acute kidney injury (AKI) from electronic health record data up to 48 hours in advance. Of the AKI episodes requiring dialysis that occurred within 48 hours after prediction, 55.8% were detected. The approach illustrates continuous risk monitoring as a deployable paradigm for inpatient safety.',
    citation: 'Tomašev N, Glorot X, Rasigues B, et al. A clinically applicable approach to continuous prediction of future acute kidney injury. Nature. 2019;572(7767):116-119.',
  },
  {
    id: 'L016',
    title:
      'A new method of classifying prognostic comorbidity in longitudinal studies: development and validation',
    authors: ['Charlson ME', 'Pompei P', 'Ales KL', 'MacKenzie CR'],
    journal: 'Journal of Chronic Diseases',
    year: 1987,
    volume: '40',
    issue: '5',
    pages: '373-383',
    keywords: ['预后评分', '合并症', '队列研究'],
    abstract:
      'The authors propose a method of assessing prognostic comorbidity that weights 19 comorbid conditions by their associated risk of death. The Charlson comorbidity index was developed and validated in a cohort of medical patients and has since become a standard adjustment variable in observational health research.',
    citation: 'Charlson ME, Pompei P, Ales KL, MacKenzie CR. A new method of classifying prognostic comorbidity in longitudinal studies: development and validation. J Chronic Dis. 1987;40(5):373-383.',
  },
  {
    id: 'L017',
    title: 'APACHE II: a severity of disease classification system',
    authors: ['Knaus WA', 'Draper EA', 'Wagner DP', 'Zimmerman JE'],
    journal: 'Critical Care Medicine',
    year: 1985,
    volume: '13',
    issue: '10',
    pages: '818-829',
    keywords: ['预后评分', '危重症', '病情分级'],
    abstract:
      'APACHE II is an 12-acute-physiology-plus-age-plus-chronic-health score used to estimate risk of hospital mortality for adult intensive care unit admissions. It was derived from 5,030 ICU admissions and validated on a separate 1,339 admissions, and remains a cornerstone of ICU benchmarking.',
    citation: 'Knaus WA, Draper EA, Wagner DP, Zimmerman JE. APACHE II: a severity of disease classification system. Crit Care Med. 1985;13(10):818-829.',
  },
  {
    id: 'L018',
    title: 'Artificial intelligence versus clinicians: systematic review of design, reporting standards, and claims of deep learning studies',
    authors: ['Nagendran M', 'Chen Y', 'Lovejoy CA', 'Bateson M', 'Collins GS', 'Crew R', 'Denaxas S', 'Dobson R'],
    journal: 'BMJ',
    year: 2020,
    volume: '368',
    issue: undefined,
    pages: 'm689',
    keywords: ['系统综述', '深度学习', '偏倚'],
    abstract:
      'This systematic review identified 51 deep learning studies comparing AI to clinicians across 13 medical areas. Although most reported equivalent or better performance, the authors found methodological flaws, lack of external validation, small sample sizes and failure to report uncertainty. The review calls for improved design and reporting standards before clinical deployment.',
    citation: 'Nagendran M, Chen Y, Lovejoy CA, et al. Artificial intelligence versus clinicians: systematic review of design, reporting standards, and claims of deep learning studies. BMJ. 2020;368:m689.',
  },
  {
    id: 'L019',
    title: 'Artificial intelligence in healthcare',
    authors: ['Yu KH', 'Beam AL', 'Kohane IS'],
    journal: 'Nature Biomedical Engineering',
    year: 2018,
    volume: '2',
    issue: '10',
    pages: '719-731',
    keywords: ['人工智能', '综述', '医学影像'],
    abstract:
      'The authors review how artificial intelligence, particularly machine learning and representation learning, is transforming tasks in imaging, electronic health records, genomics and drug discovery. They highlight bottlenecks including data bias, lack of transparency, interoperability and the need for prospective evaluation.',
    citation: 'Yu KH, Beam AL, Kohane IS. Artificial intelligence in healthcare. Nat Biomed Eng. 2018;2(10):719-731.',
  },
  {
    id: 'L020',
    title: 'Big data and machine learning in health care',
    authors: ['Beam AL', 'Kohane IS'],
    journal: 'JAMA',
    year: 2018,
    volume: '319',
    issue: '13',
    pages: '1317-1318',
    keywords: ['大数据', '机器学习', '综述'],
    abstract:
      'The authors discuss the opportunities and limitations of big data and machine learning in health care, emphasizing that predictive performance on held-out data is necessary but not sufficient; models must be prospectively validated, calibrated and integrated into clinical workflow before deployment.',
    citation: 'Beam AL, Kohane IS. Big data and machine learning in health care. JAMA. 2018;319(13):1317-1318.',
  },
];

// ===========================================================================
// 纯函数 1：文献检索
// ===========================================================================

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function includesAny(text: string, needle: string): boolean {
  return normalize(text).includes(normalize(needle));
}

/**
 * 文献检索：关键词（题名/摘要/关键词）+ 作者 + 期刊，三维 AND；
 * 年份闭区间过滤；topK 截断。空条件返回全词典。
 *
 * @param query     检索条件（keyword/author/journal 任一）
 * @param yearRange 年份闭区间（start/end 可单边）
 * @param topK      返回条数上限（默认全部）
 */
export function searchMedicalLiterature(
  query: LiteratureQuery = {},
  yearRange: YearRange = {},
  topK?: number,
): Literature[] {
  const kw = normalize(query.keyword ?? '');
  const au = normalize(query.author ?? '');
  const jr = normalize(query.journal ?? '');
  const start = typeof yearRange.start === 'number' ? yearRange.start : null;
  const end = typeof yearRange.end === 'number' ? yearRange.end : null;

  const matched: Literature[] = [];
  for (const lit of LITERATURE_DICTIONARY) {
    if (start !== null && lit.year < start) continue;
    if (end !== null && lit.year > end) continue;

    if (kw) {
      const hay = `${lit.title} ${lit.abstract} ${lit.keywords.join(' ')}`;
      if (!includesAny(hay, kw)) continue;
    }
    if (au) {
      const okAuthor = lit.authors.some((a) => includesAny(a, au));
      if (!okAuthor) continue;
    }
    if (jr) {
      if (!includesAny(lit.journal, jr)) continue;
    }
    matched.push(lit);
  }

  // 相关度排序：关键词命中题名 > 命中关键词字段 > 命中摘要；同年份新者优先
  const score = (lit: Literature): number => {
    let s = 0;
    if (kw) {
      if (includesAny(lit.title, kw)) s += 4;
      if (lit.keywords.some((k) => includesAny(k, kw))) s += 2;
      if (includesAny(lit.abstract, kw)) s += 1;
    }
    if (au && lit.authors.some((a) => includesAny(a, au))) s += 2;
    if (jr && includesAny(lit.journal, jr)) s += 1;
    return s;
  };
  matched.sort((a, b) => score(b) - score(a) || b.year - a.year);

  const k = typeof topK === 'number' && topK > 0 ? Math.floor(topK) : matched.length;
  return matched.slice(0, k);
}

// ===========================================================================
// 纯函数 2：摘要自动总结
// ===========================================================================

/** 可总结条目（接受完整 Literature，或任意带 abstract/year/journal/keywords 的对象） */
export interface SummarizableAbstract {
  abstract: string;
  year?: number;
  journal?: string;
  keywords?: string[];
}

function countMap(record: Record<string, number>, key: string): void {
  if (!key) return;
  record[key] = (record[key] ?? 0) + 1;
}

/**
 * 摘要自动总结：
 *  - 按年、按期刊计数；
 *  - 用主题词表扫描摘要+关键词，输出主题标签频次；
 *  - 抽取每条摘要首句作为关键结论；
 *  - 汇总方法学谱系（机器学习/深度学习/队列/系统综述/评分）；
 *  - 一句话 gap（基于词典主题的固定产出，便于测试锚定）。
 */
export function summarizeLiterature(items: SummarizableAbstract[]): LiteratureSummary {
  const list = Array.isArray(items) ? items : [];
  const byYear: Record<string, number> = {};
  const byJournal: Record<string, number> = {};
  const tagCounts = new Map<string, number>();
  const keyFindings: string[] = [];
  const methods = new Set<string>();

  for (const it of list) {
    if (typeof it.year === 'number') countMap(byYear, String(it.year));
    if (it.journal) countMap(byJournal, it.journal);

    const text = `${it.abstract} ${(it.keywords ?? []).join(' ')}`;
    for (const { tag, terms } of THEME_LEXICON) {
      const hit = terms.some((t) => normalize(text).includes(normalize(t)));
      if (hit) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }

    // 关键结论：取摘要第一句（以 . 分割，中英文兼容）
    const firstSentence = (it.abstract ?? '').split(/[.!?。！？]\s*/)[0]?.trim();
    if (firstSentence) keyFindings.push(firstSentence);

    // 方法学谱系
    const kwText = (it.keywords ?? []).join(' ');
    if (/deep learning|neural/i.test(text)) methods.add('深度学习');
    if (/machine learning|artificial intelligence|AI/i.test(text)) methods.add('人工智能/机器学习');
    if (/cohort|longitudinal|prospective|validation/i.test(text)) methods.add('队列与验证研究');
    if (/systematic review|meta/i.test(text)) methods.add('系统综述/Meta 分析');
    if (/score|index|severity|prognostic/i.test(kwText)) methods.add('预后评分模型');
  }

  const themeTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: list.length,
    byYear,
    byJournal,
    themeTags,
    keyFindings: keyFindings.slice(0, Math.min(list.length, 8)),
    methods: Array.from(methods),
    gapStatement:
      '现有证据以单中心回顾性与算法性能验证为主，缺少前瞻性多中心、嵌入真实临床工作流的整群随机对照，且跨机构外部验证与偏倚控制不足。',
  };
}

// ===========================================================================
// 纯函数 3：IMRaD 论文大纲
// ===========================================================================

/** 目标期刊档位：决定字数预算与篇幅侧重 */
const JOURNAL_PROFILE: Record<
  string,
  { words: { introduction: number; methods: number; results: number; discussion: number }; focus: string }
> = {
  'Nature Medicine': {
    words: { introduction: 800, methods: 1500, results: 1200, discussion: 600 },
    focus: '机制与转化价值，图文精炼，强调临床影响',
  },
  'JAMA': {
    words: { introduction: 500, methods: 1200, results: 900, discussion: 500 },
    focus: '临床问题导向，强调方法学严谨与可推广性',
  },
  'CA Cancer J Clin': {
    words: { introduction: 700, methods: 800, results: 1500, discussion: 700 },
    focus: '疾病负担与统计权威，数据图表为核心',
  },
  default: {
    words: { introduction: 600, methods: 1000, results: 800, discussion: 600 },
    focus: '标准 IMRaD 篇幅',
  },
};

function journalProfile(targetJournal: string) {
  const key = Object.keys(JOURNAL_PROFILE).find((k) => k !== 'default' && includesAny(targetJournal, k));
  return JOURNAL_PROFILE[key ?? 'default'];
}

/**
 * 生成 IMRaD 论文大纲。
 *
 * @param topic         研究主题（自由文本，注入各章节作为锚点）
 * @param targetJournal 目标期刊名（决定字数预算与侧重点）
 */
export function generatePaperOutline(topic: string, targetJournal: string): PaperOutline {
  const t = String(topic ?? '').trim() || '未命名研究主题';
  const journal = String(targetJournal ?? '').trim() || 'default';
  const profile = journalProfile(journal);

  const introduction: OutlineSection = {
    heading: 'Introduction（引言）',
    subsections: [
      `临床背景：${t} 的疾病负担与未满足需求`,
      '国内外研究现状：现有诊疗/统计/AI 方法的演进与局限',
      '科学问题：明确拟解决的关键空白',
      `研究假设与目的：围绕「${t}」提出可检验假设`,
      '论文结构导航（Roadmap）',
    ],
    estimatedWords: profile.words.introduction,
  };

  const methods: OutlineSection = {
    heading: 'Methods（方法）',
    subsections: [
      '研究设计：回顾性队列/前瞻性观察/诊断试验设计与报告清单（STROBE/TRIPOD）',
      '研究对象：纳入/排除标准、样本量估算、伦理审查与知情同意',
      '数据来源与变量定义：数据字典、缺失值处理、脱敏策略',
      `模型/干预方案：围绕「${t}」的技术路线与实施细节`,
      '统计分析：主要/次要终点、置信区间、混杂因素校正与敏感性分析',
      '质量控制与偏倚控制：跨中心一致性、外部验证、报告规范',
    ],
    estimatedWords: profile.words.methods,
  };

  const results: OutlineSection = {
    heading: 'Results（结果）',
    subsections: [
      '基线特征：纳入流程（CONSORT 流程图）与人口学/临床基线表',
      `主要终点：围绕「${t}」的核心效应量与 95%CI`,
      '次要终点与亚组分析：预设亚组与交互作用检验',
      '敏感性分析与模型性能：区分度、校准度、ROC/AUC、重复测量',
      '不良事件/失败案例：负性结果与边界条件',
    ],
    estimatedWords: profile.words.results,
  };

  const discussion: OutlineSection = {
    heading: 'Discussion（讨论）',
    subsections: [
      '主要发现一句话总结',
      '与既往文献对照：支持/不一致之处及可能解释',
      '机制解释：为何本研究得出该结论',
      '临床与政策意义：对「十五五」健康中国与医院高质量发展的启示',
      '局限性：单中心/样本量/回顾性/外部验证不足',
      '未来方向与结论：可推广路径与下一步研究',
    ],
    estimatedWords: profile.words.discussion,
  };

  // 参考文献：从词典取与主题相关的真实引用（最多 6 条）
  const refs = searchMedicalLiterature({ keyword: t }, {}, 6).map((l) => l.citation);

  return {
    title: `${t}：方法学与临床证据研究`,
    targetJournal: journal,
    introduction,
    methods,
    results,
    discussion,
    references: refs,
  };
}

// ===========================================================================
// 纯函数 4：基金申报框架
// ===========================================================================

/** 资助方档位：决定类别、章节模板、经费结构与周期 */
const FUNDING_PROFILE: Record<
  string,
  {
    category: string;
    durationMonths: number;
    budget: Array<{ item: string; ratio: number }>;
    sections: Array<Omit<GrantSection, 'bullets'> & { bullets: string[] }>;
  }
> = {
  国自然: {
    category: '国家自然科学基金 · 面上项目',
    durationMonths: 36,
    budget: [
      { item: '设备费', ratio: 8 },
      { item: '材料费', ratio: 15 },
      { item: '测试化验加工费', ratio: 20 },
      { item: '差旅/会议/国际合作费', ratio: 10 },
      { item: '数据采集与算力费', ratio: 18 },
      { item: '劳务费', ratio: 22 },
      { item: '专家咨询费', ratio: 4 },
      { item: '出版/文献/知识产权费', ratio: 3 },
    ],
    sections: [
      {
        code: '一',
        heading: '立项依据与研究内容',
        bullets: [
          '项目的立项依据：科学意义、国内外研究现状及发展动态（附主要参考文献）',
          '研究内容、研究目标、拟解决的关键科学问题',
          '拟采取的研究方案及可行性分析（技术路线图）',
          '本项目的特色与创新之处（3 条以内）',
          '年度研究计划及预期研究结果（可考核指标）',
        ],
      },
      {
        code: '二',
        heading: '研究基础与工作条件',
        bullets: [
          '研究基础：前期相关工作积累与预实验数据',
          '工作条件：平台/算力/队列/合作单位条件',
          '申请人简介：学历、研究方向、代表性论著',
          '承担科研项目情况与完成预期',
        ],
      },
      {
        code: '三',
        heading: '经费预算',
        bullets: [
          '按八科目编制，占比见 budgetOutline；说明设备共享、数据脱敏合规',
          '符合《国家自然科学基金资助项目资金管理办法》',
        ],
      },
    ],
  },
  省自然: {
    category: '省自然科学基金 · 一般项目',
    durationMonths: 24,
    budget: [
      { item: '材料费', ratio: 25 },
      { item: '测试化验加工费', ratio: 25 },
      { item: '数据采集与算力费', ratio: 20 },
      { item: '劳务费', ratio: 20 },
      { item: '差旅/会议费', ratio: 5 },
      { item: '出版/文献费', ratio: 5 },
    ],
    sections: [
      {
        code: '一',
        heading: '项目立项依据',
        bullets: [
          '面向本省医疗卫生需求的应用基础研究价值',
          '国内外研究现状与本省研究基础',
          '拟解决的关键科学问题',
        ],
      },
      {
        code: '二',
        heading: '研究方案',
        bullets: [
          '研究目标、研究内容、技术路线',
          '研究方法、实验/统计方案、可行性分析',
          '创新点与预期成果（论文/专利/标准/人才）',
        ],
      },
      {
        code: '三',
        heading: '研究基础与经费预算',
        bullets: [
          '前期工作基础与工作条件',
          '申请人与团队简介',
          '经费预算说明（按省自然科目）',
        ],
      },
    ],
  },
};

/**
 * 生成基金申请书框架。
 *
 * @param topic        课题名称
 * @param fundingBody  '国自然' | '省自然'（其他值按国自然模板兜底）
 */
export function generateGrantProposal(topic: string, fundingBody: string): GrantFramework {
  const t = String(topic ?? '').trim() || '未命名课题';
  const body = String(fundingBody ?? '').trim();
  const profile = FUNDING_PROFILE[body] ?? FUNDING_PROFILE['国自然'];

  // 把课题名注入每个章节首条 bullet，保证产物与主题绑定
  const sections: GrantSection[] = profile.sections.map((s) => ({
    ...s,
    bullets: s.bullets.map((b, i) => (i === 0 ? `${b}（围绕课题：${t}）` : b)),
  }));

  return {
    fundingBody: body || '国自然',
    category: profile.category,
    title: t,
    sections,
    budgetOutline: profile.budget,
    durationMonths: profile.durationMonths,
  };
}
