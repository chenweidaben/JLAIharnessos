/**
 * 健澜科技 jlmedaios - M178-C 医院行政办公深化页（财务人力行政党建，仅 admin）
 *
 * 行政办公要高效，不能踢皮球：
 *  - 公文管理：发文/收文/审批/归档，审批链节点到人，当前待办人唯一；
 *  - 会议管理：会议室按时段预订不冲突，冲突时给出最近可用时段；
 *  - 档案管理：文书/科技/会计三类分库，归档编号唯一；
 *  - 督查督办：任务必有 owner_dept，进度按周反馈，超期自动升级。
 *
 * 三态：loading / error（可重试）/ demo 提示。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF officeDeep 输出对齐的类型 ---------------- */

interface OfficeDomainSpec {
  key: string;
  name: string;
  managementGoal: string;
  subModules: { key: string; name: string; principle: string }[];
}
interface OfficeSystem {
  version: string;
  principles: string[];
  domains: OfficeDomainSpec[];
}
interface ApprovalResult {
  kind: string;
  status?: string;
  currentStep?: number;
  approverId?: string;
  role?: string;
  routedTo?: string;
  message?: string;
}
interface MeetingResult {
  kind: string;
  room?: string;
  bookingId?: string;
  startAt?: string;
  endAt?: string;
  conflictWith?: string;
  suggestedStartAt?: string;
  suggestedEndAt?: string;
  roomCapacity?: number;
  attendees?: number;
  message?: string;
}
interface SupervisionReport {
  taskId: string;
  title: string;
  ownerDept: string;
  status: 'open' | 'at_risk' | 'overdue' | 'closed';
  progressPct: number;
  daysRemaining: number;
  daysElapsed: number;
  escalated: boolean;
  latestNote: string;
  recommendation: string;
}
interface OfficeDeepData {
  demo: boolean;
  system?: OfficeSystem;
  approval?: ApprovalResult;
  meeting?: MeetingResult;
  supervision?: SupervisionReport[];
  message?: string;
  generatedAt?: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  bg: '#f5f7fa',
};

