/**
 * 健澜科技 jlmedaios - M140-D 党建工会活动留痕页（仅 admin，医院管理深化）
 *
 * 展示 GET /api/v1/admin/party-union 返回的活动台账 + 年度报告：
 *   - 顶部年度概览：全年场次 / 全年参与人次 + 五类活动（党支部学习/主题党日/
 *     工会福利/职工文体/志愿服务）分类型场次与人次，上级检查一屏看清；
 *   - 活动留痕表格：日期 / 类型 / 主题 / 地点 / 参与人数，谁办的、谁参加的可溯；
 *   - 支持登记新活动（POST），登记即留痕。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, DatePicker, Form, Input, Layout, Modal, Row, Select, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF partyUnionAggregator 输出对齐 */
type PartyActivityType = '党支部学习' | '主题党日' | '工会福利' | '职工文体' | '志愿服务';
const ACTIVITY_TYPES: PartyActivityType[] = ['党支部学习', '主题党日', '工会福利', '职工文体', '志愿服务'];

interface PartyActivity {
  id: string;
  type: PartyActivityType;
  title: string;
  organizerId: string;
  date: string;
  location: string;
  participants: string[];
  participantCount: number;
}
interface AnnualReport {
  year: number;
  totalActivities: number;
  totalParticipants: number;
  byType: Record<PartyActivityType, number>;
  byTypeParticipants: Record<PartyActivityType, number>;
  monthly: number[];
  activities: PartyActivity[];
}
interface PartyUnionView { list: PartyActivity[]; report: AnnualReport }

/** 深海蓝 VI 色板 */
const VI = { deep: '#0a2540', mid: '#123a5e', accent: '#1e6fbf', bg: '#f5f7fa' };

/** 五类活动标签色（党建红 / 工会暖 / 志愿蓝） */
const TYPE_COLOR: Record<PartyActivityType, string> = {
  党支部学习: 'red',
  主题党日: 'volcano',
  工会福利: 'gold',
  职工文体: 'blue',
  志愿服务: 'green',
};

const CURRENT_YEAR = new Date().getFullYear();

export default function PartyUnionListPage() {
  const [data, setData] = useState<PartyUnionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [regOpen, setRegOpen] = useState(false);
  const [regForm] = Form.useForm();

  const load = async (y: number) => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/v1/admin/party-union?year=${y}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as PartyUnionView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(year); }, [year]);

  const report = data?.report;

  const columns: ColumnsType<PartyActivity> = [
    { title: '活动日期', dataIndex: 'date', width: 110 },
    {
      title: '类型', dataIndex: 'type', width: 110,
      render: (t: PartyActivityType) => <Tag color={TYPE_COLOR[t]}>{t}</Tag>,
    },
    { title: '活动主题', dataIndex: 'title' },
    { title: '地点', dataIndex: 'location', render: (v: string) => v || <span style={{ color: '#999' }}>—</span> },
    {
      title: '参与人数', dataIndex: 'participantCount', width: 90, align: 'right',
      render: (n: number, r) => (
        <span title={r.participants.join('、')}>{n} 人</span>
      ),
    },
  ];

  const submitRegister = async () => {
    const v = await regForm.validateFields();
    await fetch('/api/v1/admin/party-union', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: v.type,
        title: v.title,
        date: v.date.format('YYYY-MM-DD'),
        location: v.location ?? '',
        participants: Array.isArray(v.participants) ? v.participants : [],
      }),
    });
    setRegOpen(false); regForm.resetFields(); void load(year);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>党建工会活动留痕</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              医院管理深化 · 活动全程留痕，方便上级检查
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" onClick={() => { regForm.resetFields(); setRegOpen(true); }}>登记活动</Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" tip="正在加载活动留痕…" /></div>}
        {!loading && error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => load(year)}>重试</Button>} />}

        {!loading && !error && data && report && (
          <>
            {/* 年度切换 */}
            <Card style={{ marginBottom: 16 }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <strong>{report.year} 年度概览</strong>
                  <span style={{ color: 'rgba(0,0,0,0.55)', marginLeft: 12 }}>
                    党支部学习 / 主题党日 / 工会福利 / 职工文体 / 志愿服务
                  </span>
                </Col>
                <Col>
                  <Select
                    value={year}
                    style={{ width: 110 }}
                    onChange={(v) => setYear(v)}
                    options={[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => ({ value: y, label: `${y} 年` }))}
                  />
                </Col>
              </Row>
            </Card>

            {/* 年度概览 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="全年活动场次" value={report.totalActivities} /></Card></Col>
              <Col span={6}><Card><Statistic title="全年参与人次" value={report.totalParticipants} /></Card></Col>
              <Col span={6}>
                <Card title="主题党日">
                  <Statistic value={report.byType['主题党日']} suffix="场" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="党支部学习">
                  <Statistic value={report.byType['党支部学习']} suffix="场" />
                </Card>
              </Col>
            </Row>

            {/* 分类型统计 */}
            <Card title="分类型留痕统计" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                {ACTIVITY_TYPES.map((t) => (
                  <Col span={8} key={t}>
                    <Card size="small">
                      <Tag color={TYPE_COLOR[t]}>{t}</Tag>
                      <div style={{ marginTop: 8 }}>
                        场次 <strong>{report.byType[t]}</strong>
                        <span style={{ marginLeft: 16, color: 'rgba(0,0,0,0.55)' }}>
                          参与 {report.byTypeParticipants[t]} 人次
                        </span>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            <Card title={`活动留痕台账（${report.year} 年共 ${report.totalActivities} 场）`}>
              <Table rowKey="id" columns={columns} dataSource={data.list} pagination={{ pageSize: 10 }} size="small" />
            </Card>
          </>
        )}
      </Content>

      {/* 登记活动弹窗 */}
      <Modal open={regOpen} title="登记党建工会活动" onOk={submitRegister} onCancel={() => setRegOpen(false)} okText="登记留痕">
        <Form form={regForm} layout="vertical">
          <Form.Item name="type" label="活动类型" rules={[{ required: true, message: '请选择活动类型' }]}>
            <Select
              options={ACTIVITY_TYPES.map((t) => ({ value: t, label: t }))}
              placeholder="党支部学习 / 主题党日 / 工会福利 / 职工文体 / 志愿服务"
            />
          </Form.Item>
          <Form.Item name="title" label="活动主题" rules={[{ required: true, message: '请输入活动主题' }]}>
            <Input placeholder="例：学习贯彻二十届四中全会精神主题党日" />
          </Form.Item>
          <Form.Item name="date" label="活动日期" rules={[{ required: true, message: '请选择活动日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="location" label="活动地点">
            <Input placeholder="例：门诊楼 12 楼党员活动室" />
          </Form.Item>
          <Form.Item name="participants" label="参与人员（回车逐人录入）">
            <Select mode="tags" tokenSeparators={['，', ',', ' ']} placeholder="例：张三、李四…" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
