/**
 * 健澜科技 jlmedaios - M160-A 全自学习闭环报告页（管理驾驶舱，仅 admin）
 *
 * 展示 BFF /api/v1/admin/auto-learn/report 聚合结果——系统每周自动进化的一页总账：
 *   - 顶部大数字：本周期反馈事件量 / 自动进化动作数 / 自动进化成熟度 / 知识缺口数；
 *   - 推荐权重调整表：医生采纳→升权、拒绝→降权的真实折算留痕；
 *   - 四通道进化动作：服务流程优化 / 安全规则升级 / 质控薄弱环节强化；
 *   - 知识缺口清单：系统「还没学会」的地方，按严重度排序。
 *
 * 学习闭环（不需人工调参）：
 *   医生采纳/拒绝AI建议 → 自动调整推荐权重；
 *   患者满意度反馈     → 自动优化服务流程；
 *   医疗差错报告       → 自动更新安全规则；
 *   质控扣分           → 自动强化薄弱环节。
 *
 * 三态：loading / error（可重试）/ empty。视觉：深海蓝 VI。
 * 【远期路线图】接入 feedback_event_stream 后，本页数据自动切换为真实闭环。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

interface WeightChange {
  suggestionType: string;
  oldWeight: number;
  newWeight: number;
  direction: 'boost' | 'dampen' | 'hold';
  adopted: number;
  rejected: number;
  adoptionRate: number | null;
}

interface ProcessImprovement {
  serviceStage: string;
  samples: number;
  avgSatisfaction: number;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

interface SafetyRuleUpdate {
  rule: string;
  errorCount: number;
  highSeverityCount: number;
  newStrictness: 'review' | 'enforce' | 'block';
  action: string;
}

interface QcStrengthening {
  dimension: string;
  incidents: number;
  totalDeduction: number;
  reinforcementLevel: number;
  action: string;
}

interface KnowledgeGap {
  channel: 'recommendation' | 'service' | 'safety' | 'qc';
  subject: string;
  severity: 'high' | 'medium' | 'low';
  evidence: string;
  suggestion: string;
}

interface LearningReport {
  period: { days: number; generatedAt: string };
  summary: {
    totalEvents: number;
    doctorDecisions: number;
    satisfactionSamples: number;
    medicalErrors: number;
    qcDeductionIncidents: number;
    autoActionsTaken: number;
    evolutionScore: number;
  };
  weights: WeightChange[];
  processImprovements: ProcessImprovement[];
  safetyRuleUpdates: SafetyRuleUpdate[];
  qcStrengthenings: QcStrengthening[];
  knowledgeGaps: KnowledgeGap[];
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

const DIR_TAG: Record<WeightChange['direction'], { color: string; label: string }> = {
  boost: { color: 'green', label: '升权 ↑' },
  dampen: { color: 'red', label: '降权 ↓' },
  hold: { color: 'default', label: '保持' },
};

const PRIORITY_COLOR: Record<string, string> = { high: 'red', medium: 'orange', low: 'default' };
const GAP_COLOR: Record<string, string> = { high: 'red', medium: 'orange', low: 'default' };
const CHANNEL_LABEL: Record<KnowledgeGap['channel'], string> = {
  recommendation: '推荐',
  service: '服务',
  safety: '安全',
  qc: '质控',
};

export default function AutoLearnPage() {
  const [data, setData] = useState<LearningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/auto-learn/report?days=7');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as LearningReport);
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
          全自学习闭环 · 系统自动进化报告
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          医生反馈→权重自调 · 患者满意度→流程自优化 · 医疗差错→规则自升级 · 质控扣分→薄弱环节自强化 · 每周自动进化，零人工调参
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总本周系统进化…" />
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

        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无自学习报告数据。" />
        )}

        {!loading && !error && data && summary && (
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
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>本周期反馈事件</div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: VI.deep }}>{summary.totalEvents}</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                      决策 {summary.doctorDecisions} · 满意度 {summary.satisfactionSamples} · 差错{' '}
                      {summary.medicalErrors} · 扣分 {summary.qcDeductionIncidents}
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>自动进化动作</div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: VI.accent }}>
                      {summary.autoActionsTaken}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>次（系统自动执行，未人工调参）</div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>自动进化成熟度</div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: VI.deep }}>{summary.evolutionScore}</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>/ 100（四通道各 25 分）</div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>知识缺口</div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: '#f5222d' }}>
                      {data.knowledgeGaps.length}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>项待系统补强</div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 权重调整留痕 */}
            <Card title="推荐权重自动调整留痕（医生采纳/拒绝 → 权重升降）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="suggestionType"
                pagination={false}
                dataSource={data.weights}
                locale={{ emptyText: '本周期无权重调整' }}
                columns={[
                  { title: '建议类型', dataIndex: 'suggestionType', width: 140 },
                  {
                    title: '方向',
                    dataIndex: 'direction',
                    width: 100,
                    render: (v: WeightChange['direction']) => (
                      <Tag color={DIR_TAG[v].color}>{DIR_TAG[v].label}</Tag>
                    ),
                  },
                  { title: '采纳 / 拒绝', render: (_: unknown, r: WeightChange) => `${r.adopted} / ${r.rejected}`, width: 110 },
                  {
                    title: '采纳率',
                    dataIndex: 'adoptionRate',
                    width: 90,
                    render: (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(0)}%`),
                  },
                  {
                    title: '权重变化',
                    render: (_: unknown, r: WeightChange) => (
                      <span style={{ color: VI.deep, fontWeight: 600 }}>
                        {r.oldWeight.toFixed(2)} → {r.newWeight.toFixed(2)}
                      </span>
                    ),
                  },
                ]}
              />
            </Card>

            {/* 四通道动作 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="患者满意度 → 服务流程自动优化" size="small">
                  {data.processImprovements.length === 0 && (
                    <div style={{ color: 'rgba(0,0,0,0.45)' }}>本周期各环节满意度均合格，无需优化</div>
                  )}
                  {data.processImprovements.map((p) => (
                    <div key={p.serviceStage} style={{ marginBottom: 12 }}>
                      <Tag color={PRIORITY_COLOR[p.priority]}>{p.serviceStage}</Tag>
                      <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                        均值 {p.avgSatisfaction.toFixed(2)}（{p.samples} 样本）
                      </span>
                      <div style={{ fontSize: 13, marginTop: 4 }}>{p.action}</div>
                    </div>
                  ))}
                </Card>
              </Col>
              <Col span={12}>
                <Card title="医疗差错 → 安全规则自动升级" size="small">
                  {data.safetyRuleUpdates.length === 0 && (
                    <div style={{ color: 'rgba(0,0,0,0.45)' }}>本周期无医疗差错事件</div>
                  )}
                  {data.safetyRuleUpdates.map((r) => (
                    <div key={r.rule} style={{ marginBottom: 12 }}>
                      <Tag color={r.newStrictness === 'block' ? 'red' : r.newStrictness === 'enforce' ? 'orange' : 'default'}>
                        {r.rule}
                      </Tag>
                      <div style={{ fontSize: 13, marginTop: 4 }}>{r.action}</div>
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>

            <Card title="质控扣分 → 薄弱环节自动强化" size="small" style={{ marginBottom: 16 }}>
              {data.qcStrengthenings.length === 0 && (
                <div style={{ color: 'rgba(0,0,0,0.45)' }}>本周期无质控扣分</div>
              )}
              {data.qcStrengthenings.map((q) => (
                <div key={q.dimension} style={{ marginBottom: 12 }}>
                  <Tag color={q.reinforcementLevel >= 3 ? 'red' : q.reinforcementLevel >= 2 ? 'orange' : 'blue'}>
                    {q.dimension} · L{q.reinforcementLevel}
                  </Tag>
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                    累计扣 {q.totalDeduction} 分 / {q.incidents} 起
                  </span>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{q.action}</div>
                </div>
              ))}
            </Card>

            {/* 知识缺口 */}
            <Card title="知识缺口诊断（系统还没学会的地方）" size="small">
              <Table
                rowKey={(r) => `${r.channel}-${r.subject}`}
                pagination={false}
                dataSource={data.knowledgeGaps}
                locale={{ emptyText: '未发现知识缺口，系统状态良好' }}
                columns={[
                  {
                    title: '严重度',
                    dataIndex: 'severity',
                    width: 90,
                    render: (v: KnowledgeGap['severity']) => <Tag color={GAP_COLOR[v]}>{v === 'high' ? '高' : v === 'medium' ? '中' : '低'}</Tag>,
                  },
                  { title: '通道', dataIndex: 'channel', width: 80, render: (v: KnowledgeGap['channel']) => CHANNEL_LABEL[v] },
                  { title: '缺口', dataIndex: 'subject', width: 220 },
                  { title: '证据', dataIndex: 'evidence' },
                  { title: '补强建议', dataIndex: 'suggestion' },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
