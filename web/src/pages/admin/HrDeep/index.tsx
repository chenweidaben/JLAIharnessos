/**
 * 健澜科技 jlmedaios - M178-B 医院人力资源深化页（阳光人力驾驶舱，仅 admin）
 *
 * 【财务人力行政党建·核心主张】人力资源要公平，不能暗箱操作：
 *   - 人员编制：编制数 / 实有人数 / 缺编率，全院一张表，缺多少缺在哪公开；
 *   - 招聘管理：岗位需求 → 简历筛选 → 面试（≥3 评委独立打分，去最高最低取均）→ 录用；
 *   - 培训管理：培训计划 + 培训记录 + 学分管理，达标与否按规则判定，不送学分；
 *   - 绩效管理：KPI 权重公开（质量40/效率30/满意度20/协作10），绩效工资=基本工资×系数，
 *     公式列化，工资条可逐项复算。
 *
 * 三态：loading / error（可重试）/ empty（无样本，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Space, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type DeptStatus = 'shortage' | 'balanced' | 'overstaffed';

interface EstablishmentRow {
  dept: string;
  deptName: string;
  authorized: number;
  actual: number;
  vacant: number;
  gapRate: number;
  status: DeptStatus;
}

interface Candidate {
  candidateNo: string;
  reviewerCount: number;
  rawScores: number[];
  trimmedMean: number;
  hired: boolean;
}

interface Requisition {
  requisitionId: string;
  dept: string;
  position: string;
  stage: string;
  candidates: Candidate[];
  hiredCount: number;
}

interface StaffingGap {
  period: string;
  byDept: EstablishmentRow[];
  totalAuthorized: number;
  totalActual: number;
  totalVacant: number;
  avgGapRate: number;
}

interface HrDeepResponse {
  generatedAt: string;
  establishment: {
    byDept: EstablishmentRow[];
    totalAuthorized: number;
    totalActual: number;
    totalVacant: number;
    avgGapRate: number;
  };
  recruitment: {
    requisitions: Requisition[];
    openPositions: number;
    hiredThisPeriod: number;
    fairnessRule: string;
  };
  training: {
    requiredStandard: number;
    compliantCount: number;
    totalStaff: number;
    complianceRate: number;
  };
  performance: {
    avgScore: number;
    avgCoefficient: number;
    bonusPoolTotal: number;
    weights: { quality: number; efficiency: number; service: number; collab: number };
  };
  fairnessCharter: string;
  demo: boolean;
  staffingGap: StaffingGap | null;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const STATUS_META: Record<DeptStatus, { label: string; color: string }> = {
  shortage: { label: '缺编', color: 'red' },
  balanced: { label: '满编', color: 'green' },
  overstaffed: { label: '超编', color: 'orange' },
};

export default function HrDeepPage() {
  const [data, setData] = useState<HrDeepResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/hr/deep');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as HrDeepResponse);
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

  const estCols = [
    { title: '科室', dataIndex: 'deptName', key: 'deptName' },
    { title: '编制数', dataIndex: 'authorized', key: 'authorized' },
    { title: '实有人数', dataIndex: 'actual', key: 'actual' },
    {
      title: '缺编数',
      dataIndex: 'vacant',
      key: 'vacant',
      render: (v: number) => (v > 0 ? <Text type="danger">{v}</Text> : v),
    },
    {
      title: '缺编率',
      dataIndex: 'gapRate',
      key: 'gapRate',
      render: (v: number) => `${(v * 100).toFixed(1)}%`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: DeptStatus) => {
        const m = STATUS_META[s];
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
  ];

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
          人力资源深化 · 阳光人力驾驶舱
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.78)', margin: '8px 0 0' }}>
          财务人力行政党建 · 仅 admin 可见 · 编制公开 / 招聘透明 / 学分认规则 / 绩效算公式
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总阳光人力数据…" />
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

        {!loading && !error && data && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* 公平主张 */}
            <Alert type="info" showIcon message={data.fairnessCharter} />

            {/* 顶部四个 KPI */}
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">全院缺编</Text>
                  <Title level={4} style={{ margin: '4px 0 0' }}>
                    {data.establishment.totalVacant}
                    <Text type="secondary" style={{ fontSize: 12 }}> 人（缺编率 {(data.establishment.avgGapRate * 100).toFixed(1)}%）</Text>
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">在招岗位</Text>
                  <Title level={4} style={{ margin: '4px 0 0' }}>
                    {data.recruitment.openPositions}
                    <Text type="secondary" style={{ fontSize: 12 }}> 个 · 本期录用 {data.recruitment.hiredThisPeriod}</Text>
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">学分达标率</Text>
                  <Title level={4} style={{ margin: '4px 0 0' }}>
                    {Math.round(data.training.complianceRate * 100)}
                    <Text type="secondary" style={{ fontSize: 12 }}>%</Text>
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Text type="secondary">平均 KPI 得分</Text>
                  <Title level={4} style={{ margin: '4px 0 0' }}>
                    {data.performance.avgScore}
                    <Text type="secondary" style={{ fontSize: 12 }}> · 系数 {data.performance.avgCoefficient.toFixed(2)}</Text>
                  </Title>
                </Card>
              </Col>
            </Row>

            {/* 人员编制 */}
            <Card title="一、人员编制（编制数 + 实有人数 + 缺编率，公开一张表）">
              <Table
                rowKey="dept"
                size="small"
                columns={estCols}
                dataSource={data.establishment.byDept}
                pagination={false}
              />
            </Card>

            {/* 招聘管理 */}
            <Card title={`二、招聘管理（${data.recruitment.fairnessRule}）`}>
              {data.recruitment.requisitions.map((r) => (
                <div key={r.requisitionId} style={{ marginBottom: 16 }}>
                  <Space>
                    <Text strong>
                      {r.requisitionId} · {r.position}
                    </Text>
                    <Tag color="blue">{r.stage}</Tag>
                    {r.hiredCount > 0 && <Tag color="green">已录用 {r.hiredCount}</Tag>}
                  </Space>
                  <Table
                    style={{ marginTop: 8 }}
                    size="small"
                    rowKey="candidateNo"
                    pagination={false}
                    dataSource={r.candidates}
                    columns={[
                      { title: '候选人', dataIndex: 'candidateNo', key: 'candidateNo' },
                      { title: '评委人数', dataIndex: 'reviewerCount', key: 'reviewerCount' },
                      {
                        title: '各评委原始分',
                        dataIndex: 'rawScores',
                        key: 'rawScores',
                        render: (s: number[]) => s.join(' / '),
                      },
                      {
                        title: '去最高最低后均分',
                        dataIndex: 'trimmedMean',
                        key: 'trimmedMean',
                        render: (v: number) => <Text strong>{v.toFixed(1)}</Text>,
                      },
                      {
                        title: '录用',
                        dataIndex: 'hired',
                        key: 'hired',
                        render: (h: boolean) => (h ? <Tag color="green">录用</Tag> : <Tag>—</Tag>),
                      },
                    ]}
                  />
                </div>
              ))}
            </Card>

            {/* 培训管理 */}
            <Card title="三、培训管理（学分达标：已修 ≥ 应修 25，按规则认定不送学分）">
              <Progress
                percent={Math.round(data.training.complianceRate * 100)}
                size="small"
                status="active"
              />
              <Paragraph style={{ marginTop: 8 }}>
                应修学分标准：<Text strong>{data.training.requiredStandard}</Text> 学分/年；达标员工{' '}
                <Text strong>{data.training.compliantCount}</Text> / {data.training.totalStaff} 人。
              </Paragraph>
            </Card>

            {/* 绩效管理 */}
            <Card title="四、绩效管理（KPI 权重公开，绩效工资=基本工资×系数，可复算）">
              <Row gutter={16}>
                <Col span={6}>
                  <Text>医疗质量（权重 {data.performance.weights.quality * 100}%）</Text>
                  <Progress percent={data.performance.weights.quality * 100} size="small" showInfo={false} />
                </Col>
                <Col span={6}>
                  <Text>工作效率（权重 {data.performance.weights.efficiency * 100}%）</Text>
                  <Progress percent={data.performance.weights.efficiency * 100} size="small" showInfo={false} />
                </Col>
                <Col span={6}>
                  <Text>患者满意度（权重 {data.performance.weights.service * 100}%）</Text>
                  <Progress percent={data.performance.weights.service * 100} size="small" showInfo={false} />
                </Col>
                <Col span={6}>
                  <Text>协作教学（权重 {data.performance.weights.collab * 100}%）</Text>
                  <Progress percent={data.performance.weights.collab * 100} size="small" showInfo={false} />
                </Col>
              </Row>
              <Paragraph style={{ marginTop: 12 }}>
                系数分段（公开）：加权分 ≥90→1.30；80~89→1.20；70~79→1.00；60~69→0.90；{'<'}60→0.80。
                科室奖金池合计 <Text strong>¥{data.performance.bonusPoolTotal.toLocaleString()}</Text>
                /月，按个人得分占比切分。
              </Paragraph>
            </Card>

            {data.demo && (
              <Alert type="warning" showIcon message="当前为内置演示台账（空库可演示）。接入 HRP/HR 真实数据后自动替换，公式不变。" />
            )}
          </Space>
        )}
      </Content>
    </Layout>
  );
}
