/**
 * 健澜科技 jlmedaios - 护士 MUSE 个人护理经验页（M116-A）
 *
 * 依据宪法第七章 7.6（护士 Personal Agent：护理经验沉淀与风险识别闭环）：
 *   顶部深海蓝个人条带 + 三张统计卡（总护理次数 / 风险识别数 / 干预成功率）；
 *   护理技巧标签云（按经验频次排序，字号分层）；
 *   交班经验时间线（最近护理操作，风险等级高亮、结局着色）。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 * 权限：仅本人（admin 带 nurseId 看他人由 BFF 校验，前端不做开关）。
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
  Row,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';

type Outcome = 'success' | 'failure' | 'mixed';

const OUTCOME_COLOR: Record<Outcome, string> = {
  success: '#52c41a',
  failure: '#cf1322',
  mixed: '#faad14',
};

const OUTCOME_TAG: Record<Outcome, string> = {
  success: '有效',
  failure: '待改进',
  mixed: '部分有效',
};

const RISK_COLOR: Record<string, string> = {
  high: '#cf1322',
  medium: '#faad14',
  low: '#52c41a',
};

/** 与 BFF GET /api/v1/muse/nurse 响应 data 对齐 */
interface TimelineItem {
  date: string;
  careType: string;
  dept: string | null;
  riskLevel: string | null;
  intervention: string | null;
  outcome: Outcome | null;
}

interface NurseMuseData {
  demo: boolean;
  nurseId: string;
  totalCare: number;
  riskIdentified: number;
  interventionSuccessRate: number;
  careSkillTags: string[];
  recentTimeline: TimelineItem[];
}

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
    <Card style={{ borderTop: `3px solid ${accent}`, borderRadius: 8, height: '100%' }} bodyStyle={{ padding: 20 }}>
      <Text type="secondary">{label}</Text>
      <div style={{ marginTop: 8 }}>
        <Title level={2} style={{ color: DEEP_BG, margin: 0 }}>
          {value}
          {suffix && (
            <Text style={{ fontSize: 14, color: 'rgba(10,37,64,0.55)', marginLeft: 4 }}>{suffix}</Text>
          )}
        </Title>
      </div>
    </Card>
  );
}

/** 时间线节点着色：按结局；无结局用主蓝 */
function dotColor(item: TimelineItem): string {
  return item.outcome ? OUTCOME_COLOR[item.outcome] : ACCENT;
}

export default function MuseNursePage() {
  const [data, setData] = useState<NurseMuseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await get<NurseMuseData>('/muse/nurse', undefined, { silent: true });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '护士 MUSE 经验页加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isEmpty = !!data && data.totalCare === 0 && data.careSkillTags.length === 0;

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
          我的护理经验 MUSE
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
            <Spin size="large" tip="加载我的护理经验…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="暂无护理经验记忆：完成你的第一次护理操作记录后，这里会自动沉淀风险识别统计与交班经验" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* 个人条带：护士身份 + 岗位定位 */}
            <Col span={24}>
              <Card style={{ background: DEEP_BG, borderRadius: 8 }} bodyStyle={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <Avatar size={72} style={{ background: MID_BLUE, color: '#fff', fontSize: 28 }}>
                    护
                  </Avatar>
                  <div>
                    <Title level={4} style={{ color: '#fff', margin: 0 }}>
                      护士个人护理经验页
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.75)' }}>
                      工号 {data?.nurseId ?? '-'} ｜ 风险识别 · 交班经验 · 技巧沉淀
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>

            {/* 风险识别统计：三张统计卡 */}
            <Col xs={24} sm={8}>
              <StatCard label="总护理次数" value={String(data?.totalCare ?? 0)} suffix="次" accent={DEEP_BG} />
            </Col>
            <Col xs={24} sm={8}>
              <StatCard label="风险识别数" value={String(data?.riskIdentified ?? 0)} suffix="项" accent="#faad14" />
            </Col>
            <Col xs={24} sm={8}>
              <StatCard
                label="干预成功率"
                value={((data?.interventionSuccessRate ?? 0) * 100).toFixed(1)}
                suffix="%"
                accent="#52c41a"
              />
            </Col>

            {/* 护理技巧标签云：字号按频次分层（前 3 大号，其余常规） */}
            <Col span={24}>
              <Card title={<span style={{ color: DEEP_BG }}>护理技巧标签云</span>} style={{ borderRadius: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  {(data?.careSkillTags ?? []).map((tag, idx) => (
                    <Tag
                      key={tag}
                      color={idx < 3 ? MID_BLUE : ACCENT}
                      style={{
                        fontSize: idx < 3 ? 20 : 14,
                        padding: idx < 3 ? '6px 14px' : '2px 10px',
                        borderRadius: 16,
                      }}
                    >
                      {tag}
                    </Tag>
                  ))}
                  {(data?.careSkillTags?.length ?? 0) === 0 && (
                    <Text type="secondary">完成护理操作后自动沉淀你的高频技巧标签</Text>
                  )}
                </div>
              </Card>
            </Col>

            {/* 交班经验提取：最近护理操作时间线 */}
            <Col span={24}>
              <Card title={<span style={{ color: DEEP_BG }}>交班经验时间线</span>} style={{ borderRadius: 8 }}>
                <Timeline
                  items={(data?.recentTimeline ?? []).map((item) => ({
                    color: dotColor(item),
                    children: (
                      <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Text strong>{item.careType}</Text>
                          {item.dept && <Tag>{item.dept}</Tag>}
                          {item.riskLevel && (
                            <Tag color={RISK_COLOR[item.riskLevel] ?? ACCENT}>
                              风险 {item.riskLevel}
                            </Tag>
                          )}
                          {item.outcome && (
                            <Tag color={OUTCOME_COLOR[item.outcome]}>{OUTCOME_TAG[item.outcome]}</Tag>
                          )}
                        </div>
                        {item.intervention && (
                          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                            干预：{item.intervention}
                          </Text>
                        )}
                        {item.date && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.date.slice(0, 10)}
                          </Text>
                        )}
                      </div>
                    ),
                  }))}
                />
                {(data?.recentTimeline?.length ?? 0) === 0 && (
                  <Empty description="暂无交班经验记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
