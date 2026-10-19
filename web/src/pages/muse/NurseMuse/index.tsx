/**
 * 健澜科技 jlmedaios - 护士个人智能体页（M169-C）
 *
 * 知识图谱与Personal Agent：让护士看到自己沉淀的经验如何变成
 * 「越用越懂我」的个人智能体——
 *   顶部深海蓝条带 + 隐私承诺（只看本人经验，不公开他人经验）；
 *   四张 KPI 卡：累计沉淀 / 风险闭环率 / 好评率 / 最近活动；
 *   四类经验分布：护理风险 / 交班经验 / 护理技巧 / 满意度；
 *   护理推荐：结合患者上下文从本人经验库召回的可复用建议；
 *   成长跟踪：月度沉淀柱状 + 里程碑 + 下周期聚焦建议。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';

type Category = 'risk' | 'handoff' | 'skill' | 'satisfaction';

const CATEGORY_LABEL: Record<Category, string> = {
  risk: '护理风险沉淀',
  handoff: '交班经验沉淀',
  skill: '护理技巧沉淀',
  satisfaction: '患者满意度沉淀',
};

const CATEGORY_COLOR: Record<Category, string> = {
  risk: '#cf1322',
  handoff: '#faad14',
  skill: MID_BLUE,
  satisfaction: '#52c41a',
};

interface HandoffHighlight {
  at: string;
  subType: string;
  title: string;
  dept: string | null;
}
interface SkillTag {
  tag: string;
  count: number;
}
interface NurseMuseProfile {
  staffId: string;
  totalExperiences: number;
  byCategory: Record<Category, number>;
  riskClosure: {
    hazardsIdentified: number;
    preventiveActions: number;
    closedLoops: number;
    closureRate: number;
  };
  handoffHighlights: HandoffHighlight[];
  skillStrengths: SkillTag[];
  satisfaction: { praise: number; complaint: number; improvement: number; praiseRate: number };
  privacy: { privateCount: number; deptSharedCount: number; notice: string };
  lastActivityAt: string | null;
}
interface NurseCareRec {
  rank: number;
  sourceId: string;
  category: Category;
  subType: string;
  title: string;
  detail: string;
  dept: string | null;
  score: number;
  reason: string;
}
interface GrowthPoint {
  month: string;
  total: number;
  risk: number;
  handoff: number;
  skill: number;
  satisfaction: number;
}
interface GrowthReport {
  staffId: string;
  totalInPeriod: number;
  monthly: GrowthPoint[];
  categoryDistribution: Record<Category, number>;
  riskClosureRate: number;
  satisfactionTrend: 'up' | 'down' | 'flat';
  milestones: string[];
  focusArea: string;
}
interface NurseMusePageData {
  demo: boolean;
  staffId: string;
  privacyNotice: string;
  profile: NurseMuseProfile;
  recommendations: NurseCareRec[];
  growth: GrowthReport;
}

/** 单张 KPI 卡 */
function KpiCard({
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
  sub?: string;
}) {
  return (
    <Card style={{ borderTop: `3px solid ${accent}`, borderRadius: 8, height: '100%' }} bodyStyle={{ padding: 20 }}>
      <Text type="secondary">{label}</Text>
      <div style={{ marginTop: 8 }}>
        <Title level={2} style={{ color: DEEP_BG, margin: 0 }}>
          {value}
          {suffix && <Text style={{ fontSize: 14, color: 'rgba(10,37,64,0.55)', marginLeft: 4 }}>{suffix}</Text>}
        </Title>
        {sub && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {sub}
          </Text>
        )}
      </div>
    </Card>
  );
}

