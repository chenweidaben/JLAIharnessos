/**
 * 健澜科技 jlmedaios - 【集团与科研】科研智能化深化：科研文献页（M159-C）
 *
 * 中期路线图：从「病例检索-自动统计」向「文献洞察-论文撰写-基金申报」延伸。
 * 四标签页：
 *  1. 文献检索：关键词/作者/期刊 + 年份区间 + topK，结果列表展示引用；
 *  2. 摘要总结：对检索结果自动汇总（年/刊分布、主题标签、关键结论、gap）；
 *  3. 论文大纲：IMRaD 结构（Introduction/Methods/Results/Discussion）；
 *  4. 基金框架：国自然/省自然申请书章节与经费预算。
 *
 * 深海蓝 VI：bg-jl-primary 顶栏 / bg-ink-bg 底 / shadow-card 卡片。
 * 仅用于科研分析，不构成诊疗建议。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { BookOutlined, FileTextOutlined, FundOutlined, SearchOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;

interface LiteratureRow {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  keywords: string[];
  abstract: string;
  citation: string;
}

interface SummaryResult {
  total: number;
  byYear: Record<string, number>;
  byJournal: Record<string, number>;
  themeTags: Array<{ tag: string; count: number }>;
  keyFindings: string[];
  methods: string[];
  gapStatement: string;
}

interface OutlineSection {
  heading: string;
  subsections: string[];
  estimatedWords: number;
}

interface OutlineResult {
  title: string;
  targetJournal: string;
  introduction: OutlineSection;
  methods: OutlineSection;
  results: OutlineSection;
  discussion: OutlineSection;
  references: string[];
}

interface GrantResult {
  fundingBody: string;
  category: string;
  title: string;
  sections: Array<{ code: string; heading: string; bullets: string[] }>;
  budgetOutline: Array<{ item: string; ratio: number }>;
  durationMonths: number;
}

const watermarkText = ['健澜科技', '科研文献与论文', 'jlmedaios'];

export default function ResearchLiteraturePage() {
  // 检索表单
  const [keyword, setKeyword] = useState('deep learning');
  const [author, setAuthor] = useState('');
  const [journal, setJournal] = useState('');
  const [yearStart, setYearStart] = useState<number | null>(null);
  const [yearEnd, setYearEnd] = useState<number | null>(null);
  const [topK, setTopK] = useState<number | null>(10);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<LiteratureRow[]>([]);

  // 总结
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // 大纲
  const [topic, setTopic] = useState('人工智能辅助乳腺癌筛查的临床效用研究');
  const [targetJournal, setTargetJournal] = useState('Nature Medicine');
  const [outline, setOutline] = useState<OutlineResult | null>(null);
  const [outlining, setOutlining] = useState(false);

  // 基金
  const [grantTopic, setGrantTopic] = useState('基于深度学习的住院急性肾损伤早期预警模型研究');
  const [fundingBody, setFundingBody] = useState<'国自然' | '省自然'>('国自然');
  const [grant, setGrant] = useState<GrantResult | null>(null);
  const [granting, setGranting] = useState(false);

  const onSearch = async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (author) params.set('author', author);
      if (journal) params.set('journal', journal);
      if (yearStart !== null) params.set('yearStart', String(yearStart));
      if (yearEnd !== null) params.set('yearEnd', String(yearEnd));
      if (topK !== null) params.set('topK', String(topK));
      const resp = await fetch(`/api/v1/research/literature/search?${params.toString()}`);
      const json = await resp.json();
      const rows: LiteratureRow[] = json?.data?.results ?? [];
      setResults(rows);
      setSummary(null);
    } finally {
      setSearching(false);
    }
  };

  const onSummarize = async () => {
    if (results.length === 0) return;
    setSummarizing(true);
    try {
      const resp = await fetch('/api/v1/research/literature/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: results.map((r) => ({
            abstract: r.abstract,
            year: r.year,
            journal: r.journal,
            keywords: r.keywords,
          })),
        }),
      });
      const json = await resp.json();
      setSummary(json?.data ?? null);
    } finally {
      setSummarizing(false);
    }
  };

  const onOutline = async () => {
    setOutlining(true);
    try {
      const resp = await fetch('/api/v1/research/paper/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, targetJournal }),
      });
      const json = await resp.json();
      setOutline(json?.data ?? null);
    } finally {
      setOutlining(false);
    }
  };

  const onGrant = async () => {
    setGranting(true);
    try {
      const resp = await fetch('/api/v1/research/grant/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: grantTopic, fundingBody }),
      });
      const json = await resp.json();
      setGrant(json?.data ?? null);
    } finally {
      setGranting(false);
    }
  };

  const resultColumns = [
    {
      title: '题名',
      dataIndex: 'title',
      key: 'title',
      render: (_: string, row: LiteratureRow) => (
        <div>
          <Typography.Link>{row.title}</Typography.Link>
          <div className="mt-1">
            {row.keywords.map((k) => (
              <Tag key={k} color="blue" className="mr-1">
                {k}
              </Tag>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: '作者',
      dataIndex: 'authors',
      key: 'authors',
      width: 220,
      render: (authors: string[]) => authors.slice(0, 3).join(', ') + (authors.length > 3 ? ', et al.' : ''),
    },
    {
      title: '期刊 · 年',
      dataIndex: 'journal',
      key: 'journal',
      width: 220,
      render: (_: string, row: LiteratureRow) => (
        <div>
          <div>{row.journal}</div>
          <Typography.Text type="secondary" className="text-xs">
            {row.year};{row.volume}({row.issue ?? '0'}):{row.pages}
          </Typography.Text>
        </div>
      ),
    },
  ];

  const renderOutlineSection = (section: OutlineSection) => (
    <Card
      size="small"
      title={
        <Space>
          <span>{section.heading}</span>
          <Tag color="cyan">约 {section.estimatedWords} 词</Tag>
        </Space>
      }
      className="mb-3"
    >
      <List
        size="small"
        dataSource={section.subsections}
        renderItem={(item) => <List.Item>· {item}</List.Item>}
      />
    </Card>
  );

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center gap-3 bg-jl-primary px-6 shadow-card">
          <BookOutlined className="text-2xl text-white" />
          <Typography.Title level={4} className="!mb-0 !text-white">
            科研文献与论文 · 检索-总结-IMRaD 大纲-基金框架
          </Typography.Title>
          <Tag color="cyan" className="ml-2">
            集团与科研 · M159-C
          </Tag>
        </Header>
        <Content className="p-4">
          <Tabs
            items={[
              {
                key: 'search',
                label: (
                  <span>
                    <SearchOutlined /> 文献检索
                  </span>
                ),
                children: (
                  <Card title="检索条件（关键词/作者/期刊 三维 AND + 年份区间）" className="shadow-card mb-3">
                    <Form layout="inline" className="mb-4">
                      <Form.Item label="关键词">
                        <Input
                          value={keyword}
                          onChange={(e) => setKeyword(e.target.value)}
                          placeholder="如 deep learning / 糖尿病视网膜病变"
                          style={{ width: 220 }}
                          allowClear
                        />
                      </Form.Item>
                      <Form.Item label="作者">
                        <Input
                          value={author}
                          onChange={(e) => setAuthor(e.target.value)}
                          placeholder="如 Topol"
                          style={{ width: 140 }}
                          allowClear
                        />
                      </Form.Item>
                      <Form.Item label="期刊">
                        <Input
                          value={journal}
                          onChange={(e) => setJournal(e.target.value)}
                          placeholder="如 Nature Medicine"
                          style={{ width: 180 }}
                          allowClear
                        />
                      </Form.Item>
                      <Form.Item label="年份">
                        <Space.Compact>
                          <InputNumber
                            value={yearStart}
                            onChange={(v) => setYearStart(v)}
                            placeholder="起"
                            style={{ width: 90 }}
                            min={1900}
                            max={2100}
                          />
                          <InputNumber
                            value={yearEnd}
                            onChange={(v) => setYearEnd(v)}
                            placeholder="止"
                            style={{ width: 90 }}
                            min={1900}
                            max={2100}
                          />
                        </Space.Compact>
                      </Form.Item>
                      <Form.Item label="TopK">
                        <InputNumber
                          value={topK}
                          onChange={(v) => setTopK(v)}
                          min={1}
                          max={50}
                          style={{ width: 80 }}
                        />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" loading={searching} onClick={() => void onSearch()}>
                          检索
                        </Button>
                        <Button
                          className="ml-2"
                          loading={summarizing}
                          disabled={results.length === 0}
                          onClick={() => void onSummarize()}
                        >
                          自动总结摘要
                        </Button>
                      </Form.Item>
                    </Form>

                    <Table
                      rowKey="id"
                      size="small"
                      loading={searching}
                      columns={resultColumns}
                      dataSource={results}
                      pagination={false}
                      expandable={{
                        expandedRowRender: (row) => (
                          <div>
                            <Typography.Paragraph type="secondary" className="mb-1">
                              {row.abstract}
                            </Typography.Paragraph>
                            <Typography.Text code>{row.citation}</Typography.Text>
                          </div>
                        ),
                      }}
                    />

                    {summary && (
                      <Card title="摘要自动总结" size="small" className="mt-4" bordered>
                        <Typography.Paragraph>
                          共纳入 <b>{summary.total}</b> 篇；方法学谱系：
                          {summary.methods.map((m) => (
                            <Tag key={m} color="geekblue" className="ml-1">
                              {m}
                            </Tag>
                          ))}
                        </Typography.Paragraph>
                        <div className="mb-2">
                          主题标签：
                          {summary.themeTags.map((t) => (
                            <Tag key={t.tag} color="blue" className="ml-1">
                              {t.tag} × {t.count}
                            </Tag>
                          ))}
                        </div>
                        <Typography.Paragraph>
                          <b>研究空白：</b>
                          {summary.gapStatement}
                        </Typography.Paragraph>
                      </Card>
                    )}
                  </Card>
                ),
              },
              {
                key: 'outline',
                label: (
                  <span>
                    <FileTextOutlined /> IMRaD 论文大纲
                  </span>
                ),
                children: (
                  <Card title="输入主题与目标期刊，生成 IMRaD 结构大纲" className="shadow-card">
                    <Form layout="inline" className="mb-4">
                      <Form.Item label="研究主题">
                        <Input
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          style={{ width: 360 }}
                        />
                      </Form.Item>
                      <Form.Item label="目标期刊">
                        <Select
                          value={targetJournal}
                          onChange={setTargetJournal}
                          style={{ width: 200 }}
                          options={[
                            { value: 'Nature Medicine', label: 'Nature Medicine' },
                            { value: 'JAMA', label: 'JAMA' },
                            { value: 'CA Cancer J Clin', label: 'CA Cancer J Clin' },
                            { value: '其他期刊', label: '其他期刊（默认篇幅）' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" loading={outlining} onClick={() => void onOutline()}>
                          生成大纲
                        </Button>
                      </Form.Item>
                    </Form>
                    <Spin spinning={outlining}>
                      {outline && (
                        <div>
                          <Typography.Title level={5}>{outline.title}</Typography.Title>
                          <Col span={24}>
                            {renderOutlineSection(outline.introduction)}
                            {renderOutlineSection(outline.methods)}
                            {renderOutlineSection(outline.results)}
                            {renderOutlineSection(outline.discussion)}
                          </Col>
                          <Card size="small" title="参考文献（来自真实文献词典）" bordered>
                            <List
                              size="small"
                              dataSource={outline.references}
                              renderItem={(r, idx) => <List.Item>[{idx + 1}] {r}</List.Item>}
                            />
                          </Card>
                        </div>
                      )}
                    </Spin>
                  </Card>
                ),
              },
              {
                key: 'grant',
                label: (
                  <span>
                    <FundOutlined /> 基金框架
                  </span>
                ),
                children: (
                  <Card title="国自然 / 省自然 申请书框架" className="shadow-card">
                    <Form layout="inline" className="mb-4">
                      <Form.Item label="课题名称">
                        <Input
                          value={grantTopic}
                          onChange={(e) => setGrantTopic(e.target.value)}
                          style={{ width: 400 }}
                        />
                      </Form.Item>
                      <Form.Item label="资助方">
                        <Select
                          value={fundingBody}
                          onChange={setFundingBody}
                          style={{ width: 140 }}
                          options={[
                            { value: '国自然', label: '国家自然科学基金' },
                            { value: '省自然', label: '省自然科学基金' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" loading={granting} onClick={() => void onGrant()}>
                          生成框架
                        </Button>
                      </Form.Item>
                    </Form>
                    <Spin spinning={granting}>
                      {grant && (
                        <div>
                          <Typography.Title level={5}>
                            {grant.category} · {grant.title}
                          </Typography.Title>
                          <Typography.Paragraph type="secondary">
                            执行周期：{grant.durationMonths} 个月
                          </Typography.Paragraph>
                          {grant.sections.map((s) => (
                            <Card size="small" key={s.code} title={`${s.code}、${s.heading}`} className="mb-2" bordered>
                              <List
                                size="small"
                                dataSource={s.bullets}
                                renderItem={(b) => <List.Item>· {b}</List.Item>}
                              />
                            </Card>
                          ))}
                          <Card size="small" title="经费预算占比" bordered>
                            <List
                              size="small"
                              dataSource={grant.budgetOutline}
                              renderItem={(b) => (
                                <List.Item>
                                  {b.item}：{b.ratio}%
                                </List.Item>
                              )}
                            />
                          </Card>
                        </div>
                      )}
                    </Spin>
                  </Card>
                ),
              },
            ]}
          />
        </Content>
      </Layout>
    </Watermark>
  );
}
