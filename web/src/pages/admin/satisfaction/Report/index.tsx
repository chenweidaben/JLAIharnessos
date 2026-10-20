/**
 * 健澜科技 jlmedaios - M141-B 管理员满意度报告页（仅 admin）
 *
 * 【质量与安全】匿名满意度调查：患者敢说真话。
 *   - 数据来自 GET /api/v1/admin/satisfaction/report?period=YYYY-MM&dept=xxx；
 *   - 顶部深海蓝渐变头部 + 当月问卷数 / 整体均分概览；
 *   - 六维度均分表格（挂号便捷度/医生态度/护士态度/环境舒适度/等待时间/费用透明度）；
 *   - 低分维度自动生成改进建议（high/medium/low 优先级标签）。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Layout, Row, Select, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF satisfactionAggregator 输出对齐 */
type DimensionKey =
  | 'registration_convenience'
  | 'doctor_attitude'
  | 'nurse_attitude'
  | 'environment_comfort'
  | 'wait_time'
  | 'cost_transparency';

interface DimensionAnalysis {
  key: DimensionKey;
  label: string;
  avgScore: number;
  count: number;
  lowScoreCount: number;
}
interface SatisfactionAnalysis {
  period: string;
  deptCode?: string;
  totalSurveys: number;
  overallAvg: number;
  dimensions: DimensionAnalysis[];
  lowScoreDimensions: DimensionKey[];
}
interface ImprovementSuggestion {
  dimension: DimensionKey;
  dimensionLabel: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}
interface ReportView {
  analysis: SatisfactionAnalysis;
  suggestions: ImprovementSuggestion[];
}

/** 深海蓝 VI 色板 */
const VI = { deep: '#0a2540', mid: '#123a5e', accent: '#1e6fbf', bg: '#f5f7fa' };

const PRIORITY_COLOR: Record<ImprovementSuggestion['priority'], string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
};

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function SatisfactionReportPage() {
  const [data, setData] = useState<ReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [dept, setDept] = useState<string | undefined>(undefined);

  const load = async (p: string, d?: string) => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/v1/admin/satisfaction/report?period=${p}${d ? `&dept=${encodeURIComponent(d)}` : ''}`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as ReportView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(period, dept); }, [period, dept]);

  const columns: ColumnsType<DimensionAnalysis> = useMemo(
    () => [
      { title: '维度', dataIndex: 'label' },
      {
        title: '均分（满分 5）',
        dataIndex: 'avgScore',
        width: 140,
        align: 'right',
        render: (v: number) => (
          <Tag color={v >= 4 ? 'green' : v >= 3.5 ? 'blue' : v >= 3 ? 'orange' : 'red'}>
            {v.toFixed(2)}
          </Tag>
        ),
      },
      { title: '样本数', dataIndex: 'count', width: 100, align: 'right' },
      {
        title: '低分（≤2）条数',
        dataIndex: 'lowScoreCount',
        width: 140,
        align: 'right',
        render: (v: number) => (v > 0 ? <Tag color="red">{v}</Tag> : <span style={{ color: '#999' }}>0</span>),
      },
    ],
    [],
  );

  const analysis = data?.analysis;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝渐变头部 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>患者满意度报告</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              匿名调查 · 患者敢说真话 · 六维度持续改进
            </Paragraph>
          </Col>
          <Col>
            <Select
              value={period}
              style={{ width: 140, background: 'rgba(255,255,255,0.15)' }}
              onChange={(v) => setPeriod(v)}
              options={[0, -1, -2].map((offset) => {
                const d = new Date();
                d.setMonth(d.getMonth() + offset);
                const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return { value: p, label: p };
              })}
            />
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载满意度报告…" />
          </div>
        )}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button size="small" onClick={() => load(period, dept)}>重试</Button>}
          />
        )}
        {!loading && !error && !analysis && (
          <Alert type="info" showIcon message="暂无满意度数据，待患者扫码填写后自动生成报告。" />
        )}

        {!loading && !error && analysis && (
          <>
            {/* 概览 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Statistic title="当期问卷数" value={analysis.totalSurveys} suffix="份" />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="整体均分"
                    value={analysis.overallAvg}
                    precision={2}
                    suffix="/ 5"
                    valueStyle={{ color: analysis.overallAvg >= 4 ? '#3f8600' : analysis.overallAvg >= 3 ? '#cf8a00' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="低分维度数"
                    value={analysis.lowScoreDimensions?.length ?? 0}
                    suffix="项"
                    valueStyle={{ color: (analysis.lowScoreDimensions?.length ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 科室过滤 */}
            <Card style={{ marginBottom: 16 }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <strong>{analysis.period} 月度报告</strong>
                  <span style={{ color: 'rgba(0,0,0,0.55)', marginLeft: 12 }}>
                    {analysis.deptCode ? `科室：${analysis.deptCode}` : '全院汇总'}
                  </span>
                </Col>
                <Col>
                  <Select
                    allowClear
                    placeholder="按科室过滤"
                    style={{ width: 180 }}
                    value={dept}
                    onChange={(v) => setDept(v)}
                    options={[
                      { value: 'outpatient', label: '门诊' },
                      { value: 'inpatient', label: '住院' },
                      { value: 'emergency', label: '急诊' },
                    ]}
                  />
                </Col>
              </Row>
            </Card>

            {/* 六维度均分 */}
            <Card title="六维度评分" style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                columns={columns}
                dataSource={analysis.dimensions ?? []}
                pagination={false}
                size="small"
              />
            </Card>

            {/* 改进建议 */}
            <Card title="改进建议（来自低分维度）">
              {(!data?.suggestions || data.suggestions.length === 0) && (
                <Alert type="success" showIcon message="当前各维度均分均 ≥ 3.5，继续保持。" />
              )}
              {data?.suggestions?.map((s) => (
                <Card key={s.dimension} size="small" style={{ marginBottom: 8 }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Tag color={PRIORITY_COLOR[s.priority]}>{s.priority === 'high' ? '高优' : s.priority === 'medium' ? '中优' : '低优'}</Tag>
                      <strong style={{ marginLeft: 8 }}>{s.dimensionLabel}</strong>
                      <div style={{ marginTop: 8, color: 'rgba(0,0,0,0.65)' }}>{s.suggestion}</div>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
