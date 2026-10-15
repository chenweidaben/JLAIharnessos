/**
 * 健澜科技 jlmedaios - 【集团与科研】医学科研智能化助手页（M156-C）
 *
 * 病例智能检索（疾病+时间/年龄性别/检查检验/治疗预后）→
 * 自动统计分析（描述性统计 / Welch t 检验 / 卡方 / Kaplan-Meier）→
 * 统计表格可视化。仅用于科研分析，不构成诊疗建议。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Layout,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { ExperimentOutlined, SearchOutlined, BarChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { RangePicker } = DatePicker;

interface CaseRow {
  caseId: string;
  patientId: string;
  gender: 'M' | 'F';
  age: number;
  diagnoses: string[];
  admissionDate: string;
  treatments: string[];
  prognosis: string;
}

interface StatTable {
  title: string;
  headers: string[];
  rows: (string | number | null)[][];
}

interface StatsResult {
  summary: string;
  tTest: { t: number; df: number; p: number; significant: boolean } | null;
  chiSquare: { chi2: number; df: number; p: number; significant: boolean } | null;
  survival: { group: string; km: { medianSurvival: number | null } }[];
  tables: StatTable[];
}

const watermarkText = ['健澜科技', '医学科研智能化', 'jlmedaios'];

export default function ResearchAiAssistantPage() {
  const [disease, setDisease] = useState('肺腺癌');
  const [gender, setGender] = useState<'M' | 'F' | 'ALL'>('ALL');
  const [ageMin, setAgeMin] = useState<number | null>(null);
  const [ageMax, setAgeMax] = useState<number | null>(null);
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [treatment, setTreatment] = useState('');
  const [prognosis, setPrognosis] = useState('');
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [searching, setSearching] = useState(false);

  const [groupA, setGroupA] = useState('6.2, 5.8, 7.1, 6.5, 5.9');
  const [groupB, setGroupB] = useState('5.1, 4.9, 5.5, 5.0, 4.8');
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const onSearch = async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (disease) params.set('disease', disease);
      if (gender !== 'ALL') params.set('gender', gender);
      if (ageMin !== null) params.set('ageMin', String(ageMin));
      if (ageMax !== null) params.set('ageMax', String(ageMax));
      if (range?.[0]) params.set('startDate', range[0].format('YYYY-MM-DD'));
      if (range?.[1]) params.set('endDate', range[1].format('YYYY-MM-DD'));
      if (treatment) params.set('treatment', treatment);
      if (prognosis) params.set('prognosis', prognosis);
      const resp = await fetch(`/api/v1/research/smart-search?${params.toString()}`);
      const json = await resp.json();
      setCases(json?.data?.cases ?? []);
    } finally {
      setSearching(false);
    }
  };

  const parseGroup = (text: string): number[] =>
    text.split(/[,，\s]+/).map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));

  const onAnalyze = async () => {
    setAnalyzing(true);
    try {
      const resp = await fetch('/api/v1/research/auto-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groups: [
            { name: 'A组', values: parseGroup(groupA) },
            { name: 'B组', values: parseGroup(groupB) },
          ],
        }),
      });
      const json = await resp.json();
      setStats(json?.data ?? null);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center gap-3 bg-jl-primary px-6 shadow-card">
          <ExperimentOutlined className="text-2xl text-white" />
          <Typography.Title level={4} className="!mb-0 !text-white">
            医学科研智能化助手 · 病例检索-自动统计-报告
          </Typography.Title>
          <Tag color="cyan" className="ml-2">集团与科研</Tag>
        </Header>
        <Content className="p-4">
          <Tabs
            items={[
              {
                key: 'search',
                label: (
                  <span><SearchOutlined /> 病例智能检索</span>
                ),
                children: (
                  <Card title="检索条件（多条件 AND 收敛）" className="shadow-card">
                    <Form layout="inline" className="mb-4">
                      <Form.Item label="疾病">
                        <Input value={disease} onChange={(e) => setDisease(e.target.value)} placeholder="如 肺腺癌" style={{ width: 140 }} />
                      </Form.Item>
                      <Form.Item label="性别">
                        <Select value={gender} onChange={setGender} style={{ width: 90 }}
                          options={[
                            { value: 'ALL', label: '不限' },
                            { value: 'M', label: '男' },
                            { value: 'F', label: '女' },
                          ]} />
                      </Form.Item>
                      <Form.Item label="年龄">
                        <Space.Compact>
                          <InputNumber value={ageMin} onChange={setAgeMin} placeholder="min" style={{ width: 70 }} />
                          <InputNumber value={ageMax} onChange={setAgeMax} placeholder="max" style={{ width: 70 }} />
                        </Space.Compact>
                      </Form.Item>
                      <Form.Item label="入院时间">
                        <RangePicker value={range} onChange={(v) => setRange(v as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} />
                      </Form.Item>
                      <Form.Item label="治疗方案">
                        <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="如 靶向治疗" style={{ width: 130 }} />
                      </Form.Item>
                      <Form.Item label="预后">
                        <Input value={prognosis} onChange={(e) => setPrognosis(e.target.value)} placeholder="如 好转" style={{ width: 110 }} />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" icon={<SearchOutlined />} loading={searching} onClick={onSearch}>
                          智能检索
                        </Button>
                      </Form.Item>
                    </Form>
                    <Table
                      rowKey="caseId"
                      size="small"
                      dataSource={cases}
                      pagination={false}
                      columns={[
                        { title: '病例号', dataIndex: 'caseId' },
                        { title: '性别', dataIndex: 'gender', render: (g: string) => (g === 'M' ? '男' : '女') },
                        { title: '年龄', dataIndex: 'age' },
                        { title: '诊断', dataIndex: 'diagnoses', render: (d: string[]) => d.join('、') },
                        { title: '入院日期', dataIndex: 'admissionDate' },
                        { title: '治疗', dataIndex: 'treatments', render: (t: string[]) => t.join('、') },
                        { title: '预后', dataIndex: 'prognosis' },
                      ]}
                    />
                  </Card>
                ),
              },
              {
                key: 'stats',
                label: (
                  <span><BarChartOutlined /> 自动统计分析</span>
                ),
                children: (
                  <Card title="录入两组连续变量（逗号分隔），自动完成 Welch t 检验与描述统计" className="shadow-card">
                    <Form layout="inline" className="mb-4">
                      <Form.Item label="A组数值">
                        <Input value={groupA} onChange={(e) => setGroupA(e.target.value)} style={{ width: 260 }} />
                      </Form.Item>
                      <Form.Item label="B组数值">
                        <Input value={groupB} onChange={(e) => setGroupB(e.target.value)} style={{ width: 260 }} />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" loading={analyzing} onClick={onAnalyze}>
                          开始统计
                        </Button>
                      </Form.Item>
                    </Form>
                    {stats && (
                      <>
                        <Typography.Paragraph type="secondary">
                          结论：{stats.summary}
                        </Typography.Paragraph>
                        {stats.tables.map((t) => (
                          <Table
                            key={t.title}
                            size="small"
                            title={() => t.title}
                            className="mb-4"
                            rowKey={(_, i) => String(i)}
                            pagination={false}
                            dataSource={t.rows}
                            columns={t.headers.map((h, j) => ({
                              title: h,
                              render: (_: unknown, row: (string | number | null)[]) => row[j] ?? '—',
                            }))}
                          />
                        ))}
                      </>
                    )}
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
