/**
 * 健澜科技 jlmedaios - 个人智能体成长报告页（M146-B · 让每个员工有成就感）
 *
 * 【越用越聪明深化】把 Personal Agent 给员工的正反馈可视化：
 *   经验沉淀（成功/失败）、AI 采纳率、技能标签变化、帮助同事、
 *   近 6 个月成长曲线（vs 3 月前）、成就徽章、同侪对比。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Layout,
  Progress,
  Row,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  TrophyOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const GOLD = '#faad14';
const GREEN = '#52c41a';
const RED = '#f5222d';

/* ------------------- 与 BFF GET /api/v1/user/muse/report 对齐 ------------------- */

interface ExperienceSummary {
  totalSuccess: number;
  totalFailure: number;
  total: number;
  lessonRate: number;
}
interface AiAdoption {
  suggested: number;
  accepted: number;
  rate: number;
}
interface SkillTagChange {
  current: string[];
  threeMonthsAgo: string[];
  added: string[];
  removed: string[];
}
interface GrowthPoint {
  month: string;
  score: number;
}
interface GrowthCurve {
  months: GrowthPoint[];
  currentScore: number;
  scoreThreeMonthsAgo: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
}
interface AchievementBadge {
  code: string;
  name: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
}
interface PersonalAgentReport {
  staffId: string;
  generatedAt: string;
  experience: ExperienceSummary;
  aiAdoption: AiAdoption;
  skillTags: SkillTagChange;
  helpedColleagues: number;
  growth: GrowthCurve;
  badges: AchievementBadge[];
  earnedBadgeCount: number;
}
interface PeerMetric {
  self: number;
  cohortAvg: number;
  delta: number;
  percentile: number;
  label: string;
}
interface PeerComparison {
  staffId: string;
  cohortSize: number;
  experienceTotal: PeerMetric;
  aiAdoptionRate: PeerMetric;
  helpedColleagues: PeerMetric;
  growthScore: PeerMetric;
  summary: string;
}
interface ReportResponse {
  staffId: string;
  report: PersonalAgentReport;
  comparison: PeerComparison;
}

/** 单张统计卡 */
function StatCard({
  label,
  value,
  suffix,
  accent,
  sub,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
  sub?: ReactNode;
}) {
  return (
    <Card style={{ borderTop: `3px solid ${accent}`, borderRadius: 8, height: '100%' }}>
      <Text type="secondary">{label}</Text>
      <div style={{ marginTop: 8 }}>
        <Title level={3} style={{ color: DEEP_BG, margin: 0 }}>
          {value}
          {suffix && (
            <Text style={{ fontSize: 13, color: 'rgba(10,37,64,0.55)', marginLeft: 4 }}>{suffix}</Text>
          )}
        </Title>
        {sub && <Text type="secondary" style={{ fontSize: 12 }}>{sub}</Text>}
      </div>
    </Card>
  );
}

