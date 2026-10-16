/**
 * 健澜科技 jlmedaios - Doctor MUSE 医生个人智能体页面（M169-B）
 *
 * 知识图谱与Personal Agent：
 *   医生个人经验智能体——把本人沉淀的诊断思维 / 用药经验 / 手术决策 / 患者沟通
 *   四类经验可视化为画像卡 + 场景化推荐 + 同行聚合对比。
 *
 * 隐私：仅展示本人经验与同行聚合统计，不公开任何同行或患者隐私。
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Layout,
  List,
  Row,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  ReloadOutlined,
  SafetyOutlined,
  WarningOutlined,
  BulbOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { get } from '@/services/request';
import { useAuthStore } from '@/store/authStore';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const GREEN = '#52c41a';
const RED = '#f5222d';
const ORANGE = '#faad14';

/* ------------------------------------------------------------------ */
/* 与 BFF GET /api/v1/doctor/muse/:staffId 响应 data 对齐             */
/* ------------------------------------------------------------------ */

type Category = 'diagnosis' | 'medication' | 'surgery' | 'communication';
type Outcome = 'success' | 'failure' | 'reflection';

interface TagCount {
  tag: string;
  count: number;
}
interface FrequentItem {
  name: string;
  count: number;
}
interface DiagnosisSink {
  successCases: number;
  failureCases: number;
  reflections: number;
}
interface MedicationSink {
  commonDrugs: FrequentItem[];
  adverseReactions: string[];
}
interface SurgerySink {
  procedures: FrequentItem[];
  intraOpJudgments: string[];
  postOpManagement: string[];
}
interface CommunicationSink {
  techniques: FrequentItem[];
  feedback: string[];
  improvements: string[];
}
interface Profile {
  staffId: string;
  totalExperiences: number;
  categoryCounts: Record<Category, number>;
  outcomeCounts: Record<Outcome, number>;
  successRate: number;
  topTags: TagCount[];
  diagnosis: DiagnosisSink;
  medication: MedicationSink;
  surgery: SurgerySink;
  communication: CommunicationSink;
  privacyNotice: string;
}
interface Recommendation {
  kind: 'warning' | 'reinforce' | 'reflection';
  category: Category;
  title: string;
  reason: string;
  score: number;
}
interface PeerAggregate {
  label: string;
  totalExperiences: number;
  successRate: number;
  categoryCounts: Record<Category, number>;
}
interface PeerComparison {
  self: {
    staffId: string;
    totalExperiences: number;
    successRate: number;
    categoryCounts: Record<Category, number>;
  };
  peerMedian: PeerAggregate;
  peerP75: PeerAggregate;
  gaps: {
    dimension: Category;
    selfCount: number;
    peerMedian: number;
    delta: number;
    advice: string;
  }[];
  privacyNote: string;
}
interface MuseData {
  demo: boolean;
  staffId: string;
  profile: Profile;
  recommendations: Recommendation[];
  peerComparison: PeerComparison;
}

const CATEGORY_LABEL: Record<Category, string> = {
  diagnosis: '诊断思维',
  medication: '用药经验',
  surgery: '手术决策',
  communication: '患者沟通',
};

/** 单张统计卡 */
function StatCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
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
      </div>
    </Card>
  );
}

/** 推荐条目图标配色 */
function kindMeta(kind: Recommendation['kind']) {
  if (kind === 'warning')
    return { icon: <WarningOutlined />, color: RED, label: '失败警示' };
  if (kind === 'reflection')
    return { icon: <BulbOutlined />, color: ORANGE, label: '反思提示' };
  return { icon: <SafetyOutlined />, color: GREEN, label: '成功复用' };
}

