/**
 * 健澜科技 jlmedaios - 【患者服务深化】一站式服务中心页（M156-D）
 *
 * 集团与科研：面向老年患者的「简单、老人也能用」服务中心。
 *   - 六张大卡片一屏可达：预约挂号 / 在线缴费 / 报告查询 /
 *     智能导诊 / 院内导航 / 健康档案；
 *   - 大字、大按钮、高对比，不藏二级菜单；
 *   - 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 *
 * 数据来源：GET /api/v1/patient/service?patientId=xxx
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
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
  CalendarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  RobotOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';

/** 图标名 → antd 组件映射（后端 icon 名直显，老人无需理解英文） */
const ICON_MAP: Record<string, ReactNode> = {
  CalendarOutlined: <CalendarOutlined />,
  WalletOutlined: <WalletOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  RobotOutlined: <RobotOutlined />,
  EnvironmentOutlined: <EnvironmentOutlined />,
  FolderOpenOutlined: <FolderOpenOutlined />,
};

/** 与 BFF GET /api/v1/patient/service 响应 data 对齐 */
interface SubEntry {
  code: string;
  label: string;
  note: string;
}
interface ServiceCard {
  kind: string;
  title: string;
  desc: string;
  icon: string;
  subEntries: SubEntry[];
}
interface Waypoint {
  code: string;
  name: string;
  category: 'dept' | 'parking' | 'dining';
  location: string;
  routeText: string;
  accessible: boolean;
}
interface HealthArchive {
  visits: Array<{ date: string; deptName: string; diagnosis: string; doctor: string }>;
  medications: Array<{ name: string; dose: string; freq: string }>;
  recentExams: Array<{ date: string; item: string; status: string }>;
}
interface FullService {
  patientId: string;
  greeting: string;
  cards: ServiceCard[];
  waypoints: Waypoint[];
  archive: HealthArchive;
  emergencyNotice: string;
}
interface Doctor {
  id: string;
  name: string;
  title: string;
  deptName: string;
  matchScore: number;
  reason: string;
  scheduleTags: string[];
}
interface ServiceData {
  service: FullService;
  doctors: Doctor[];
}

/** 老人友好：默认演示患者 id（真实环境由登录态注入） */
const DEFAULT_PATIENT_ID = 'P000123';

