/**
 * 健澜科技 jlmedaios - M177-A 【病案设备耗材】医院病案管理深化页（仅 admin/病案室）
 *
 * 病案编码要 ICD 标准，不能自创：
 *  - 诊断 ICD-10（I50.9 心力衰竭 / J18.9 肺炎），手术 ICD-9-CM-3（47.09 阑尾切除 / 81.54 全膝置换）；
 *  - 归档：出院后 3 个工作日内归档，超期即预警；
 *  - 质控：首页合格率 / 编码准确率 / 缺项率三项按期统计；
 *  - 借阅：登记 + 归还跟踪 + 保密等级（内部/机密/绝密），超期未还单列。
 *
 * 三态：loading / error（可重试）/ empty（暂无病案）。视觉：深海蓝 VI。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Input, Layout, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF medicalRecordDeep 输出对齐的类型 ---------------- */

interface CodingIssue {
  code: string;
  kind: 'diagnosis' | 'surgery';
  name?: string;
  valid: boolean;
  reasons: string[];
}
interface CodingView {
  valid: boolean;
  issues: CodingIssue[];
  totalDiagnoses: number;
  validDiagnoses: number;
  totalSurgeries: number;
  validSurgeries: number;
  codingAccuracy: number;
}
interface CompletionView {
  complete: boolean;
  completionRate: number;
  missingItems: string[];
  filledItems: number;
  totalRequiredItems: number;
}
interface ArchiveView {
  archived: boolean;
  onTime: boolean;
  daysToDeadline: number;
}
interface RecordView {
  recordId: string;
  visitId: string;
  department: string;
  coding: CodingView;
  completion: CompletionView;
  archive: ArchiveView;
  borrowOverdue: boolean;
  confidentiality: 'internal' | 'confidential' | 'secret';
  frontPagePass: boolean;
}
interface QualityReport {
  period: string;
  totalRecords: number;
  frontPagePassRate: number;
  codingAccuracy: number;
  missingItemRate: number;
  archiveOnTimeRate: number;
  overdueBorrowCount: number;
  failedRecords: Array<{ recordId: string; visitId: string; reasons: string[] }>;
}
interface MedicalRecordDeepData {
  demo: boolean;
  hasData?: boolean;
  message?: string;
  records?: RecordView[];
  report?: QualityReport;
  generatedAt?: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  bg: '#f5f7fa',
};