export default function DoctorMusePage() {
  // 默认看本人；带教场景可 ?staffId=xxx 查看同事（只读聚合，不公开案例）
  const currentId = useAuthStore((s) => s.user?.id ?? '');
  const targetStaffId =
    new URLSearchParams(window.location.search).get('staffId')?.trim() || currentId || 'demo';

  const [data, setData] = useState<MuseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<MuseData>(
        `/doctor/muse/${encodeURIComponent(targetStaffId)}`,
        undefined,
        { silent: true },
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Doctor MUSE 个人智能体加载失败');
    } finally {
      setLoading(false);
    }
  }, [targetStaffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const profile = data?.profile;
  const recommendations = useMemo(() => data?.recommendations ?? [], [data]);
  const peer = data?.peerComparison;
  const isEmpty = !loading && !error && !profile;

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
          Doctor MUSE · 我的个人医生智能体
        </Title>
        <div>
          {data?.demo && (
            <Badge count="演示数据" style={{ background: '#faad14', marginRight: 12 }} overflowCount={99} />
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

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="正在汇总我的经验图谱…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无经验沉淀：完成第一例诊断/用药/手术/沟通复盘后，这里会自动形成你的个人智能体" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 顶部概览 */}
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="沉淀经验总数"
                value={String(profile?.totalExperiences ?? 0)}
                suffix="条"
                accent={DEEP_BG}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="本人成功率"
                value={(((profile?.successRate ?? 0) * 100).toFixed(0))}
                suffix="%"
                accent={MID_BLUE}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="失败警示"
                value={String(profile?.outcomeCounts.failure ?? 0)}
                suffix="条"
                accent={RED}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="反思复盘"
                value={String(profile?.outcomeCounts.reflection ?? 0)}
                suffix="条"
                accent={ORANGE}
              />
            </Col>

            {/* 四维经验沉淀 */}
            <Col xs={24} lg={6}>
              <Card title="诊断思维" bordered={false} style={{ borderRadius: 8 }}>
                <Paragraph type="secondary">
                  成功 {profile?.diagnosis.successCases ?? 0} · 失败 {profile?.diagnosis.failureCases ?? 0} ·
                  反思 {profile?.diagnosis.reflections ?? 0}
                </Paragraph>
                {(profile?.topTags ?? [])
                  .filter((t) => /心|鉴别|胸痛/.test(t.tag))
                  .map((t) => (
                    <Tag key={t.tag} color={MID_BLUE}>
                      {t.tag} ×{t.count}
                    </Tag>
                  ))}
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card title="用药经验" bordered={false} style={{ borderRadius: 8 }}>
                <Paragraph type="secondary">常用药 Top：</Paragraph>
                {(profile?.medication.commonDrugs ?? []).map((d) => (
                  <div key={d.name}>
                    <Text strong>{d.name}</Text>
                    <Text type="secondary"> ×{d.count}</Text>
                  </div>
                ))}
                {(profile?.medication.adverseReactions ?? []).slice(0, 2).map((a) => (
                  <Tag key={a} color="red" icon={<WarningOutlined />} style={{ marginTop: 8 }}>
                    {a}
                  </Tag>
                ))}
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card title="手术决策" bordered={false} style={{ borderRadius: 8 }}>
                <Paragraph type="secondary">术式 Top：</Paragraph>
                {(profile?.surgery.procedures ?? []).map((p) => (
                  <div key={p.name}>
                    <Text strong>{p.name}</Text>
                    <Text type="secondary"> ×{p.count}</Text>
                  </div>
                ))}
                {(profile?.surgery.intraOpJudgments ?? []).slice(0, 1).map((j) => (
                  <Text key={j} type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    术中判断：{j}
                  </Text>
                ))}
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card title="患者沟通" bordered={false} style={{ borderRadius: 8 }}>
                <Paragraph type="secondary">常用技巧：</Paragraph>
                {(profile?.communication.techniques ?? []).map((t) => (
                  <Tag key={t.name} color={ACCENT}>
                    {t.name} ×{t.count}
                  </Tag>
                ))}
                {(profile?.communication.improvements ?? []).slice(0, 1).map((i) => (
                  <Text key={i} type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    改进点：{i}
                  </Text>
                ))}
              </Card>
            </Col>

            {/* 基于本人经验的推荐 */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span>
                    <SafetyOutlined style={{ color: MID_BLUE, marginRight: 8 }} />
                    我的经验推荐（仅基于本人沉淀）
                  </span>
                }
                bordered={false}
                style={{ borderRadius: 8 }}
              >
                <List
                  dataSource={recommendations}
                  locale={{ emptyText: '暂无相关经验，先沉淀 1~2 例典型案例' }}
                  renderItem={(r) => {
                    const m = kindMeta(r.kind);
                    return (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<span style={{ color: m.color, fontSize: 18 }}>{m.icon}</span>}
                          title={
                            <span>
                              <Tag color={m.color}>{m.label}</Tag>
                              <Tag>{CATEGORY_LABEL[r.category]}</Tag>
                              {r.title}
                            </span>
                          }
                          description={
                            <span>
                              {r.reason}
                              <Text type="secondary" style={{ marginLeft: 8 }}>
                                命中分 {r.score.toFixed(2)}
                              </Text>
                            </span>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              </Card>
            </Col>

            {/* 同行对比（聚合统计） */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span>
                    <TeamOutlined style={{ color: MID_BLUE, marginRight: 8 }} />
                    与同行对比（仅聚合统计）
                  </span>
                }
                bordered={false}
                style={{ borderRadius: 8 }}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <StatCard label="本人总数" value={String(peer?.self.totalExperiences ?? 0)} accent={DEEP_BG} />
                  </Col>
                  <Col span={8}>
                    <StatCard label="同行中位数" value={String(peer?.peerMedian.totalExperiences ?? 0)} accent={MID_BLUE} />
                  </Col>
                  <Col span={8}>
                    <StatCard label="同行 P75" value={String(peer?.peerP75.totalExperiences ?? 0)} accent={ACCENT} />
                  </Col>
                </Row>
                <List
                  style={{ marginTop: 16 }}
                  dataSource={peer?.gaps ?? []}
                  renderItem={(g) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <span>
                            {CATEGORY_LABEL[g.dimension]}
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              本人 {g.selfCount} / 中位 {g.peerMedian}（{g.delta >= 0 ? '+' : ''}
                              {g.delta}）
                            </Text>
                          </span>
                        }
                        description={g.advice}
                      />
                    </List.Item>
                  )}
                />
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 8 }}
                  message={peer?.privacyNote ?? '同行对比仅使用岗位级聚合统计'}
                />
              </Card>
            </Col>

            {/* 隐私声明 */}
            <Col span={24}>
              <Alert
                type="success"
                showIcon
                message={profile?.privacyNotice ?? '本画像仅沉淀本人脱敏经验，不公开任何同行或患者隐私'}
              />
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
