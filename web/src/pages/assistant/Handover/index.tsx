/**
 * 健澜科技 jlmedaios - 护理交接班智能助手（M120-C，依据宪法第七章）
 *
 * 交班护士选择病区与班次，一键拉取智能汇总：
 *  - 风险患者（按风险分自动排序，高危优先交接）
 *  - 护理要点 / 接班待办 / 经验教训沉淀
 *  - 一键生成的交班报告文本（可复制直接贴入交班本）
 *
 * 三态：loading（加载中 Spin）/ error（请求失败 Alert）/ empty（本区无在管患者 Empty）。
 * 深海蓝 VI：顶栏 #0A2540，主色 #4A90D9，高危红 #cf1322。
 *
 * 医疗安全：本页信息仅为交班辅助汇总，不替代临床判断与医嘱（依据宪法第七章）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Empty, Input, Layout, List, Row, Select, Space, Spin, Tag, Typography, message,
} from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板（与 muse 系页面一致） */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';
const LESSON_RED = '#cf1322';

/* ------------------------------ 与后端对齐的类型 ------------------------------ */

interface RiskPatient {
  patientId: string;
  name: string;
  bedNo?: string;
  diagnosis?: string;
  nursingLevel: string;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  riskFlags: string[];
  notes?: string;
}

interface CarePoint { patientId?: string; content: string; category?: string }
interface PendingTask { taskId: string; patientId?: string; patientName?: string; content: string; priority: number }
interface Lesson { lessonId: string; title: string; summary?: string; level: 'warn' | 'info' | 'tip' }

interface NursingHandover {
  nurseId: string;
  wardId: string;
  shiftType: 'day' | 'evening' | 'night';
  shiftLabel: string;
  generatedAt: string;
  riskPatients: RiskPatient[];
  carePoints: CarePoint[];
  pendingTasks: PendingTask[];
  lessons: Lesson[];
}

interface AssistantHandoverResponse {
  handover: NursingHandover;
  report: string;
}

/** 班次选项（与后端 shift 参数对齐） */
const SHIFT_OPTIONS = [
  { value: 'day', label: '白班' },
  { value: 'evening', label: '小夜班' },
  { value: 'night', label: '大夜班' },
];

/** 风险等级标签颜色：高危红 / 中危橙 / 低危绿 */
const RISK_TAG_COLOR: Record<RiskPatient['riskLevel'], string> = {
  high: 'red',
  medium: 'orange',
  low: 'green',
};

const RISK_TAG_LABEL: Record<RiskPatient['riskLevel'], string> = {
  high: '高危',
  medium: '中危',
  low: '低危',
};

const LESSON_TAG_COLOR: Record<Lesson['level'], string> = {
  warn: 'red',
  info: 'blue',
  tip: 'default',
};

const LESSON_TAG_LABEL: Record<Lesson['level'], string> = {
  warn: '警示',
  info: '经验',
  tip: '提示',
};

