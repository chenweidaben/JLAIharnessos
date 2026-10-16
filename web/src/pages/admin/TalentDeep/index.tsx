/**
 * 健澜科技 jlmedaios - M166-B 医院人才管理深化页（管理驾驶舱，仅 admin）
 *
 * 【绩效与人才·核心主张】人才管理要发展人，不是监控人：
 *   - 人才画像：技能 / 证书 / 培训 / 绩效 / 潜力，五维折叠成人才分；
 *   - 人才梯队：继任就绪 / 骨干 / 后备 / 普通，看清谁该被培养，不是排队挨盯；
 *   - 技能缺口 → 培训计划：缺口是学习方向，给「学什么、学多久、多紧急」；
 *   - 关键岗位继任者：按 绩效+潜力+技能匹配 综合打分，防断层。
 *
 * 三态：loading / error（可重试）/ empty（无样本，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Segmented, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type TalentTier = 'successor_ready' | 'backbone' | 'backup' | 'ordinary';
type GapSeverity = 'high' | 'medium' | 'low';

interface InventoryItem {
  staffId: string;
  name: string;
  title: string;
  tier: TalentTier;
  talentScore: number;
  skillCount: number;
  certificateCount: number;
  trainingCount: number;
}

interface TalentInventory {
  dept: string;
  generatedAt: string;
  total: number;
  items: InventoryItem[];
  tiers: Record<TalentTier, number>;
  summary: { avgPerformance: number; avgPotential: number; readinessRate: number };
}

interface SkillGap {
  skill: string;
  requiredCoverage: number;
  currentCoverage: number;
  shortage: number;
  severity: GapSeverity;
}

interface TrainingRecommendation {
  skill: string;
  course: string;
  hours: number;
  priority: GapSeverity;
}

interface SuccessorCandidate {
  staffId: string;
  name: string;
  title: string;
  score: number;
  skillMatch: number;
  readiness: 'ready' | 'one_to_two_year' | 'three_plus_year';
}

interface SuccessorResult {
  position: string;
  recommended: SuccessorCandidate | null;
  candidates: SuccessorCandidate[];
}

interface InventoryResponse {
  inventory: TalentInventory;
  gaps: SkillGap[];
  trainingPlan: TrainingRecommendation[];
  successors: SuccessorResult | null;
  demo: boolean;
  dept: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const TIER_META: Record<TalentTier, { label: string; color: string }> = {
  successor_ready: { label: '继任就绪', color: 'green' },
  backbone: { label: '科室骨干', color: 'blue' },
  backup: { label: '后备力量', color: 'cyan' },
  ordinary: { label: '在岗胜任', color: 'default' },
};

const SEVERITY_META: Record<GapSeverity, { label: string; color: string }> = {
  high: { label: '高', color: 'red' },
  medium: { label: '中', color: 'orange' },
  low: { label: '低', color: 'default' },
};

const READINESS_META: Record<SuccessorCandidate['readiness'], { label: string; color: string }> = {
  ready: { label: '可即刻接任', color: 'green' },
  one_to_two_year: { label: '1-2 年培养', color: 'blue' },
  three_plus_year: { label: '3 年+成长', color: 'default' },
};

const DEPT_OPTIONS = [
  { label: '心内科', value: 'IN' },
  { label: '普外科', value: 'SU' },
  { label: '护理部', value: 'NU' },
];

export default function TalentDeepPage() {
  const [dept, setDept] = useState<string>('IN');
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/v1/admin/talent/inventory?dept=${encodeURIComponent(d)}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as InventoryResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(dept);
  }, [dept, load]);

  const inv = data?.inventory;
  const isEmpty = !inv;

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
          人才管理深化 · 人才盘点
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 仅 admin 可见 · 人才管理要发展人，不是监控人
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 科室切换 */}
        <div style={{ marginBottom: 16 }}>
          <Segmented options={DEPT_OPTIONS} value={dept} onChange={(v) => setDept(String(v))} />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总科室人才画像…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => load(dept)}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && isEmpty && (
          <Alert
            type="info"
            showIcon
            message="暂无人才画像样本。接入 HR/HRP 员工技能、证书、培训与绩效数据后将自动成盘。"
          />
        )}

        {!loading && !error && inv && (
          <>
            {data?.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示模式数据：尚未接入真实 HR 画像，页面仅用于演示「发展人」式人才盘点效果。"
              />
            )}

            {/* 结论横幅 */}
            <Card
              style={{ marginBottom: 16, borderLeft: `4px solid ${VI.accent}` }}
            >
              <Text strong style={{ fontSize: 16, color: VI.deep }}>
                {inv.dept} 人才盘点：共 {inv.total} 人，继任就绪 {inv.tiers.successor_ready} 人，
                骨干 {inv.tiers.backbone} 人，后备 {inv.tiers.backup} 人。
              </Text>
              <div style={{ marginTop: 8 }}>
                <Tag color="green">继任就绪率 {(inv.summary.readinessRate * 100).toFixed(0)}%</Tag>
                <Tag color="blue">平均绩效 {inv.summary.avgPerformance.toFixed(1)}</Tag>
                <Tag color="geekblue">平均潜力 {inv.summary.avgPotential.toFixed(1)}</Tag>
              </div>
            </Card>

            {/* 四档梯队卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {(Object.keys(TIER_META) as TalentTier[]).map((t) => (
                <Col span={6} key={t}>
                  <Card>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{TIER_META[t].label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: VI.deep }}>
                        {inv.tiers[t]}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
                        {inv.total === 0 ? 0 : Math.round((inv.tiers[t] / inv.total) * 100)}% 人员
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 人才画像表 */}
            <Card title="人才画像（绩效 60% + 潜力 40% → 人才分，按分降序）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="staffId"
                pagination={false}
                dataSource={inv.items}
                size="small"
                columns={[
                  { title: '姓名', dataIndex: 'name', width: 100 },
                  { title: '职称', dataIndex: 'title', width: 120 },
                  {
                    title: '人才分',
                    dataIndex: 'talentScore',
                    width: 180,
                    render: (v: number) => <Progress percent={v} size="small" style={{ width: 140 }} />,
                  },
                  {
                    title: '梯队',
                    dataIndex: 'tier',
                    width: 110,
                    render: (v: TalentTier) => <Tag color={TIER_META[v].color}>{TIER_META[v].label}</Tag>,
                  },
                  { title: '技能数', dataIndex: 'skillCount', width: 80 },
                  { title: '持证数', dataIndex: 'certificateCount', width: 80 },
                  { title: '在训数', dataIndex: 'trainingCount', width: 80 },
                ]}
              />
            </Card>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              {/* 技能缺口 */}
              <Col span={12}>
                <Card title="技能缺口（缺口是培养方向，不是扣分项）" style={{ height: '100%' }}>
                  <Table
                    rowKey="skill"
                    pagination={false}
                    dataSource={data?.gaps ?? []}
                    size="small"
                    locale={{ emptyText: '岗位技能已全覆盖，暂无缺口' }}
                    columns={[
                      { title: '所需技能', dataIndex: 'skill' },
                      {
                        title: '覆盖',
                        width: 90,
                        render: (_: unknown, r: SkillGap) => `${r.currentCoverage}/${r.requiredCoverage}`,
                      },
                      {
                        title: '缺口',
                        dataIndex: 'shortage',
                        width: 70,
                        render: (v: number) => (v > 0 ? <Text strong type="danger">{v}</Text> : '—'),
                      },
                      {
                        title: '严重度',
                        dataIndex: 'severity',
                        width: 80,
                        render: (v: GapSeverity) => <Tag color={SEVERITY_META[v].color}>{SEVERITY_META[v].label}</Tag>,
                      },
                    ]}
                  />
                </Card>
              </Col>

              {/* 关键岗位继任者 */}
              <Col span={12}>
                <Card
                  title={data?.successors ? `关键岗位继任：${data.successors.position}` : '关键岗位继任者'}
                  style={{ height: '100%' }}
                >
                  {data?.successors?.recommended ? (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong style={{ color: VI.deep, fontSize: 16 }}>
                          推荐继任：{data.successors.recommended.name}（{data.successors.recommended.title}）
                        </Text>
                        <div style={{ marginTop: 6 }}>
                          <Tag color={READINESS_META[data.successors.recommended.readiness].color}>
                            {READINESS_META[data.successors.recommended.readiness].label}
                          </Tag>
                          <Tag color="blue">综合分 {data.successors.recommended.score.toFixed(1)}</Tag>
                          <Tag color="geekblue">
                            技能匹配 {(data.successors.recommended.skillMatch * 100).toFixed(0)}%
                          </Tag>
                        </div>
                      </div>
                      <Table
                        rowKey="staffId"
                        pagination={false}
                        dataSource={data.successors.candidates}
                        size="small"
                        columns={[
                          { title: '候选人', dataIndex: 'name', width: 100 },
                          { title: '综合分', dataIndex: 'score', width: 80 },
                          {
                            title: '就绪度',
                            dataIndex: 'readiness',
                            width: 120,
                            render: (v: SuccessorCandidate['readiness']) => (
                              <Tag color={READINESS_META[v].color}>{READINESS_META[v].label}</Tag>
                            ),
                          },
                        ]}
                      />
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.45)', padding: 40 }}>
                      暂无候选继任者，需纳入后备培养
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {/* 培训计划 */}
            <Card title="培训计划（基于技能缺口：学什么 / 学多久 / 多紧急）">
              <Table
                rowKey={(r) => `${r.skill}-${r.course}`}
                pagination={false}
                dataSource={data?.trainingPlan ?? []}
                size="small"
                locale={{ emptyText: '当前无待补技能，暂无培训计划' }}
                columns={[
                  { title: '补短板技能', dataIndex: 'skill', width: 160 },
                  { title: '建议课程', dataIndex: 'course' },
                  { title: '学时', dataIndex: 'hours', width: 80 },
                  {
                    title: '优先级',
                    dataIndex: 'priority',
                    width: 90,
                    render: (v: GapSeverity) => <Tag color={SEVERITY_META[v].color}>{SEVERITY_META[v].label}</Tag>,
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
