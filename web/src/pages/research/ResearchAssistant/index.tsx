/**
 * 健澜科技 jlmedaios - M166-C【绩效与人才】AI 辅助科研助手页
 *
 * 【医院全场景】AI 科研要真实，不能编造文献：
 *  - 文献检索：关键词主题在真实文献词典中检索（题名/摘要/关键词）；
 *  - 摘要总结：自动提取每篇摘要首句要点，不归纳、不外推；
 *  - 研究趋势：逐年分布 + 热点关键词 + 早/中/近期热点演变；
 *  - 方法对比：按关键词自动归类方法学，输出优劣势口径；
 *  - 可选装配：研究问题+方法 → 实验设计 + 统计方案；实测结果 → 论文初稿。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading / error（可重试）/ empty；
 *  - 真实性声明常驻：内置真实词典仅作离线锚点，正式使用接 PubMed/CNKI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Layout,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

type MethodTag =
  | 'ai_deep_learning'
  | 'cohort_prognosis'
  | 'epidemiology'
  | 'systematic_review'
  | 'other';

interface MatchedPaper {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  keywords: string[];
  methodTag: MethodTag;
  keyPoint: string;
  citation: string;
}

interface MethodComparison {
  method: MethodTag;
  methodLabel: string;
  count: number;
  paperIds: string[];
  strengths: string;
  weaknesses: string;
}

interface LiteratureReview {
  topic: string;
  totalMatched: number;
  papers: MatchedPaper[];
  keyPoints: string[];
  trend: {
    byYear: Array<{ year: number; count: number }>;
    hotKeywords: Array<{ tag: string; count: number }>;
    evolution: Array<{ band: string; topTags: Array<{ tag: string; count: number }> }>;
  };
  methodComparison: MethodComparison[];
  sourceDisclaimer: string;
}

interface ExperimentDesign {
  designLabel: string;
  hypothesis: string;
  arms: Array<{ name: string; description: string }>;
  primaryEndpoint: string;
  secondaryEndpoints: string[];
  inclusion: string[];
  exclusion: string[];
  sampleSizeHint: string;
  ethics: string[];
  reportingStandard: string;
}

interface StatisticalPlan {
  alpha: number;
  power: number;
  primaryAnalysis: string;
  tests: Array<{ purpose: string; test: string; rationale: string }>;
  multiplicity: string;
  missingData: string;
  sensitivityAnalysis: string[];
  reportingStandard: string;
}

interface PaperDraft {
  title: string;
  structuredAbstract: { background: string; objective: string; methods: string; results: string; conclusion: string };
  introduction: string[];
  resultsNarrative: string[];
  discussion: string[];
  conclusion: string;
  references: string[];
  disclaimer: string;
}

interface ReviewPayload {
  review: LiteratureReview;
  experiment?: ExperimentDesign;
  statisticalPlan?: StatisticalPlan;
  paperDraft?: PaperDraft;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
  grid: '#e6ebf2',
};

const METHOD_LABEL: Record<MethodTag, { label: string; color: string }> = {
  ai_deep_learning: { label: '深度学习/AI', color: 'geekblue' },
  cohort_prognosis: { label: '队列/预后', color: 'blue' },
  epidemiology: { label: '疾病负担', color: 'cyan' },
  systematic_review: { label: '系统综述', color: 'purple' },
  other: { label: '其他', color: 'default' },
};

const METHOD_OPTIONS = [
  { value: 'randomized-trial', label: '随机对照试验（RCT）' },
  { value: 'prospective-cohort', label: '前瞻性队列' },
  { value: 'retrospective-cohort', label: '回顾性队列' },
  { value: 'case-control', label: '病例对照' },
  { value: 'diagnostic-accuracy', label: '诊断准确性研究' },
];

/* --------------------------------- 组件 --------------------------------- */

