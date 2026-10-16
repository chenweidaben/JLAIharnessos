/**
 * 健澜科技 jlmedaios - M175-A 深度数据治理页（管理驾驶舱，仅 admin）
 *
 * 【质量与新场景·核心主张】数据治理要真治理，不是建表就完：
 *   - 体系：数据标准 / 数据质量 / 数据安全 / 数据生命周期 四大治理域；
 *   - 真检查：对单表单字段按规则跑通过率（完整性/准确性/一致性/及时性/唯一性）；
 *   - 报告：周期五维得分、短板项与红线处置建议；
 *   - 异常：按字段治理规则识别超区间/空值/格式异常。
 *
 * 三态：loading / error（可重试）/ empty（无样本，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type GovernanceDomain = 'standard' | 'quality' | 'security' | 'lifecycle';
type QualityDimension =
  | 'completeness'
  | 'accuracy'
  | 'consistency'
  | 'timeliness'
  | 'uniqueness';

interface GovSubItem {
  code: string;
  name: string;
  description: string;
  controls: number;
}
interface GovDomain {
  code: GovernanceDomain;
  name: string;
  principle: string;
  items: GovSubItem[];
}
interface DeepDataGovernance {
  generatedAt: string;
  domains: GovDomain[];
  totalItems: number;
  totalControls: number;
  summary: Record<GovernanceDomain, number>;
  recommendedRuleCount: number;
}
interface GovCheckResult {
  table: string;
  field: string;
  checkType: string;
  severity: string;
  dimension: QualityDimension;
  totalRows: number;
  passedRows: number;
  failedRows: number;
  passRate: number;
  status: 'pass' | 'fail';
}
interface DataAnomaly {
  table: string;
  field: string;
  value: unknown;
  isAnomaly: boolean;
  level: 'critical' | 'warning' | 'ok';
  reason: string;
  expected: string | null;
}
interface GovQualityReport {
  period: string;
  overallScore: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  dimensionBreakdown: Record<QualityDimension, number>;
  topIssues: GovCheckResult[];
  recommendations: string[];
  weakestDimension: QualityDimension | null;
}
interface DeepResponse {
  system: DeepDataGovernance;
  checks: GovCheckResult[];
  report: GovQualityReport;
  anomalies: DataAnomaly[];
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const DOMAIN_META: Record<GovernanceDomain, { label: string; color: string }> = {
  standard: { label: '数据标准', color: 'geekblue' },
  quality: { label: '数据质量', color: 'blue' },
  security: { label: '数据安全', color: 'red' },
  lifecycle: { label: '生命周期', color: 'cyan' },
};

const DIM_META: Record<QualityDimension, string> = {
  completeness: '完整性',
  accuracy: '准确性',
  consistency: '一致性',
  timeliness: '及时性',
  uniqueness: '唯一性',
};

const LEVEL_META: Record<'critical' | 'warning' | 'ok', { label: string; color: string }> = {
  critical: { label: '异常', color: 'red' },
  warning: { label: '关注', color: 'orange' },
  ok: { label: '正常', color: 'green' },
};

export default function DataGovernancePage() {
  const [data, setData] = useState<DeepResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/data/governance');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as DeepResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const system = data?.system;
  const report = data?.report;
  const anomalyCount = data?.anomalies.filter((a) => a.isAnomaly).length ?? 0;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          深度数据治理
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 仅 admin 可见 · 治理要真治理，不是建表就完 · 四大治理域 / 真检查 / 周期报告
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总深度数据治理体系…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && !system && (
          <Alert
            type="info"
            showIcon
            message="暂无治理样本。接入数据平台后将自动成盘。"
          />
        )}

        {!loading && !error && system && report && (
          <>
            {data?.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示样本：尚未接入真实数据平台采集，页面用于演示深度治理驾驶舱效果。"
              />
            )}

            {/* 结论横幅 */}
            <Card style={{ marginBottom: 16, borderLeft: `4px solid ${VI.accent}` }}>
              <Row gutter={24}>
                <Col span={6}>
                  <Statistic title="周期质量得分" value={report.overallScore} suffix="/100" />
                </Col>
                <Col span={6}>
                  <Statistic title="治理子项" value={system.totalItems} suffix="项" />
                </Col>
                <Col span={6}>
                  <Statistic title="控制措施" value={system.totalControls} suffix="条" />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="待处置异常"
                    value={anomalyCount}
                    valueStyle={{ color: anomalyCount > 0 ? '#cf1322' : '#3f8600' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* 四大治理域 */}
            <Card title="深度治理体系（四大治理域）" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                {system.domains.map((d) => (
                  <Col span={6} key={d.code}>
                    <Card
                      size="small"
                      title={<Tag color={DOMAIN_META[d.code].color}>{d.name}</Tag>}
                    >
                      <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
                        {d.principle}
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        {d.items.map((it) => (
                          <div key={it.code} style={{ fontSize: 12, marginBottom: 4 }}>
                            <Text strong>{it.name}</Text>
                            <Text style={{ color: 'rgba(0,0,0,0.55)' }}>
                              {' '}
                              ×{it.controls}
                            </Text>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              {/* 五维得分 */}
              <Col span={10}>
                <Card title="周期五维质量得分" style={{ height: '100%' }}>
                  {(Object.keys(DIM_META) as QualityDimension[]).map((d) => (
                    <div key={d} style={{ marginBottom: 10 }}>
                      <Text style={{ fontSize: 13 }}>{DIM_META[d]}</Text>
                      <div
                        style={{
                          background: '#eef2f7',
                          borderRadius: 4,
                          height: 10,
                          marginTop: 4,
                        }}
                      >
                        <div
                          style={{
                            width: `${report.dimensionBreakdown[d]}%`,
                            height: 10,
                            borderRadius: 4,
                            background:
                              report.dimensionBreakdown[d] >= 95
                                ? '#52c41a'
                                : report.dimensionBreakdown[d] >= 80
                                  ? '#faad14'
                                  : '#cf1322',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </Card>
              </Col>

              {/* 处置建议 */}
              <Col span={14}>
                <Card title="短板与红线处置建议" style={{ height: '100%' }}>
                  {report.recommendations.length === 0 ? (
                    <Text style={{ color: 'rgba(0,0,0,0.55)' }}>
                      当前无待整改项，保持监测。
                    </Text>
                  ) : (
                    report.recommendations.map((r, i) => (
                      <Alert
                        key={i}
                        type={r.startsWith('[红线]') ? 'error' : 'warning'}
                        showIcon
                        style={{ marginBottom: 8 }}
                        message={r}
                      />
                    ))
                  )}
                </Card>
              </Col>
            </Row>

            {/* 真检查结果 */}
            <Card title="单表单字段真检查（按规则跑通过率）" style={{ marginBottom: 16 }}>
              <Table
                rowKey={(r) => `${r.table}.${r.field}`}
                pagination={false}
                dataSource={data?.checks ?? []}
                size="small"
                columns={[
                  { title: '表.字段', render: (_: unknown, r: GovCheckResult) => `${r.table}.${r.field}` },
                  { title: '维度', dataIndex: 'dimension', render: (d: QualityDimension) => DIM_META[d] },
                  { title: '检查类型', dataIndex: 'checkType', width: 120 },
                  { title: '样本数', dataIndex: 'totalRows', width: 80 },
                  { title: '失败', dataIndex: 'failedRows', width: 70 },
                  {
                    title: '通过率',
                    dataIndex: 'passRate',
                    width: 110,
                    render: (v: number) => (
                      <Tag color={v >= 95 ? 'green' : v >= 80 ? 'orange' : 'red'}>{v}%</Tag>
                    ),
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 90,
                    render: (s: string) =>
                      s === 'pass' ? <Tag color="green">通过</Tag> : <Tag color="red">不达标</Tag>,
                  },
                ]}
              />
            </Card>

            {/* 异常识别 */}
            <Card title="数据异常识别（按字段治理规则）">
              <Table
                rowKey={(r) => `${r.table}.${r.field}-${String(r.value)}`}
                pagination={false}
                dataSource={data?.anomalies ?? []}
                size="small"
                columns={[
                  { title: '表.字段', render: (_: unknown, r: DataAnomaly) => `${r.table}.${r.field}` },
                  { title: '值', dataIndex: 'value', width: 120, render: (v: unknown) => String(v) },
                  {
                    title: '等级',
                    dataIndex: 'level',
                    width: 90,
                    render: (l: 'critical' | 'warning' | 'ok') => (
                      <Tag color={LEVEL_META[l].color}>{LEVEL_META[l].label}</Tag>
                    ),
                  },
                  { title: '期望', dataIndex: 'expected', width: 160, render: (v: string | null) => v ?? '—' },
                  { title: '说明', dataIndex: 'reason' },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