export default function PatientServiceCenterPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<ServiceData | null>(null);
  const [condition, setCondition] = useState<string>('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await get<ServiceData>(
          '/patient/service',
          { patientId: DEFAULT_PATIENT_ID },
          { silent: true },
        );
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : '服务中心暂时打不开，请稍候再试');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** 智能导诊：带 condition 重新拉取推荐医生 */
  const askTriage = async () => {
    const text = condition.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res = await get<ServiceData>(
        '/patient/service',
        { patientId: DEFAULT_PATIENT_ID, condition: text },
        { silent: true },
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导诊暂时不可用');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Title level={4} style={{ color: '#fff', margin: 0, fontSize: 22 }}>
          <FolderOpenOutlined style={{ marginRight: 8 }} />
          患者服务中心
        </Title>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8', maxWidth: 1080, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="正在为您准备服务…" />
          </div>
        )}

        {error && (
          <Alert type="error" showIcon style={{ marginBottom: 16, fontSize: 16 }} message={error} />
        )}

        {!loading && !error && data && (
          <>
            {/* 欢迎语 + 急诊安全提示 */}
            <Paragraph style={{ fontSize: 20, marginBottom: 8 }}>{data.service.greeting}</Paragraph>
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 20, fontSize: 16 }}
              message={data.service.emergencyNotice}
            />

            {/* 六张大卡片：老人一屏可达 */}
            <Row gutter={[16, 16]}>
              {data.service.cards.map((card) => (
                <Col xs={24} sm={12} md={8} key={card.kind}>
                  <Card
                    hoverable
                    style={{ borderRadius: 12, borderTop: `5px solid ${MID_BLUE}` }}
                    bodyStyle={{ padding: 20 }}
                  >
                    <div style={{ fontSize: 40, color: MID_BLUE, marginBottom: 8 }}>
                      {ICON_MAP[card.icon] ?? <FolderOpenOutlined />}
                    </div>
                    <Title level={4} style={{ fontSize: 22, margin: '4px 0' }}>
                      {card.title}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>
                      {card.desc}
                    </Text>
                    {card.subEntries.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        {card.subEntries.map((s) => (
                          <Button
                            key={s.code}
                            block
                            size="large"
                            style={{
                              marginTop: 8,
                              fontSize: 17,
                              height: 48,
                              background: '#eef4fb',
                              borderColor: ACCENT,
                              color: DEEP_BG,
                            }}
                          >
                            {s.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 智能导诊入口 */}
            <Card style={{ marginTop: 20, borderRadius: 12 }} title={<span style={{ fontSize: 20 }}>智能导诊：说说哪不舒服</span>}>
              <Row gutter={12}>
                <Col flex="auto">
                  <input
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="例如：头痛三天，头晕恶心"
                    style={{
                      width: '100%',
                      fontSize: 18,
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #ccc',
                    }}
                  />
                </Col>
                <Col>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => void askTriage()}
                    style={{ background: MID_BLUE, borderColor: MID_BLUE, fontSize: 17, height: 48 }}
                  >
                    找医生
                  </Button>
                </Col>
              </Row>

              {data.doctors.length > 0 && (
                <List
                  style={{ marginTop: 16 }}
                  dataSource={data.doctors}
                  renderItem={(doc) => (
                    <List.Item>
                      <div style={{ width: '100%' }}>
                        <Text style={{ fontSize: 18 }}>
                          {doc.name} · {doc.title}（{doc.deptName}）
                        </Text>
                        <Tag color="green" style={{ marginLeft: 8, fontSize: 14 }}>
                          匹配 {doc.matchScore}
                        </Tag>
                        <div style={{ fontSize: 16, color: '#555' }}>{doc.reason}</div>
                        <div>
                          {doc.scheduleTags.map((t) => (
                            <Tag key={t} color="blue" style={{ marginTop: 4 }}>
                              {t}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </Card>

            {/* 院内导航：大字路线 */}
            <Card style={{ marginTop: 20, borderRadius: 12 }} title={<span style={{ fontSize: 20 }}>院内导航（跟着走）</span>}>
              <Row gutter={[12, 12]}>
                {data.service.waypoints.map((w) => (
                  <Col xs={24} md={12} key={w.code}>
                    <Card size="small" style={{ background: '#f7fbff', borderRadius: 8 }}>
                      <Text strong style={{ fontSize: 18 }}>
                        {w.name}
                      </Text>
                      {w.accessible && <Tag color="green" style={{ marginLeft: 6 }}>无障碍</Tag>}
                      <div style={{ fontSize: 16, color: '#555' }}>{w.location}</div>
                      <div style={{ fontSize: 16 }}>怎么走：{w.routeText}</div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* 健康档案：大字汇总 */}
            <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
              <Col xs={24} md={8}>
                <Card size="default" title={<span style={{ fontSize: 18 }}>历次就诊</span>} style={{ borderRadius: 12 }}>
                  <List
                    size="small"
                    dataSource={data.service.archive.visits}
                    renderItem={(v) => (
                      <List.Item>
                        <Text style={{ fontSize: 16 }}>
                          {v.date} {v.deptName} · {v.diagnosis}
                        </Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="default" title={<span style={{ fontSize: 18 }}>正在用药</span>} style={{ borderRadius: 12 }}>
                  <List
                    size="small"
                    dataSource={data.service.archive.medications}
                    renderItem={(m) => (
                      <List.Item>
                        <Text style={{ fontSize: 16 }}>
                          {m.name} {m.dose}（{m.freq}）
                        </Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="default" title={<span style={{ fontSize: 18 }}>近期检查</span>} style={{ borderRadius: 12 }}>
                  <List
                    size="small"
                    dataSource={data.service.archive.recentExams}
                    renderItem={(e) => (
                      <List.Item>
                        <Text style={{ fontSize: 16 }}>
                          {e.date} {e.item} · {e.status}
                        </Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>

            {data.service.cards.length === 0 && <Empty description="暂无服务" style={{ marginTop: 24 }} />}
          </>
        )}
      </Content>
    </Layout>
  );
}
