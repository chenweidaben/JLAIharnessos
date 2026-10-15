/**
 * 健澜科技 jlmedaios - 后继者入职向导页面（M115-C）
 *
 * 依据宪法第七章 7.8「后继者机制」：新员工登录岗位工作台首屏，
 * 自动呈现「欢迎加入XX科，您的前辈们留下了 N 条经验」+
 * Top5 高频成功经验 + Top3 重要教训（红色高亮）+ 科室推荐路径。
 *
 * 深海蓝 VI：标题区 #0A2540 深蓝底 / #4A90D9 强调；
 * 三态完备：loading（Spin）/ error（Alert + 重试）/ empty（Empty）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Empty, Layout, List, Row, Spin, Steps, Tag, Typography,
} from 'antd';
import { ReloadOutlined, SafetyCertificateOutlined, WarningOutlined } from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝主题色板（与 MEDMUSE 系页面一致） */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';

/** 岗位角色中文展示 */
const ROLE_LABEL: Record<string, string> = {
  doctor: '医生',
  nurse: '护士',
  pharmacist: '药师',
};

/** 向导中的单条经验（与 BFF onboardingAggregator 契约对齐） */
interface OnboardingExperienceItem {
  topic: string;
  content: string;
  totalCount: number;
  staffCount: number;
  roles: ('doctor' | 'nurse' | 'pharmacist')[];
  avgSuccessRate: number;
}

/** GET /api/v1/muse/onboarding 响应体 */
interface OnboardingData {
  deptCode: string;
  deptName: string;
  role: string;
  welcomeMessage: string;
  totalExperiences: number;
  topSuccesses: OnboardingExperienceItem[];
  topLessons: OnboardingExperienceItem[];
  deptPath: string[];
}

/** 拉取新员工入职引导数据（GET，鉴权由 BFF 统一处理） */
function fetchOnboarding(): Promise<OnboardingData> {
  return get<OnboardingData>('/muse/onboarding');
}

export default function OnboardingPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchOnboarding();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '入职向导加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const roleText = data ? (ROLE_LABEL[data.role] ?? data.role) : '';
  const isEmpty =
    !loading && !error && data != null && data.totalExperiences === 0;

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
          后继者入职向导
        </Title>
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void load()}
        >
          刷新
        </Button>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" tip="正在加载前辈们的经验…">
              <div style={{ minHeight: 40 }} />
            </Spin>
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="入职向导加载失败"
            description={error}
            action={
              <Button size="small" danger onClick={() => void load()}>
                重试
              </Button>
            }
          />
        )}

        {/* empty 态 */}
        {!loading && !error && isEmpty && (
          <Card>
            <Empty description="当前科室暂无前辈经验沉淀，请联系科教科分配带教老师" />
          </Card>
        )}

        {/* 正常态 */}
        {!loading && !error && data && !isEmpty && (
          <>
            {/* 欢迎横幅：欢迎加入XX科，您的前辈们留下了 N 条经验 */}
            <Card
              style={{
                marginBottom: 16,
                background: DEEP_BG,
                border: 'none',
              }}
            >
              <Paragraph style={{ color: '#fff', fontSize: 20, marginBottom: 8 }}>
                {data.welcomeMessage}
              </Paragraph>
              <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
                {data.deptName} · {roleText} · 依据科室经验基线自动生成
              </Text>
              <div style={{ marginTop: 12 }}>
                <Tag color={ACCENT}>前辈经验 {data.totalExperiences} 条</Tag>
                <Tag color={ACCENT}>高频成功 {data.topSuccesses.length} 条</Tag>
                <Tag color="red">必读教训 {data.topLessons.length} 条</Tag>
              </div>
            </Card>

            <Row gutter={[16, 16]}>
              {/* Top5 高频成功经验 */}
              <Col xs={24} lg={14}>
                <Card
                  title={
                    <span>
                      <SafetyCertificateOutlined style={{ color: ACCENT, marginRight: 8 }} />
                      高频成功经验 · Top{Math.min(5, data.topSuccesses.length)}
                    </span>
                  }
                >
                  {data.topSuccesses.length === 0 ? (
                    <Empty description="暂无高频成功经验" />
                  ) : (
                    <List
                      itemLayout="vertical"
                      dataSource={data.topSuccesses}
                      renderItem={(item, idx) => (
                        <List.Item key={item.topic}>
                          <Paragraph strong style={{ marginBottom: 4 }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 24,
                                height: 24,
                                lineHeight: '24px',
                                textAlign: 'center',
                                borderRadius: 12,
                                background: ACCENT,
                                color: '#fff',
                                marginRight: 8,
                                fontSize: 13,
                              }}
                            >
                              {idx + 1}
                            </span>
                            {item.topic}
                          </Paragraph>
                          <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                            {item.content}
                          </Paragraph>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            累计决策 {item.totalCount} 次 · {item.staffCount} 位前辈
                            · 有效率 {(item.avgSuccessRate * 100).toFixed(0)}%
                          </Text>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>

              {/* Top3 重要教训（红色高亮） */}
              <Col xs={24} lg={10}>
                <Card
                  title={
                    <span style={{ color: '#cf1322' }}>
                      <WarningOutlined style={{ marginRight: 8 }} />
                      重要教训 · Top{Math.min(3, data.topLessons.length)}（先避坑再上手）
                    </span>
                  }
                  headStyle={{ background: '#fff1f0' }}
                >
                  {data.topLessons.length === 0 ? (
                    <Empty description="暂无必读教训" />
                  ) : (
                    <List
                      dataSource={data.topLessons}
                      renderItem={(item, idx) => (
                        <List.Item
                          key={item.topic}
                          style={{
                            background: '#fff1f0',
                            border: '1px solid #ffa39e',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 12,
                          }}
                        >
                          <Paragraph strong style={{ color: '#cf1322', marginBottom: 4 }}>
                            教训 {idx + 1} · {item.topic}
                          </Paragraph>
                          <Paragraph style={{ marginBottom: 4 }}>{item.content}</Paragraph>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            累计 {item.totalCount} 次 · {item.staffCount} 位前辈亲历
                          </Text>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>

            {/* 科室推荐路径 */}
            <Card title="科室推荐上手路径" style={{ marginTop: 16 }}>
              <Steps
                direction="vertical"
                current={data.deptPath.length}
                items={data.deptPath.map((step) => ({ title: step }))}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