export default function ResearchAssistantPage() {
  const [topic, setTopic] = useState('深度学习');
  const [yearStart, setYearStart] = useState<number | null>(2015);
  const [yearEnd, setYearEnd] = useState<number | null>(2025);
  const [topK, setTopK] = useState<number>(10);
  const [problem, setProblem] = useState('');
  const [method, setMethod] = useState<string | undefined>(undefined);

  const [data, setData] = useState<ReviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        topic,
        yearStart: yearStart ?? undefined,
        yearEnd: yearEnd ?? undefined,
        topK,
      };
      if (problem.trim()) body.problem = problem.trim();
      if (method) body.method = method;

      const resp = await fetch('/api/v1/research/literature-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '文献综述生成失败');
        return;
      }
      setData(json.data as ReviewPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, [topic, yearStart, yearEnd, topK, problem, method]);

  const paperColumns: ColumnsType<MatchedPaper> = [
    {
      title: '题名 / 期刊',
      dataIndex: 'title',
      render: (_: string, r) => (
        <div>
          <div style={{ fontWeight: 600, color: VI.deep }}>{r.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.journal} · {r.year}</Text>
        </div>
      ),
    },
    {
      title: '作者',
      dataIndex: 'authors',
      width: 180,
      render: (a: string[]) => <Text style={{ fontSize: 12 }}>{a.slice(0, 3).join(', ')}{a.length > 3 ? ' …' : ''}</Text>,
    },
    {
      title: '方法学',
      dataIndex: 'methodTag',
      width: 120,
      render: (t: MethodTag) => <Tag color={METHOD_LABEL[t].color}>{METHOD_LABEL[t].label}</Tag>,
    },
    {
      title: '自动要点（摘要首句）',
      dataIndex: 'keyPoint',
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
  ];

  const maxYearCount = data ? Math.max(1, ...data.review.trend.byYear.map((x) => x.count)) : 1;

  return (
    <Layout style={{ background: VI.bg, minHeight: '100vh' }}>
      <Content style={{ padding: 16 }}>
        <Card
          style={{ marginBottom: 16, borderTop: `3px solid ${VI.accent}` }}
          styles={{ header: { background: VI.deep, color: '#fff' } }}
          title="AI 辅助科研助手 · 文献综述 / 实验设计 / 统计方案 / 论文初稿（M166-C）"
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="AI 科研要真实：文献全部来自内置真实发表论文词典（不含编造 DOI），仅作离线锚点；正式使用须接 PubMed/CNKI 并人工复核。论文结果段只复述您传入的实测数字，系统不预造。"
          />
          <Form layout="inline">
            <Form.Item label="主题关键词">
              <Input
                style={{ width: 220 }}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="如：深度学习 / 乳腺癌筛查"
                allowClear
              />
            </Form.Item>
            <Form.Item label="年份">
              <Space.Compact>
                <InputNumber min={1900} max={2100} value={yearStart} onChange={(v) => setYearStart(v)} style={{ width: 90 }} />
                <InputNumber min={1900} max={2100} value={yearEnd} onChange={(v) => setYearEnd(v)} style={{ width: 90 }} />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="TopK">
              <InputNumber min={1} max={50} value={topK} onChange={(v) => setTopK(v ?? 10)} style={{ width: 80 }} />
            </Form.Item>
            <Form.Item label="研究问题(可选)">
              <Input
                style={{ width: 240 }}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="如：急性肾损伤早期预警模型"
                allowClear
              />
            </Form.Item>
            <Form.Item label="实验方法(可选)">
              <Select
                style={{ width: 200 }}
                value={method}
                onChange={(v) => setMethod(v)}
                options={METHOD_OPTIONS}
                placeholder="选择方法学"
                allowClear
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={() => void run()}>
                生成文献综述
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {error && <Alert type="error" showIcon style={{ marginBottom: 12 }} message={error} action={<Button size="small" onClick={() => void run()}>重试</Button>} />}
        <Spin spinning={loading}>
          {!data ? (
            <Alert type="warning" showIcon message="输入主题后点击「生成文献综述」；结果将在下方逐区展示。" />
          ) : (
            <>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card><Statistic title="命中文献（截断前）" value={data.review.totalMatched} /></Card></Col>
                <Col span={6}><Card><Statistic title="纳入综述" value={data.review.papers.length} /></Card></Col>
                <Col span={6}><Card><Statistic title="方法学分组" value={data.review.methodComparison.length} /></Card></Col>
                <Col span={6}><Card><Statistic title="热点关键词" value={data.review.trend.hotKeywords.length} /></Card></Col>
              </Row>

              <Card title="一、文献列表（真实词典）" style={{ marginBottom: 16 }} size="small">
                <Table rowKey="id" columns={paperColumns} dataSource={data.review.papers} pagination={false} size="small" />
              </Card>

              <Card title="二、摘要总结 · 自动要点" style={{ marginBottom: 16 }} size="small">
                {data.review.keyPoints.map((kp, i) => (
                  <Paragraph key={i} style={{ marginBottom: 4 }}>· {kp}</Paragraph>
                ))}
              </Card>

              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Card title="三、研究趋势 · 逐年分布" size="small">
                    {data.review.trend.byYear.map((x) => (
                      <div key={x.year} style={{ marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, marginRight: 8 }}>{x.year}</Text>
                        <div style={{ background: VI.grid, borderRadius: 4, height: 14, width: '80%', display: 'inline-block', verticalAlign: 'middle' }}>
                          <div style={{ width: `${(x.count / maxYearCount) * 100}%`, background: VI.accent, height: '100%' }} />
                        </div>
                        <Text style={{ fontSize: 12, marginLeft: 8 }}>{x.count}</Text>
                      </div>
                    ))}
                    <div style={{ marginTop: 12 }}>
                      {data.review.trend.hotKeywords.map((k) => (
                        <Tag key={k.tag} color="blue" style={{ marginBottom: 4 }}>{k.tag} ×{k.count}</Tag>
                      ))}
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="四、热点演变（早/中/近期）" size="small">
                    {data.review.trend.evolution.map((b) => (
                      <div key={b.band} style={{ marginBottom: 8 }}>
                        <Text strong style={{ color: VI.deep, fontSize: 13 }}>{b.band}</Text>
                        <div>
                          {b.topTags.map((t) => <Tag key={t.tag} style={{ marginTop: 4 }}>{t.tag} ×{t.count}</Tag>)}
                        </div>
                      </div>
                    ))}
                  </Card>
                </Col>
              </Row>

              <Card title="五、方法对比" style={{ marginBottom: 16 }} size="small">
                <Table
                  rowKey="method"
                  size="small"
                  pagination={false}
                  dataSource={data.review.methodComparison}
                  columns={[
                    { title: '方法学', dataIndex: 'methodLabel', width: 140 },
                    { title: '篇数', dataIndex: 'count', width: 80 },
                    { title: '优势', dataIndex: 'strengths', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                    { title: '局限', dataIndex: 'weaknesses', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                  ]}
                />
              </Card>

              {data.experiment && data.statisticalPlan && (
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Card title={`六、实验设计 · ${data.experiment.designLabel}`} size="small">
                      <Paragraph style={{ fontSize: 13 }}><Text strong>假设：</Text>{data.experiment.hypothesis}</Paragraph>
                      <Paragraph style={{ fontSize: 13 }}><Text strong>分组：</Text>{data.experiment.arms.map((a) => `${a.name}（${a.description}）`).join('；')}</Paragraph>
                      <Paragraph style={{ fontSize: 13 }}><Text strong>主要终点：</Text>{data.experiment.primaryEndpoint}</Paragraph>
                      <Paragraph style={{ fontSize: 13 }}><Text strong>样本量提示：</Text>{data.experiment.sampleSizeHint}</Paragraph>
                      <Paragraph style={{ fontSize: 13 }}><Text strong>报告标准：</Text><Tag color="geekblue">{data.experiment.reportingStandard}</Tag></Paragraph>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title={`七、统计方案（α=${data.statisticalPlan.alpha}，power=${data.statisticalPlan.power}）`} size="small">
                      <Paragraph style={{ fontSize: 13 }}><Text strong>主分析：</Text>{data.statisticalPlan.primaryAnalysis}</Paragraph>
                      {data.statisticalPlan.tests.map((t, i) => (
                        <Paragraph key={i} style={{ fontSize: 12 }}>· {t.purpose}：<Text code>{t.test}</Text> — {t.rationale}</Paragraph>
                      ))}
                      <Paragraph style={{ fontSize: 12 }}><Text strong>多重性：</Text>{data.statisticalPlan.multiplicity}</Paragraph>
                    </Card>
                  </Col>
                </Row>
              )}

              {data.paperDraft && (
                <Card title={`八、论文初稿骨架 · ${data.paperDraft.title}`} size="small">
                  <Paragraph style={{ fontSize: 13 }}><Text strong>摘要-背景：</Text>{data.paperDraft.structuredAbstract.background}</Paragraph>
                  <Paragraph style={{ fontSize: 13 }}><Text strong>摘要-方法：</Text>{data.paperDraft.structuredAbstract.methods}</Paragraph>
                  <Paragraph style={{ fontSize: 13 }}><Text strong>摘要-结果：</Text>{data.paperDraft.structuredAbstract.results}</Paragraph>
                  <Paragraph style={{ fontSize: 12, color: '#CF1322' }}>{data.paperDraft.disclaimer}</Paragraph>
                </Card>
              )}
            </>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