export default function PersonalGrowthReportPage() {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<ReportResponse>('/user/muse/report', undefined, { silent: true });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '个人成长报告加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const report = data?.report;
  const comparison = data?.comparison;
  const months = useMemo(() => report?.growth.months ?? [], [report]);
  const isEmpty = !loading && !error && !report;

  /** 成长曲线 ECharts */
  const lineOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 24, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: months.map((m) => m.month),
      axisLabel: { color: 'rgba(10,37,64,0.7)' },
      axisLine: { lineStyle: { color: 'rgba(10,37,64,0.3)' } },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: 'rgba(10,37,64,0.65)' },
      splitLine: { lineStyle: { color: 'rgba(10,37,64,0.08)' } },
    },
    series: [
      {
        name: '成长分',
        type: 'line',
        smooth: true,
        data: months.map((m) => m.score),
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: ACCENT, width: 3 },
        itemStyle: { color: MID_BLUE },
        areaStyle: { color: 'rgba(74,144,217,0.18)' },
      },
    ],
  };

  const trendIcon =
    report?.growth.direction === 'up' ? (
      <RiseOutlined style={{ color: GREEN }} />
    ) : report?.growth.direction === 'down' ? (
      <FallOutlined style={{ color: RED }} />
    ) : (
      <MinusOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
    );

  const earnedBadges = report?.badges.filter((b) => b.earned) ?? [];
  const lockedBadges = report?.badges.filter((b) => !b.earned) ?? [];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: DEEP_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          我的成长 · MUSE 个人智能体
        </Title>
        <div>
          {report && (
            <Badge
              count={`已解锁 ${report.earnedBadgeCount} 枚徽章`}
              style={{ background: GOLD, marginRight: 12 }}
              overflowCount={99}
            />
          )}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            刷新
          </Button>
        </div>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error}
            action={
              <Button size="small" danger onClick={() => void load()}>
                重试
              </Button>
            }
          />
        )}

        {loading && !report ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="正在汇总你的成长轨迹…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无成长数据：多与 MUSE 协作、多沉淀一条经验，这里会自动长出你的成长曲线与徽章" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 概览统计卡 */}
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="经验沉淀（成功 / 失败）"
                value={`${report!.experience.totalSuccess} / ${report!.experience.totalFailure}`}
                suffix="条"
                accent={MID_BLUE}
                sub={`共 ${report!.experience.total} 条，教训占比 ${(report!.experience.lessonRate * 100).toFixed(0)}%`}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="AI 建议采纳率"
                value={`${(report!.aiAdoption.rate * 100).toFixed(0)}%`}
                accent={ACCENT}
                sub={`采纳 ${report!.aiAdoption.accepted} / 建议 ${report!.aiAdoption.suggested} 次`}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="帮助同事"
                value={`${report!.helpedColleagues}`}
                suffix="人次"
                accent={GREEN}
                sub="良师益友，教学相长"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="成长分（vs 3 月前）"
                value={`${report!.growth.currentScore}`}
                accent={GOLD}
                sub={
                  <span>
                    {trendIcon} 较 3 月前 {report!.growth.delta > 0 ? '+' : ''}
                    {report!.growth.delta}（3 月前 {report!.growth.scoreThreeMonthsAgo}）
                  </span>
                }
              />
            </Col>

            {/* 成长曲线 */}
            <Col xs={24} lg={14}>
              <Card title="近 6 个月成长曲线" style={{ borderRadius: 8 }}>
                <ReactECharts option={lineOption} style={{ height: 300 }} notMerge />
              </Card>
            </Col>

            {/* 技能标签变化 */}
            <Col xs={24} lg={10}>
              <Card title="技能标签变化（vs 3 月前）" style={{ borderRadius: 8, height: '100%' }}>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>新增标签</Text>
                  <div style={{ marginTop: 6 }}>
                    {report!.skillTags.added.length === 0 ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>暂无新增</Text>
                    ) : (
                      report!.skillTags.added.map((t) => (
                        <Tag color={GREEN} key={t} style={{ marginBottom: 4 }}>{t}</Tag>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>3 月前标签</Text>
                  <div style={{ marginTop: 6 }}>
                    {report!.skillTags.threeMonthsAgo.map((t) => (
                      <Tag key={t} style={{ marginBottom: 4 }}>{t}</Tag>
                    ))}
                  </div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>已退出标签</Text>
                  <div style={{ marginTop: 6 }}>
                    {report!.skillTags.removed.length === 0 ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>暂无退出</Text>
                    ) : (
                      report!.skillTags.removed.map((t) => (
                        <Tag color={RED} key={t} style={{ marginBottom: 4 }}>{t}</Tag>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </Col>

            {/* 成就徽章 */}
            <Col xs={24}>
              <Card
                title={
                  <span>
                    <TrophyOutlined style={{ color: GOLD, marginRight: 8 }} />
                    成就徽章（已解锁 {earnedBadges.length} / {report!.badges.length}）
                  </span>
                }
                style={{ borderRadius: 8 }}
              >
                <Row gutter={[12, 12]}>
                  {report!.badges.map((b) => (
                    <Col xs={12} sm={8} lg={4} key={b.code}>
                      <Card
                        size="small"
                        style={{
                          textAlign: 'center',
                          borderRadius: 8,
                          background: b.earned ? 'linear-gradient(135deg, #E6F0FA 0%, #FFFFFF 100%)' : '#fafafa',
                          border: b.earned ? `1px solid ${ACCENT}` : '1px dashed #d9d9d9',
                        }}
                      >
                        <TrophyOutlined
                          style={{ fontSize: 28, color: b.earned ? GOLD : 'rgba(0,0,0,0.2)' }}
                        />
                        <div style={{ marginTop: 8, fontWeight: 600, color: b.earned ? DEEP_BG : 'rgba(0,0,0,0.35)' }}>
                          {b.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 4, minHeight: 32 }}>
                          {b.description}
                        </div>
                        {b.earned && b.earnedAt && (
                          <Tag color={GOLD} style={{ marginTop: 6 }}>{b.earnedAt} 解锁</Tag>
                        )}
                      </Card>
                    </Col>
                  ))}
                </Row>
                {lockedBadges.length > 0 && (
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'inline-block' }}>
                    继续使用 MUSE、多沉淀经验，即可解锁剩余 {lockedBadges.length} 枚徽章。
                  </Text>
                )}
              </Card>
            </Col>

            {/* 同侪对比 */}
            {comparison && (
              <Col xs={24}>
                <Card
                  title={
                    <span>
                      <TeamOutlined style={{ color: MID_BLUE, marginRight: 8 }} />
                      同侪对比（{comparison.cohortSize} 人样本，仅展示均值与分位）
                    </span>
                  }
                  style={{ borderRadius: 8 }}
                >
                  <Row gutter={[16, 16]}>
                    {[
                      { title: '经验沉淀', metric: comparison.experienceTotal, max: Math.max(40, comparison.experienceTotal.self + 10) },
                      { title: 'AI 采纳率', metric: comparison.aiAdoptionRate, max: 1 },
                      { title: '帮助同事', metric: comparison.helpedColleagues, max: Math.max(15, comparison.helpedColleagues.self + 5) },
                      { title: '成长分', metric: comparison.growthScore, max: 100 },
                    ].map(({ title, metric, max }) => (
                      <Col xs={24} sm={12} key={title}>
                        <Card size="small">
                          <Text strong style={{ color: DEEP_BG }}>{title}</Text>
                          <div style={{ marginTop: 8 }}>
                            <Progress
                              percent={Math.round((metric.self / max) * 100)}
                              strokeColor={ACCENT}
                              format={() => `${metric.self}`}
                            />
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            同侪均值 {metric.cohortAvg} · {metric.label}（分位 {metric.percentile}）
                          </Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <Alert
                    style={{ marginTop: 12 }}
                    type="info"
                    showIcon
                    message={comparison.summary}
                  />
                </Card>
              </Col>
            )}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
