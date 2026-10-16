/**
 * 健澜科技 jlmedaios - M170-A 自学习深化页（管理驾驶舱，仅 admin）
 *
 * 展示 BFF /api/v1/admin/auto-learn/deep 聚合结果——医院四维度深度自学习进化：
 *   - 诊断准确率学习：医生初诊 vs 最终确诊，命中率驱动诊断推荐权重；
 *   - 用药合理性学习：药师审方结果，合理率驱动用药推荐可信度；
 *   - 护理风险学习：不良事件事前预警率（敏感性），漏报驱动预警阈值自动下调；
 *   - 管理决策学习：决策结果与影响偏差，成功率驱动管理推荐倾向；
 *   - 知识漂移检测：本周期 vs 上周期指标下滑告警；
 *   - 交叉验证：留出测试集 F1 / 过拟合风险。
 *
 * 【自学习与数字孪生】真实有效：所有指标由样本数出，权重/阈值是指标越线后的
 *   确定性折算，不是写死的假进化。
 *
 * 三态：loading / error（可重试）/ empty。视觉：深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type Dimension = 'diagnosis' | 'medication' | 'nursing' | 'management';

interface DimensionWeightChange {
  dimension: Dimension;
  oldWeight: number;
  newWeight: number;
  direction: 'boost' | 'dampen' | 'hold';
  metric: number;
  metricName: string;
  samples: number;
  reason: string;
}

interface DriftAlert {
  dimension: Dimension;
  metricName: string;
  previous: number;
  current: number;
  delta: number;
  severity: 'high' | 'medium' | 'none';
  recommendation: string;
}

interface CrossValidationResult {
  dimension: Dimension;
  testSamples: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  passed: boolean;
  overfitRisk: boolean;
}

interface EvolutionReport {
  period: { days: number; generatedAt: string };
  learning: {
    diagnosis: {
      samples: number;
      accuracy: number;
      missRate: number;
      avgDelayedDays: number | null;
      action: string;
    };
    medication: {
      samples: number;
      appropriateRate: number;
      wrongRate: number;
      issueBreakdown: Array<{ issueType: string; count: number }>;
      action: string;
    };
    nursing: {
      samples: number;
      sensitivity: number;
      missRate: number;
      suggestedThreshold: number;
      thresholdDirection: 'lower' | 'raise' | 'hold';
      action: string;
    };
    management: {
      samples: number;
      successRate: number;
      avgImpact: number;
      action: string;
    };
    weightChanges: DimensionWeightChange[];
    weights: Record<Dimension, number>;
    autoActionsTaken: number;
  };
  drift: { hasDrift: boolean; alerts: DriftAlert[] };
  crossValidation: CrossValidationResult[];
  summary: {
    evolutionScore: number;
    autoActionsTaken: number;
    driftAlerts: number;
    cvPassed: number;
    cvTotal: number;
  };
  demo: boolean;
  notice?: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const DIM_LABEL: Record<Dimension, string> = {
  diagnosis: '诊断准确率',
  medication: '用药合理性',
  nursing: '护理风险',
  management: '管理决策',
};

const DIR_TAG: Record<DimensionWeightChange['direction'], { color: string; label: string }> = {
  boost: { color: 'green', label: '升权 ↑' },
  dampen: { color: 'red', label: '降权 ↓' },
  hold: { color: 'default', label: '保持' },
};

const DRIFT_COLOR: Record<DriftAlert['severity'], string> = {
  high: 'red',
  medium: 'orange',
  none: 'default',
};

export default function AutoLearnDeepPage() {
  const [data, setData] = useState<EvolutionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/auto-learn/deep?days=7');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as EvolutionReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = data?.summary;
  const learning = data?.learning;

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
          自学习深化 · 医院四维度自动进化
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          诊断命中率 → 推荐权重自校准 · 药师审方 → 用药可信度自升降 · 不良事件漏报 → 预警阈值自下调 · 决策结果 → 管理推荐自调整
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总本周期四维度自学习…" />
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

        {!loading && !error && !data && <Alert type="info" showIcon message="暂无深度自学习数据。" />}

        {!loading && !error && data && summary && learning && (
          <>
            {data.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={data.notice || '当前为演示模式数据。'}
              />
            )}

            {/* 汇总大数字 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>自动进化成熟度</div>
                    <Progress
                      type="dashboard"
                      percent={summary.evolutionScore}
                      size={110}
                      strokeColor={{ from: VI.accent, to: VI.deep }}
                    />
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>本周期自动进化动作</div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: VI.accent }}>
                      {summary.autoActionsTaken}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>次（系统自动执行，零人工调参）</div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>知识漂移告警</div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: summary.driftAlerts > 0 ? '#f5222d' : VI.deep }}>
                      {summary.driftAlerts}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>项需关注或重训</div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>交叉验证通过</div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: VI.deep }}>
                      {summary.cvPassed}
                      <span style={{ fontSize: 18, color: 'rgba(0,0,0,0.45)' }}> / {summary.cvTotal}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>维度 F1 ≥ 0.7 视为通过</div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 四维度学习卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="诊断准确率学习（初诊 vs 最终确诊）" size="small">
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="blue">命中率 {(learning.diagnosis.accuracy * 100).toFixed(0)}%</Tag>
                    <Tag color="red">漏诊率 {(learning.diagnosis.missRate * 100).toFixed(0)}%</Tag>
                    <Tag>样本 {learning.diagnosis.samples}</Tag>
                    {learning.diagnosis.avgDelayedDays !== null && (
                      <Tag color="orange">平均延迟 {learning.diagnosis.avgDelayedDays} 天</Tag>
                    )}
                  </div>
                  <div style={{ fontSize: 13 }}>{learning.diagnosis.action}</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="用药合理性学习（药师审方）" size="small">
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="blue">合理率 {(learning.medication.appropriateRate * 100).toFixed(0)}%</Tag>
                    <Tag color="red">错误率 {(learning.medication.wrongRate * 100).toFixed(0)}%</Tag>
                    <Tag>样本 {learning.medication.samples}</Tag>
                  </div>
                  {learning.medication.issueBreakdown.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      {learning.medication.issueBreakdown.map((i) => (
                        <Tag key={i.issueType} color="orange">
                          {i.issueType} × {i.count}
                        </Tag>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 13 }}>{learning.medication.action}</div>
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="护理风险学习（不良事件事前预警）" size="small">
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="blue">预警率 {(learning.nursing.sensitivity * 100).toFixed(0)}%</Tag>
                    <Tag color="red">漏报率 {(learning.nursing.missRate * 100).toFixed(0)}%</Tag>
                    <Tag>样本 {learning.nursing.samples}</Tag>
                    <Tag color={learning.nursing.thresholdDirection === 'lower' ? 'green' : 'default'}>
                      阈值 → {learning.nursing.suggestedThreshold.toFixed(2)}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 13 }}>{learning.nursing.action}</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="管理决策学习（决策结果与影响偏差）" size="small">
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="blue">成功率 {(learning.management.successRate * 100).toFixed(0)}%</Tag>
                    <Tag>
                      平均影响偏差 {learning.management.avgImpact >= 0 ? '+' : ''}
                      {learning.management.avgImpact.toFixed(2)}
                    </Tag>
                    <Tag>样本 {learning.management.samples}</Tag>
                  </div>
                  <div style={{ fontSize: 13 }}>{learning.management.action}</div>
                </Card>
              </Col>
            </Row>

            {/* 权重调整留痕 */}
            <Card title="四维度权重自动调整留痕" size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="dimension"
                pagination={false}
                dataSource={learning.weightChanges}
                columns={[
                  {
                    title: '维度',
                    dataIndex: 'dimension',
                    width: 120,
                    render: (v: Dimension) => DIM_LABEL[v],
                  },
                  {
                    title: '方向',
                    dataIndex: 'direction',
                    width: 90,
                    render: (v: DimensionWeightChange['direction']) => <Tag color={DIR_TAG[v].color}>{DIR_TAG[v].label}</Tag>,
                  },
                  {
                    title: '指标',
                    render: (_: unknown, r: DimensionWeightChange) =>
                      `${r.metricName}=${(r.metric * 100).toFixed(0)}%（样本 ${r.samples}）`,
                  },
                  {
                    title: '权重变化',
                    render: (_: unknown, r: DimensionWeightChange) => (
                      <span style={{ color: VI.deep, fontWeight: 600 }}>
                        {r.oldWeight.toFixed(2)} → {r.newWeight.toFixed(2)}
                      </span>
                    ),
                  },
                  { title: '原因', dataIndex: 'reason' },
                ]}
              />
            </Card>

            {/* 知识漂移 */}
            <Card title="知识漂移检测（本周期 vs 上周期）" size="small" style={{ marginBottom: 16 }}>
              {data.drift.alerts.length === 0 && (
                <div style={{ color: 'rgba(0,0,0,0.45)' }}>无上周期对比样本或指标稳定，未发现漂移</div>
              )}
              {data.drift.alerts.length > 0 && (
                <Table
                  rowKey={(r) => `${r.dimension}-${r.metricName}`}
                  pagination={false}
                  dataSource={data.drift.alerts}
                  columns={[
                    { title: '维度', dataIndex: 'dimension', width: 110, render: (v: Dimension) => DIM_LABEL[v] },
                    { title: '指标', dataIndex: 'metricName', width: 140 },
                    {
                      title: '上周期 → 本周期',
                      render: (_: unknown, r: DriftAlert) =>
                        `${(r.previous * 100).toFixed(0)}% → ${(r.current * 100).toFixed(0)}%（${r.delta >= 0 ? '+' : ''}${(r.delta * 100).toFixed(0)}%）`,
                    },
                    {
                      title: '严重度',
                      dataIndex: 'severity',
                      width: 90,
                      render: (v: DriftAlert['severity']) => (
                        <Tag color={DRIFT_COLOR[v]}>{v === 'high' ? '高' : v === 'medium' ? '中' : '无'}</Tag>
                      ),
                    },
                    { title: '处置建议', dataIndex: 'recommendation' },
                  ]}
                />
              )}
            </Card>

            {/* 交叉验证 */}
            <Card title="学习效果交叉验证（留出测试集）" size="small">
              {data.crossValidation.length === 0 && (
                <div style={{ color: 'rgba(0,0,0,0.45)' }}>各维度样本不足，暂不做交叉验证</div>
              )}
              {data.crossValidation.length > 0 && (
                <Table
                  rowKey="dimension"
                  pagination={false}
                  dataSource={data.crossValidation}
                  columns={[
                    { title: '维度', dataIndex: 'dimension', width: 110, render: (v: Dimension) => DIM_LABEL[v] },
                    { title: '样本', dataIndex: 'testSamples', width: 70 },
                    { title: '准确率', dataIndex: 'accuracy', width: 90, render: (v: number) => `${(v * 100).toFixed(0)}%` },
                    { title: '精确率', dataIndex: 'precision', width: 90, render: (v: number) => `${(v * 100).toFixed(0)}%` },
                    { title: '召回率', dataIndex: 'recall', width: 90, render: (v: number) => `${(v * 100).toFixed(0)}%` },
                    { title: 'F1', dataIndex: 'f1', width: 80, render: (v: number) => v.toFixed(2) },
                    {
                      title: '结论',
                      render: (_: unknown, r: CrossValidationResult) => (
                        <span>
                          <Tag color={r.passed ? 'green' : 'red'}>{r.passed ? '通过' : '未通过'}</Tag>
                          {r.overfitRisk && <Tag color="orange">过拟合风险</Tag>}
                        </span>
                      ),
                    },
                  ]}
                />
              )}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
