/**
 * 健澜科技 jlmedaios - M178-D 党建与文化深化页（仅 admin，医院管理深化）
 *
 * 【财务人力行政党建】党建文化要务实，不能形式主义。
 * 展示 GET /api/v1/party/culture 返回的深度党建文化看板：
 *   - 院训 / 医院精神（文化锚点）；
 *   - 管理四维度：党建工作 / 工会工作 / 医德医风 / 医院文化，
 *     各维度已组织活动数、形式主义风险数、子项覆盖；
 *   - 反形式主义预警：议程过简、应到不足、无落地事项的活动标红提醒；
 *   - 医德考评等次分布（查实违规一票否决，不搞人人优秀）；
 *   - 医院文化活动问效：人均成本、满意度，不数场次。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Layout, List, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF partyCultureAggregator 输出对齐 */
type CulturePillar = '党建工作' | '工会工作' | '医德医风' | '医院文化';

interface PillarStat {
  name: CulturePillar;
  activityCount: number;
  riskCount: number;
  coveredTopics: string[];
}
interface DeepPartyCulture {
  updatedAt: string;
  motto: string;
  spirit: string;
  pillars: {
    partyBuilding: PillarStat;
    union: PillarStat;
    medicalEthics: PillarStat;
    hospitalCulture: PillarStat;
  };
  activitiesOrganized: number;
  activitiesNeedingImprovement: number;
  cultureEventsTracked: number;
  ethicsEvaluated: number;
  ethicsGradeDistribution: Record<'A' | 'B' | 'C' | 'D', number>;
}
interface OrganizedActivity {
  id: string;
  pillar: CulturePillar;
  topic: string;
  themeType: string;
  plannedDate: string;
  location: string;
  hostId: string;
  expectedAttendees: number;
  agendaNotes: string;
  formalRiskFlags: string[];
  actionItems: string[];
  status: 'organized' | 'needsImprovement';
}
interface CultureEvent {
  id: string;
  name: string;
  category: string;
  eventDate: string;
  organizer: string;
  plannedReach: number;
  actualReach: number;
  budget: number;
  actualSpend: number;
  satisfaction: number | null;
  outcomeSummary: string;
  status: 'planned' | 'executing' | 'closed';
  costPerReach: number | null;
}
interface CultureView {
  culture: DeepPartyCulture;
  activities: OrganizedActivity[];
  cultureEvents: CultureEvent[];
}

/** 深海蓝 VI 色板 */
const VI = { deep: '#0a2540', mid: '#123a5e', accent: '#1e6fbf', bg: '#f5f7fa' };

const GRADE_COLOR: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'green',
  B: 'blue',
  C: 'gold',
  D: 'red',
};
const GRADE_LABEL: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: '优秀',
  B: '良好',
  C: '合格',
  D: '不合格',
};

