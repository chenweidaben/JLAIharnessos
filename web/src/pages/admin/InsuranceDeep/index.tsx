/**
 * 健澜科技 jlmedaios - M179-C 【护理院感医保药事】医保管理深化页（仅 admin）
 *
 * 医保管理要合规，不能骗保：
 *  - 政策目录：药品/诊疗/服务设施 × 甲乙丙分级；
 *  - 费用审核：事前（目录匹配+事前审批）/事中（重复计费）/事后稽核（自费占比）；
 *  - 结算管理：门诊/住院/DRG/DIP，统筹基数与自费分列；
 *  - 拒付管理：原因/申诉/整改/追回 闭环。
 *
 * 三态：loading / error（可重试）/ empty（暂无结算）。视觉：深海蓝 VI。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Input, Layout, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF insuranceDeep 输出对齐的类型 ---------------- */

interface RiskRow {
  claimId: string;
  riskScore: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: { factor: string; points: number }[];
  advice: string;
}
interface InsuranceDeepData {
  demo: boolean;
  hasData?: boolean;
  message?: string;
  period?: string;
  mgmt?: {
    policy: { drug: number; treatment: number; facility: number; levelA: number; levelB: number; levelC: number };
    audit: { totalClaims: number; pass: number; warn: number; rejectSuggest: number; totalIssues: number; highSeverityIssues: number };
    settlement: {
      outpatient: number; inpatient: number; drg: number; dip: number;
      totalAmount: number; insuranceBase: number; selfPay: number; selfPayRatio: number;
    };
    rejection: { total: number; totalAmount: number; appealed: number; recovered: number; openCases: number };
    complianceRate: number;
  };
  risks?: RiskRow[];
  report?: {
    period: string;
    claimCount: number;
    totalAmount: number;
    insuranceBase: number;
    selfPay: number;
    selfPayRatio: number;
    complianceRate: number;
    rejectionRate: number;
    rejectionAmount: number;
    topIssueTypes: { type: string; count: number }[];
    recommendations: string[];
  };
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

const RISK_TAG: Record<RiskRow['level'], { color: string; text: string }> = {
  low: { color: 'green', text: '低风险' },
  medium: { color: 'orange', text: '中风险' },
  high: { color: 'red', text: '高风险' },
  critical: { color: 'volcano', text: '极高风险' },
};

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function InsuranceDeepPage() {
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState<string>(thisMonth);
  const [data, setData] = useState<InsuranceDeepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await getJson<InsuranceDeepData>(`/api/v1/insurance/deep?period=${encodeURIComponent(period)}`);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : '医保管理深化加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  const m = data?.mgmt;
  const s = m?.settlement;
  const a = m?.audit;
  const rj = m?.rejection;
  const report = data?.report;
  const risks = data?.risks ?? [];

  const riskColumns: ColumnsType<RiskRow> = [
    { title: '申报单', dataIndex: 'claimId', width: 140 },
    {
      title: '风险分', dataIndex: 'riskScore', width: 100,
      render: (v: number) => <Text strong style={{ color: v >= 60 ? '#d95548' : '#3f9c6f' }}>{v}</Text>,
    },
    {
      title: '等级', dataIndex: 'level', width: 100,
      render: (v: RiskRow['level']) => <Tag color={RISK_TAG[v].color}>{RISK_TAG[v].text}</Tag>,
    },
    {
      title: '风险因子', dataIndex: 'factors',
      render: (f: RiskRow['factors']) => f.map((x) => `${x.factor}(+${x.points})`).join('；') || '—',
    },
    { title: '处置建议', dataIndex: 'advice' },
  ];

  const issueColumns: ColumnsType<{ type: string; count: number }> = [
    { title: '问题类型', dataIndex: 'type' },
    { title: '出现次数', dataIndex: 'count', width: 120 },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>医保管理深化（合规驾驶舱）</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          护理院感医保药事 · 政策目录（甲乙丙）/ 费用三道防线审核 / 门诊·住院·DRG·DIP结算 / 拒付申诉整改追回闭环
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Text style={{ color: '#666' }}>统计周期（如 2026-09）</Text>
              <Input style={{ marginTop: 8 }} value={period} onChange={(e) => setPeriod(e.target.value)} />
            </Col>
            <Col span={6}>
              <Button type="primary" onClick={load} loading={loading}>查询</Button>
            </Col>
            <Col span={10}>
              <Text type="secondary">审核结论为建议级，须医保办人工确认，不自动改结算——合规第一，严禁骗保。</Text>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载医保管理深化中…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && data && !data.hasData && (
          <Alert type="info" showIcon message={data.message || '暂无数据'} />
        )}

        {!loading && data?.hasData && (
          <>
            {data.demo && <Alert type="warning" showIcon message={data.message} style={{ marginBottom: 16 }} />}

            {/* KPI 卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={5}>
                <Card>
                  <Statistic title="费用总额" value={s?.totalAmount ?? 0} precision={2} prefix="¥" />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic title="统筹纳入基数" value={s?.insuranceBase ?? 0} precision={2} prefix="¥"
                    valueStyle={{ color: VI.accent }} />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic title="自费占比" value={(s?.selfPayRatio ?? 0) * 100} precision={1} suffix="%"
                    valueStyle={{ color: (s?.selfPayRatio ?? 0) > 0.3 ? '#d95548' : '#3f9c6f' }} />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic title="合规率（一次通过）" value={(m?.complianceRate ?? 0) * 100} precision={1} suffix="%"
                    valueStyle={{ color: (m?.complianceRate ?? 0) >= 0.8 ? '#3f9c6f' : '#d95548' }} />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic title="拒付未结" value={rj?.openCases ?? 0} suffix="件"
                    valueStyle={{ color: (rj?.openCases ?? 0) > 0 ? '#d95548' : '#3f9c6f' }} />
                </Card>
              </Col>
            </Row>

            {/* 结算结构 + 政策目录 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="结算结构（按类型）" size="small">
                  <Row gutter={16}>
                    <Col span={6}><Statistic title="门诊" value={s?.outpatient ?? 0} suffix="单" /></Col>
                    <Col span={6}><Statistic title="住院" value={s?.inpatient ?? 0} suffix="单" /></Col>
                    <Col span={6}><Statistic title="DRG" value={s?.drg ?? 0} suffix="单" /></Col>
                    <Col span={6}><Statistic title="DIP" value={s?.dip ?? 0} suffix="单" /></Col>
                  </Row>
                  <DividerText />
                  <Row gutter={16}>
                    <Col span={8}><Statistic title="审核通过" value={a?.pass ?? 0} suffix="单" /></Col>
                    <Col span={8}><Statistic title="提示放行" value={a?.warn ?? 0} suffix="单" /></Col>
                    <Col span={8}>
                      <Statistic title="建议退回/拒付" value={a?.rejectSuggest ?? 0} suffix="单"
                        valueStyle={{ color: '#d95548' }} />
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="医保政策目录盘点" size="small">
                  <Row gutter={16}>
                    <Col span={8}><Statistic title="药品" value={m?.policy.drug ?? 0} /></Col>
                    <Col span={8}><Statistic title="诊疗项目" value={m?.policy.treatment ?? 0} /></Col>
                    <Col span={8}><Statistic title="服务设施" value={m?.policy.facility ?? 0} /></Col>
                  </Row>
                  <DividerText />
                  <Row gutter={16}>
                    <Col span={8}><Statistic title="甲类（全额）" value={m?.policy.levelA ?? 0} /></Col>
                    <Col span={8}><Statistic title="乙类（先行自付）" value={m?.policy.levelB ?? 0} /></Col>
                    <Col span={8}><Statistic title="丙类（自费）" value={m?.policy.levelC ?? 0} /></Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* 拒付风险预测 */}
            <Card title={`拒付风险预测（${risks.length} 单）`} size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="claimId"
                size="small"
                columns={riskColumns}
                dataSource={risks}
                pagination={{ pageSize: 8 }}
              />
            </Card>

            {/* 报告结论 */}
            {report && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Card title={`${report.period} 高频审核问题`} size="small">
                    <Table
                      rowKey="type"
                      size="small"
                      pagination={false}
                      columns={issueColumns}
                      dataSource={report.topIssueTypes}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="合规整改建议" size="small">
                    {report.recommendations.map((t, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <Tag color="blue">建议 {i + 1}</Tag>
                        <Text style={{ marginLeft: 8 }}>{t}</Text>
                      </div>
                    ))}
                  </Card>
                </Col>
              </Row>
            )}

            {/* 拒付管理 */}
            <Card title="拒付管理（原因/申诉/整改/追回）" size="small">
              <Row gutter={16}>
                <Col span={6}><Statistic title="拒付案件" value={rj?.total ?? 0} suffix="件" /></Col>
                <Col span={6}><Statistic title="拒付金额" value={rj?.totalAmount ?? 0} precision={2} prefix="¥" /></Col>
                <Col span={6}><Statistic title="已申诉" value={rj?.appealed ?? 0} suffix="件" /></Col>
                <Col span={6}>
                  <Statistic title="已追回" value={rj?.recovered ?? 0} suffix="件"
                    valueStyle={{ color: '#3f9c6f' }} />
                </Col>
              </Row>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}

function DividerText() {
  return <div style={{ margin: '12px 0', borderTop: '1px dashed #e8eef5' }} />;
}