const SUP_TAG: Record<string, { color: string; text: string }> = {
  open: { color: 'blue', text: '进行中' },
  at_risk: { color: 'orange', text: '有风险' },
  overdue: { color: 'red', text: '已超期' },
  closed: { color: 'green', text: '已办结' },
};

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function OfficeDeepPage() {
  const [data, setData] = useState<OfficeDeepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await getJson<OfficeDeepData>('/api/v1/admin/office');
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : '行政办公数据加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sys = data?.system;
  const ap = data?.approval;
  const mt = data?.meeting;
  const sup = data?.supervision ?? [];
  const overdueCount = sup.filter((s) => s.status === 'overdue').length;
  const atRiskCount = sup.filter((s) => s.status === 'at_risk').length;
  const closedCount = sup.filter((s) => s.status === 'closed').length;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>医院行政办公深化</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          财务人力行政党建 · 公文 / 会议 / 档案 / 督办 四域闭环（节点到人，不踢皮球）
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Paragraph style={{ margin: 0, color: '#666' }}>
                {sys?.principles.join('；')}
              </Paragraph>
            </Col>
            <Col>
              <Button type="primary" onClick={load} loading={loading}>刷新</Button>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载行政办公数据中…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && !error && data?.demo && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            message={data.message || '当前为演示模式，使用内置样例数据。'} />
        )}

        {!loading && !error && data && (
          <>
            {/* KPI */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="督办任务（开放）" value={sup.length - closedCount}
                    valueStyle={{ color: VI.deep }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="已超期" value={overdueCount}
                    valueStyle={{ color: overdueCount > 0 ? '#d4483e' : '#3f9d63' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="有风险" value={atRiskCount}
                    valueStyle={{ color: atRiskCount > 0 ? '#e0a030' : VI.deep }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="已办结" value={closedCount}
                    valueStyle={{ color: '#3f9d63' }} />
                </Card>
              </Col>
            </Row>

            {/* 公文流转 + 会议安排 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="公文审批流转（当前待办人唯一，不踢皮球）">
                  {ap?.kind === 'next' && (
                    <>
                      <Paragraph>
                        下一节点：<Tag color="blue">{ap.role}</Tag>
                        处理人：<strong style={{ color: VI.deep }}>{ap.approverId}</strong>
                        （第 {ap.currentStep} 步）
                      </Paragraph>
                      <Alert type="info" showIcon message="该公文已明确流转到唯一审批人，不允许两人互相等待。" />
                    </>
                  )}
                  {ap?.kind === 'routed' && (
                    <Alert type={ap.status === 'rejected' ? 'warning' : 'success'} showIcon
                      message={ap.message ?? ''} />
                  )}
                  {ap?.kind === 'terminal' && (
                    <Alert type="info" showIcon message={ap.message ?? '公文已终态。'} />
                  )}
                  {ap?.kind === 'error' && (
                    <Alert type="error" showIcon message={ap.message ?? '审批链异常。'} />
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card title="会议预订（会议室时段排他）">
                  {mt?.kind === 'confirmed' && (
                    <Alert type="success" showIcon
                      message={`${mt.room} 已预订 ${new Date(mt.startAt ?? '').toLocaleString()} ~ ${new Date(mt.endAt ?? '').toLocaleString()}`} />
                  )}
                  {mt?.kind === 'conflict' && (
                    <Alert type="warning" showIcon style={{ marginBottom: 8 }}
                      message={`${mt.room} 时段冲突（与 ${mt.conflictWith}）`} />
                  )}
                  {mt?.kind === 'conflict' && (
                    <Paragraph>
                      建议时段：<Tag color="green">{new Date(mt.suggestedStartAt ?? '').toLocaleString()}</Tag>
                      ~ <Tag color="green">{new Date(mt.suggestedEndAt ?? '').toLocaleString()}</Tag>
                    </Paragraph>
                  )}
                  {mt?.kind === 'capacity_warn' && (
                    <Alert type="warning" showIcon
                      message={`${mt.room} 容量 ${mt.roomCapacity} 人，申请 ${mt.attendees} 人，请换大会议室`} />
                  )}
                  {mt?.kind === 'error' && (
                    <Alert type="error" showIcon message={mt.message ?? '会议安排异常。'} />
                  )}
                </Card>
              </Col>
            </Row>

            {/* 四域子模块 */}
            <Card title="行政办公四域（公文 / 会议 / 档案 / 督办）" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                {(sys?.domains ?? []).map((d) => (
                  <Col span={12} key={d.key}>
                    <Card size="small" title={<span style={{ color: VI.deep }}>{d.name}</span>}
                      extra={<Typography.Text type="secondary">{d.managementGoal}</Typography.Text>}>
                      {d.subModules.map((m) => (
                        <Row key={m.key} justify="space-between" style={{ fontSize: 13, lineHeight: '26px' }}>
                          <Col><Tag>{m.name}</Tag></Col>
                          <Col flex="auto" style={{ paddingLeft: 8, color: '#666' }}>{m.principle}</Col>
                        </Row>
                      ))}
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* 督办任务表 */}
            <Card title={`督查督办（${sup.length} 项，owner 锁定责任部门）`}>
              <Table
                rowKey="taskId"
                pagination={false}
                dataSource={sup}
                size="small"
                columns={[
                  { title: '任务', dataIndex: 'title', ellipsis: true },
                  {
                    title: '状态', dataIndex: 'status', width: 100,
                    render: (v: string) => <Tag color={SUP_TAG[v].color}>{SUP_TAG[v].text}</Tag>,
                  },
                  { title: '责任部门', dataIndex: 'ownerDept', width: 140 },
                  {
                    title: '进度', dataIndex: 'progressPct', width: 120,
                    render: (v: number) => (
                      <div>
                        <div style={{ background: '#eee', height: 6, borderRadius: 3 }}>
                          <div style={{
                            width: `${v}%`, height: 6, borderRadius: 3,
                            background: v >= 100 ? '#3f9d63' : VI.accent,
                          }} />
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{v}%</Typography.Text>
                      </div>
                    ),
                  },
                  { title: '剩余天数', dataIndex: 'daysRemaining', width: 90 },
                  {
                    title: '升级', dataIndex: 'escalated', width: 80,
                    render: (v: boolean) => (v ? <Tag color="red">已升级</Tag> : <Tag>—</Tag>),
                  },
                  { title: '建议', dataIndex: 'recommendation', ellipsis: true },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