export default function PartyCulturePage() {
  const [data, setData] = useState<CultureView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/party/culture');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as CultureView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const culture = data?.culture;
  const pillarList = culture
    ? [culture.pillars.partyBuilding, culture.pillars.union, culture.pillars.medicalEthics, culture.pillars.hospitalCulture]
    : [];
  const riskyActivities = (data?.activities ?? []).filter((a) => a.status === 'needsImprovement');

  const eventColumns: ColumnsType<CultureEvent> = [
    { title: '日期', dataIndex: 'eventDate', width: 110 },
    { title: '文化活动', dataIndex: 'name' },
    { title: '类别', dataIndex: 'category', width: 100, render: (c: string) => <Tag color="cyan">{c}</Tag> },
    { title: '覆盖', dataIndex: 'actualReach', width: 90, align: 'right', render: (v: number) => `${v} 人` },
    {
      title: '人均成本', dataIndex: 'costPerReach', width: 110, align: 'right',
      render: (v: number | null) => (v == null ? '—' : `¥${v.toFixed(2)}/人`),
    },
    {
      title: '满意度', dataIndex: 'satisfaction', width: 90, align: 'right',
      render: (v: number | null) => (v == null ? '—' : `${v} 分`),
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: CultureEvent['status']) =>
        s === 'closed' ? <Tag color="green">已问效</Tag> : s === 'executing' ? <Tag color="blue">进行中</Tag> : <Tag>计划中</Tag>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>党建与文化深化</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.78)', margin: '8px 0 0' }}>
          党建工作 · 工会工作 · 医德医风 · 医院文化 —— 务实留痕，反形式主义，不数场次问实效
        </Paragraph>
      </div>

      <Content style={{ padding: 24 }}>
        {loading && <Spin style={{ width: '100%', marginTop: 80 }} />}
        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        {culture && (
          <>
            {/* 院训 / 医院精神 */}
            <Card style={{ marginBottom: 16, borderLeft: `4px solid ${VI.accent}` }}>
              <Row gutter={24}>
                <Col span={12}>
                  <Text type="secondary">院训</Text>
                  <div style={{ fontSize: 20, fontWeight: 600, color: VI.deep }}>{culture.motto}</div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">医院精神</Text>
                  <div style={{ fontSize: 20, fontWeight: 600, color: VI.deep }}>{culture.spirit}</div>
                </Col>
              </Row>
            </Card>

            {/* 总览统计 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card><Statistic title="已组织活动" value={culture.activitiesOrganized} /></Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="形式主义风险（需整改）" value={culture.activitiesNeedingImprovement}
                    valueStyle={{ color: culture.activitiesNeedingImprovement > 0 ? '#d48806' : '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="文化活动跟踪" value={culture.cultureEventsTracked} /></Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="医德考评（人）" value={culture.ethicsEvaluated} /></Card>
              </Col>
            </Row>

            {/* 四维度 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {pillarList.map((p) => (
                <Col span={6} key={p.name}>
                  <Card
                    title={p.name} size="small"
                    headStyle={{ background: '#f0f5fb', color: VI.deep }}
                  >
                    <Statistic title="已组织活动" value={p.activityCount} />
                    <div style={{ marginTop: 8 }}>
                      形式主义风险：
                      <Text type={p.riskCount > 0 ? 'danger' : 'secondary'} strong>{p.riskCount}</Text>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">子项覆盖：</Text>
                      <div style={{ marginTop: 4 }}>
                        {p.coveredTopics.length === 0
                          ? <Text type="secondary">暂无动作</Text>
                          : p.coveredTopics.map((t) => <Tag key={t} style={{ marginBottom: 4 }}>{t}</Tag>)}
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 反形式主义预警 */}
            {riskyActivities.length > 0 && (
              <Alert
                type="warning" showIcon style={{ marginBottom: 16 }}
                message={`${riskyActivities.length} 场活动存在形式主义风险，整改后再办`}
                description={
                  <List
                    size="small"
                    dataSource={riskyActivities}
                    renderItem={(a) => (
                      <List.Item>
                        <Text strong>{a.topic}</Text>
                        <Text type="secondary">（{a.plannedDate} · {a.themeType}）</Text>
                        <div>
                          {a.formalRiskFlags.map((f) => (
                            <Tag key={f} color="orange" style={{ marginTop: 4 }}>{f}</Tag>
                          ))}
                        </div>
                      </List.Item>
                    )}
                  />
                }
              />
            )}

            {/* 医德考评等次分布 */}
            <Card title="医德考评等次分布（查实违规一票否决，不搞人人优秀）" size="small" style={{ marginBottom: 16 }}>
              <Row>
                {(['A', 'B', 'C', 'D'] as const).map((g) => (
                  <Col span={6} key={g}>
                    <Statistic
                      title={`${g} · ${GRADE_LABEL[g]}`}
                      value={culture.ethicsGradeDistribution[g]}
                      valueStyle={{
                        color: GRADE_COLOR[g] === 'green' ? '#3f8600'
                          : GRADE_COLOR[g] === 'blue' ? '#1890ff'
                          : GRADE_COLOR[g] === 'gold' ? '#d48806' : '#cf1322',
                      }}
                    />
                  </Col>
                ))}
              </Row>
            </Card>

            {/* 文化活动问效 */}
            <Card title="医院文化活动跟踪（问效：覆盖人数 / 人均成本 / 满意度，不数场次）" size="small">
              <Table
                rowKey="id" size="small" pagination={false}
                columns={eventColumns} dataSource={data?.cultureEvents ?? []}
                locale={{ emptyText: '暂无文化活动跟踪记录' }}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