const CONF_TAG: Record<RecordView['confidentiality'], { color: string; text: string }> = {
  internal: { color: 'default', text: '内部' },
  confidential: { color: 'orange', text: '机密' },
  secret: { color: 'red', text: '绝密' },
};

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function MedicalRecordDeepPage() {
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState<string>(thisMonth);
  const [data, setData] = useState<MedicalRecordDeepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await getJson<MedicalRecordDeepData>(
        `/api/v1/medical-record/deep?period=${encodeURIComponent(period)}`,
      );
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : '病案深化加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  const report = data?.report;
  const records = data?.records ?? [];

  /** 质控三率雷达/柱：合格/准确/完整 */
  const qualityBarOption = useMemo(() => ({
    tooltip: {},
    grid: { left: 60, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: ['首页合格率', '编码准确率', '归档及时率', '完整率(1-缺项率)'],
      axisLabel: { color: VI.deep },
    },
    yAxis: { type: 'value' as const, max: 1, axisLabel: { color: VI.deep, formatter: (v: number) => `${(v * 100).toFixed(0)}%` } },
    series: [{
      type: 'bar' as const,
      data: [
        { value: report?.frontPagePassRate ?? 0, itemStyle: { color: (report?.frontPagePassRate ?? 0) >= 0.95 ? '#3f9c6f' : '#d95548' } },
        { value: report?.codingAccuracy ?? 0, itemStyle: { color: (report?.codingAccuracy ?? 0) >= 0.95 ? '#3f9c6f' : '#d95548' } },
        { value: report?.archiveOnTimeRate ?? 0, itemStyle: { color: (report?.archiveOnTimeRate ?? 0) >= 0.9 ? '#3f9c6f' : '#d95548' } },
        { value: 1 - (report?.missingItemRate ?? 0), itemStyle: { color: VI.accent } },
      ],
      barMaxWidth: 48,
    }],
  }), [report]);

  const recordColumns: ColumnsType<RecordView> = [
    { title: '病案', dataIndex: 'recordId', width: 130, render: (v: string) => v.replace('mr-demo-', 'MR-') },
    { title: '科室', dataIndex: 'department', width: 110 },
    {
      title: 'ICD 编码', dataIndex: 'coding', width: 110,
      render: (c: CodingView) => (
        <Tag color={c.valid ? 'green' : 'red'}>
          {c.valid ? `合法 ${c.validDiagnoses + c.validSurgeries}/${c.totalDiagnoses + c.totalSurgeries}` : `异常 ${c.issues.filter((i) => !i.valid).length} 项`}
        </Tag>
      ),
    },
    {
      title: '首页完整性', dataIndex: 'completion', width: 120,
      render: (c: CompletionView) => (
        <Tag color={c.complete ? 'green' : 'orange'}>
          {c.complete ? '完整' : `缺 ${c.missingItems.length} 项`}
        </Tag>
      ),
    },
    {
      title: '归档', dataIndex: 'archive', width: 120,
      render: (a: ArchiveView) => {
        if (!a.archived) return <Tag color="default">未归档</Tag>;
        return <Tag color={a.onTime ? 'green' : 'red'}>{a.onTime ? '按时' : '逾期归档'}</Tag>;
      },
    },
    {
      title: '借阅', dataIndex: 'borrowOverdue', width: 90,
      render: (v: boolean) => (v ? <Tag color="red">超期未还</Tag> : <Tag color="default">在库</Tag>),
    },
    {
      title: '保密', dataIndex: 'confidentiality', width: 80,
      render: (v: RecordView['confidentiality']) => <Tag color={CONF_TAG[v].color}>{CONF_TAG[v].text}</Tag>,
    },
    {
      title: '首页结论', dataIndex: 'frontPagePass', width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '合格' : '不合格'}</Tag>,
    },
  ];

  const failed = report?.failedRecords ?? [];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>医院病案管理深化</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          病案设备耗材 · ICD-10 诊断 + ICD-9-CM-3 手术编码（不自创）/ 出院归档时限 / 首页合格率·编码准确率·缺项率 / 借阅归还与保密等级
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 查询条件 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Text style={{ color: '#666' }}>统计周期（如 2026-10）</Text>
              <Input style={{ marginTop: 8 }} value={period} onChange={(e) => setPeriod(e.target.value)} />
            </Col>
            <Col span={6}>
              <Button onClick={load} loading={loading}>查询</Button>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载病案深化数据中…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && data && !data.hasData && (
          <Alert type="info" showIcon message={data.message || '暂无病案数据'} />
        )}

        {!loading && data?.hasData && (
          <>
            {data.demo && <Alert type="warning" showIcon message={data.message} style={{ marginBottom: 16 }} />}

            {/* KPI 卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="病案总数" value={report?.totalRecords ?? 0} suffix="份" /></Card></Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="首页合格率"
                    value={(report?.frontPagePassRate ?? 0) * 100}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: (report?.frontPagePassRate ?? 0) >= 0.95 ? '#3f9c6f' : '#d95548' }}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="编码准确率"
                    value={(report?.codingAccuracy ?? 0) * 100}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: (report?.codingAccuracy ?? 0) >= 0.95 ? '#3f9c6f' : '#d95548' }}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="缺项率"
                    value={(report?.missingItemRate ?? 0) * 100}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: (report?.missingItemRate ?? 0) <= 0.05 ? '#3f9c6f' : '#d95548' }}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="归档及时率 / 借阅超期"
                    value={`${((report?.archiveOnTimeRate ?? 0) * 100).toFixed(0)}% / ${report?.overdueBorrowCount ?? 0} 份`}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card title="病案质量三率（%，越高越好；缺项率反向）" size="small">
                  <ReactECharts option={qualityBarOption} style={{ height: 280 }} />
                </Card>
              </Col>
            </Row>

            <Card title="病案明细（编码校验 / 完整性 / 归档 / 借阅）" size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="recordId"
                size="small"
                columns={recordColumns}
                dataSource={records}
                pagination={{ pageSize: 8 }}
                expandable={{
                  expandedRowRender: (r) => (
                    <div style={{ padding: '0 16px' }}>
                      {r.coding.issues.filter((i) => !i.valid).map((iss, idx) => (
                        <div key={idx}>
                          <Tag color="red">{iss.kind === 'diagnosis' ? '诊断' : '手术'}</Tag>
                          <Text style={{ marginLeft: 8 }}>{iss.reasons.join('；')}</Text>
                        </div>
                      ))}
                      {r.completion.missingItems.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">缺项：{r.completion.missingItems.join('、')}</Text>
                        </div>
                      )}
                    </div>
                  ),
                }}
              />
            </Card>

            {failed.length > 0 && (
              <Card title={`不合格病案整改清单（${failed.length} 份）`} size="small">
                {failed.map((f) => (
                  <div key={f.recordId} style={{ marginBottom: 10 }}>
                    <Tag color="red">不合格</Tag>
                    <Text strong style={{ marginLeft: 8 }}>{f.visitId}</Text>
                    <div style={{ marginLeft: 56, marginTop: 4 }}>
                      {f.reasons.map((r, i) => <Text key={i} type="secondary">{r}<br /></Text>)}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </Content>
    </Layout>
  );
}