export default function NurseMusePage() {
  const [data, setData] = useState<NurseMusePageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<NurseMusePageData>('/nurse/muse/me', undefined, { silent: true });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '护士个人智能体加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const profile = data?.profile;
  const growth = data?.growth;
  const monthlyMax = Math.max(1, ...(growth?.monthly ?? []).map((m) => m.total));
  const isEmpty = !!data && (profile?.totalExperiences ?? 0) === 0;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          我的护士智能体
        </Title>
        <div>
          {data?.demo && <Badge count="演示数据" style={{ background: '#faad14', marginRight: 12 }} overflowCount={99} />}
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
            <Spin size="large" tip="加载我的护士智能体…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无沉淀经验：记录第一次不良事件 / 交班要点 / 操作技巧后，这里会生长出你的个人知识图谱" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 个人条带 */}
            <Col span={24}>
              <Card style={{ background: DEEP_BG, borderRadius: 8 }} bodyStyle={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <Avatar size={72} style={{ background: MID_BLUE, color: '#fff', fontSize: 28 }}>
                    护
                  </Avatar>
                  <div>
                    <Title level={4} style={{ color: '#fff', margin: 0 }}>
                      护士个人智能体 · 越用越懂你
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.75)' }}>
                      工号 {data?.staffId ?? '-'} ｜ 风险沉淀 · 交班要点 · 技巧图谱 · 满意度闭环
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>

            {/* 隐私承诺 */}
            <Col span={24}>
              <Alert
                type="info"
                showIcon
                icon={<SafetyCertificateOutlined />}
                message={data?.privacyNotice ?? '经验仅本人可见'}
                description={`你的 ${profile?.privacy.privateCount ?? 0} 条经验默认私密，${profile?.privacy.deptSharedCount ?? 0} 条共享到科室；智能体推荐只召回你本人的沉淀，绝不公开他人护理经验。`}
              />
            </Col>

            {/* KPI */}
            <Col xs={24} sm={6}>
              <KpiCard label="累计沉淀经验" value={String(profile?.totalExperiences ?? 0)} suffix="条" accent={DEEP_BG} sub={`本周期 ${growth?.totalInPeriod ?? 0} 条`} />
            </Col>
            <Col xs={24} sm={6}>
              <KpiCard label="风险闭环率" value={(((profile?.riskClosure.closureRate ?? 0) * 100).toFixed(0))} suffix="%" accent="#cf1322" sub={`隐患 ${profile?.riskClosure.hazardsIdentified ?? 0} · 闭环 ${profile?.riskClosure.closedLoops ?? 0}`} />
            </Col>
            <Col xs={24} sm={6}>
              <KpiCard label="好评率" value={(((profile?.satisfaction.praiseRate ?? 0) * 100).toFixed(0))} suffix="%" accent="#52c41a" sub={`表扬 ${profile?.satisfaction.praise ?? 0} · 投诉 ${profile?.satisfaction.complaint ?? 0}`} />
            </Col>
            <Col xs={24} sm={6}>
              <KpiCard
                label="最近活动"
                value={profile?.lastActivityAt ? profile.lastActivityAt.slice(0, 10) : '-'}
                accent="#faad14"
                sub={growth?.satisfactionTrend === 'up' ? '口碑走势向好' : growth?.satisfactionTrend === 'down' ? '口碑需关注' : '口碑平稳'}
              />
            </Col>

            {/* 四类经验分布 */}
            <Col span={24}>
              <Card title={<span style={{ color: DEEP_BG }}>四类经验沉淀</span>} style={{ borderRadius: 8 }}>
                {(Object.keys(CATEGORY_LABEL) as Category[]).map((cat) => {
                  const total = Math.max(1, profile?.totalExperiences ?? 1);
                  const count = profile?.byCategory[cat] ?? 0;
                  return (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>{CATEGORY_LABEL[cat]}</Text>
                        <Text type="secondary">{count} 条</Text>
                      </div>
                      <Progress percent={Math.round((count / total) * 100)} strokeColor={CATEGORY_COLOR[cat]} showInfo={false} />
                    </div>
                  );
                })}
              </Card>
            </Col>

            {/* 护理推荐：只召回本人经验 */}
            <Col xs={24} lg={12}>
              <Card title={<span style={{ color: DEEP_BG }}>我的护理推荐</span>} style={{ borderRadius: 8 }}>
                <List
                  dataSource={data?.recommendations ?? []}
                  renderItem={(rec) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Tag color={MID_BLUE}>#{rec.rank}</Tag>
                          <Text strong>{rec.title}</Text>
                          <Tag color={CATEGORY_COLOR[rec.category]}>{CATEGORY_LABEL[rec.category]}</Tag>
                          {rec.dept && <Tag>{rec.dept}</Tag>}
                        </div>
                        {rec.detail && <Paragraph type="secondary" style={{ margin: '4px 0 0' }} ellipsis={{ rows: 2 }}>{rec.detail}</Paragraph>}
                        <Text style={{ fontSize: 12, color: ACCENT }}>{rec.reason}（匹配分 {rec.score}）</Text>
                      </div>
                    </List.Item>
                  )}
                />
                {(data?.recommendations?.length ?? 0) === 0 && (
                  <Empty description="记录更多护理经历后，智能体会按患者上下文召回你的经验" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>

            {/* 成长跟踪 */}
            <Col xs={24} lg={12}>
              <Card title={<span style={{ color: DEEP_BG }}>成长跟踪</span>} style={{ borderRadius: 8 }}>
                {/* 月度迷你柱状 */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120, marginBottom: 16 }}>
                  {(growth?.monthly ?? []).map((m) => (
                    <div key={m.month} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: 'rgba(10,37,64,0.6)' }}>{m.total}</div>
                      <div
                        style={{
                          height: `${Math.max(6, (m.total / monthlyMax) * 80)}px`,
                          background: `linear-gradient(180deg, ${ACCENT}, ${MID_BLUE})`,
                          borderRadius: '4px 4px 0 0',
                        }}
                      />
                      <Text style={{ fontSize: 11, color: 'rgba(10,37,64,0.5)' }}>{m.month.slice(2)}</Text>
                    </div>
                  ))}
                </div>
                <Timeline
                  items={(growth?.milestones ?? []).map((t) => ({
                    color: ACCENT,
                    children: <Text>{t}</Text>,
                  }))}
                />
                <Alert type="warning" showIcon message={growth?.focusArea ?? '继续记录，让智能体更懂你'} style={{ marginTop: 8 }} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