export default function AssistantHandoverPage() {
  const [wardId, setWardId] = useState<string>('w-01');
  const [shift, setShift] = useState<'day' | 'evening' | 'night'>('day');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssistantHandoverResponse | null>(null);

  const load = useCallback(async (wid: string, sh: 'day' | 'evening' | 'night') => {
    setLoading(true);
    setError(null);
    try {
      const resp = await get<AssistantHandoverResponse>('/assistant/handover', {
        wardId: wid,
        shift: sh,
      });
      setData(resp);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : '交班数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(wardId, shift); }, [load]);

  const onQuery = () => { void load(wardId.trim(), shift); };

  const onCopyReport = async () => {
    if (!data?.report) return;
    try {
      await navigator.clipboard.writeText(data.report);
      message.success('交班报告已复制，可粘贴至交班本');
    } catch {
      message.warning('复制失败，请手动选择文本复制');
    }
  };

  const ho = data?.handover;
  const isEmpty = !loading && !error && !!ho && ho.riskPatients.length === 0
    && ho.carePoints.length === 0 && ho.pendingTasks.length === 0;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>
          护理交接班智能助手 · AI Handover
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#f0f4f8', maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        {/* 查询条件 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap size={[12, 8]}>
            <Text type="secondary" style={{ fontSize: 13 }}>病区：</Text>
            <Input
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              onPressEnter={onQuery}
              placeholder="如 w-01"
              style={{ width: 140 }}
              allowClear
            />
            <Text type="secondary" style={{ fontSize: 13 }}>班次：</Text>
            <Select
              value={shift}
              onChange={(v) => setShift(v)}
              options={SHIFT_OPTIONS}
              style={{ width: 120 }}
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={onQuery}
              loading={loading}
              style={{ background: DEEP_BG, borderColor: DEEP_BG }}
            >
              一键生成交班
            </Button>
          </Space>
        </Card>

        {/* error 态 */}
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="交班数据加载失败"
            description={error}
          />
        )}

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" />
            <Paragraph type="secondary" style={{ marginTop: 12 }}>
              正在汇总本班患者风险、护理要点与待办…
            </Paragraph>
          </div>
        )}

        {/* empty 态 */}
        {!loading && isEmpty && (
          <Empty description="本病区本班次暂无在管患者，请调整病区/班次后重试" style={{ padding: '48px 0' }} />
        )}

        {/* 数据区 */}
        {!loading && ho && !isEmpty && (
          <>
            <Row gutter={[16, 16]}>
              {/* 风险患者 */}
              <Col xs={24} lg={14}>
                <Card title={`风险患者（${ho.riskPatients.length} 人，按风险排序）`} size="small">
                  <List
                    dataSource={ho.riskPatients}
                    renderItem={(p) => (
                      <List.Item>
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Space wrap size={6}>
                            <Tag color={RISK_TAG_COLOR[p.riskLevel]}>{RISK_TAG_LABEL[p.riskLevel]}</Tag>
                            <Text strong>{p.bedNo ? `${p.bedNo}床 ` : ''}{p.name}</Text>
                            {p.diagnosis && <Text type="secondary">{p.diagnosis}</Text>}
                            <Tag>{p.nursingLevel}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>风险分 {p.riskScore}</Text>
                          </Space>
                          {p.riskFlags.length > 0 && (
                            <Space wrap size={4}>
                              {p.riskFlags.map((f) => (
                                <Tag key={f} color="orange" style={{ marginInlineEnd: 4 }}>{f}</Tag>
                              ))}
                            </Space>
                          )}
                          {p.notes && <Text type="secondary" style={{ fontSize: 12 }}>备注：{p.notes}</Text>}
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>

              <Col xs={24} lg={10}>
                {/* 接班待办 */}
                <Card title={`接班待办（${ho.pendingTasks.length} 项）`} size="small" style={{ marginBottom: 16 }}>
                  <List
                    size="small"
                    dataSource={ho.pendingTasks}
                    renderItem={(t) => (
                      <List.Item>
                        <Text>
                          {t.patientName ? `${t.patientName}：` : ''}{t.content}
                          <Text type="secondary" style={{ fontSize: 12 }}>（优先级 {t.priority}）</Text>
                        </Text>
                      </List.Item>
                    )}
                  />
                </Card>

                {/* 经验教训 */}
                <Card title={`经验教训（${ho.lessons.length} 条）`} size="small">
                  <List
                    size="small"
                    dataSource={ho.lessons}
                    renderItem={(l) => (
                      <List.Item>
                        <Space direction="vertical" size={2}>
                          <Space size={6}>
                            <Tag color={LESSON_TAG_COLOR[l.level]}>{LESSON_TAG_LABEL[l.level]}</Tag>
                            <Text strong={l.level === 'warn'} style={l.level === 'warn' ? { color: LESSON_RED } : undefined}>
                              《{l.title}》
                            </Text>
                          </Space>
                          {l.summary && <Text type="secondary" style={{ fontSize: 12 }}>{l.summary}</Text>}
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>

            {/* 护理要点 */}
            <Card
              title={`护理要点（${ho.carePoints.length} 条）`}
              size="small"
              style={{ marginTop: 16 }}
            >
              <List
                size="small"
                dataSource={ho.carePoints}
                renderItem={(c, idx) => (
                  <List.Item>
                    <Text>
                      {idx + 1}. {c.category ? `[${c.category}] ` : ''}{c.content}
                    </Text>
                  </List.Item>
                )}
              />
            </Card>

            {/* 一键交班报告 */}
            <Card
              size="small"
              style={{ marginTop: 16 }}
              title="交班报告（一键生成）"
              extra={
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => void onCopyReport()}
                  style={{ borderColor: ACCENT, color: DEEP_BG }}
                >
                  复制报告
                </Button>
              }
            >
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  background: '#f7f9fc',
                  border: '1px solid #e8eef5',
                  borderRadius: 8,
                  padding: 16,
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                {data?.report}
              </pre>
            </Card>
          </>
        )}

        <Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
          依据宪法第七章：本页由护理交接班智能助手自动汇总已脱敏数据，仅供交班参考，不替代临床判断与医嘱。
          <br />
          © 杭州健澜科技有限公司
        </Paragraph>
      </Content>
    </Layout>
  );
}
