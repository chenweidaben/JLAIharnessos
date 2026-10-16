/**
 * 健澜科技 jlmedaios - M142-B 预防接种记录页（预防保健与患者服务）
 *
 * 展示 BFF /api/v1/vaccination/records/:patientId 的接种计划与剂次进度，
 * 并提供接种登记入口（POST /api/v1/vaccination/administer）：
 *   儿童规划免疫 / 成人流感 / 新冠 / HPV / 乙肝五类疫苗统一管理。
 *
 * 核心红线：接种提醒提前 7 天——下一针应种日前 7 天即进入提醒窗口，
 *   超期未种单独红色标记，「不能让患者忘了打」。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无接种计划）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type DoseStatus = 'pending' | 'done';

interface DoseSchedule {
  doseNo: number;
  dueDate: string;
  status: DoseStatus;
  administeredAt?: string;
  nurseId?: string;
  batchNo?: string;
}

interface Plan {
  id: string;
  patientId: string;
  vaccineName: string;
  category: string;
  categoryLabel: string;
  totalDoses: number;
  doses: DoseSchedule[];
  startDate: string;
  reminderLeadDays: number;
  createdAt: string;
}

interface Reminder {
  patientId: string;
  hasNext: boolean;
  recordId: string | null;
  vaccineName: string | null;
  categoryLabel: string | null;
  nextDoseNo: number | null;
  dueDate: string | null;
  remindDate: string | null;
  daysUntilDue: number | null;
  inWindow: boolean;
  overdue: boolean;
  message: string;
}

interface RecordsView {
  patientId: string;
  plans: Plan[];
  reminder: Reminder;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const CATEGORY_COLOR: Record<string, string> = {
  childhood: 'geekblue',
  flu: 'cyan',
  covid: 'volcano',
  hpv: 'magenta',
  hepb: 'blue',
};

export default function VaccinationRecordsPage() {
  const [patientId, setPatientId] = useState('');
  const [queriedId, setQueriedId] = useState('');
  const [data, setData] = useState<RecordsView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async (pid: string) => {
    const id = pid.trim();
    if (!id) {
      setError('请输入患者标识');
      return;
    }
    setLoading(true);
    setError('');
    setQueriedId(id);
    try {
      const resp = await fetch(`/api/v1/vaccination/records/${encodeURIComponent(id)}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as RecordsView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初始空页，不自动请求
  }, []);

  const openAdminister = () => {
    form.resetFields();
    form.setFieldsValue({ patientId: queriedId });
    setModalOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/vaccination/administer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        Modal.error({ title: '登记失败', content: json.message || '请稍后重试' });
      } else {
        setModalOpen(false);
        void load(values.patientId);
      }
    } catch (e) {
      Modal.error({ title: '网络异常', content: e instanceof Error ? e.message : '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const planColumns: ColumnsType<Plan> = [
    { title: '疫苗', dataIndex: 'vaccineName' },
    {
      title: '类别',
      dataIndex: 'category',
      width: 130,
      render: (c: string, row) => <Tag color={CATEGORY_COLOR[c] || 'blue'}>{row.categoryLabel}</Tag>,
    },
    {
      title: '接种进度',
      dataIndex: 'doses',
      width: 200,
      render: (doses: DoseSchedule[]) => {
        const done = doses.filter((d) => d.status === 'done').length;
        const total = doses.length;
        return <Progress percent={total ? Math.round((done / total) * 100) : 0} size="small" />;
      },
    },
    {
      title: '剂次',
      dataIndex: 'totalDoses',
      width: 70,
      render: (_: number, row) => {
        const done = row.doses.filter((d) => d.status === 'done').length;
        return <Text strong>{done}/{row.totalDoses}</Text>;
      },
    },
    {
      title: '下一针应种',
      dataIndex: 'doses',
      width: 140,
      render: (doses: DoseSchedule[]) => {
        const next = doses.find((d) => d.status === 'pending');
        if (!next) return <Tag color="green">已完成</Tag>;
        return <Text>{next.dueDate}（第 {next.doseNo} 针）</Text>;
      },
    },
    { title: '首种日期', dataIndex: 'startDate', width: 120 },
  ];

  const reminder = data?.reminder;
  const doneCount = data?.plans.reduce((acc, p) => acc + p.doses.filter((d) => d.status === 'done').length, 0) ?? 0;
  const totalCount = data?.plans.reduce((acc, p) => acc + p.totalDoses, 0) ?? 0;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              预防接种 · 提前 7 天提醒
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              儿童规划免疫 / 成人流感 / 新冠 / HPV / 乙肝 · 排程全程、登记接种、下一针不遗漏
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" style={{ background: VI.accent, borderColor: VI.accent }} onClick={openAdminister}>
              登记接种
            </Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* 查询患者 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="输入患者标识（patientId）"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              onPressEnter={() => load(patientId)}
              style={{ width: 280 }}
            />
            <Button type="primary" onClick={() => load(patientId)} loading={loading}>
              查询接种记录
            </Button>
          </Space>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载接种记录…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} action={<Button size="small" onClick={() => load(queriedId)}>重试</Button>} />
        )}

        {!loading && !error && !data && <Alert type="info" showIcon message="输入患者标识后查询其接种记录。" />}

        {!loading && !error && data && reminder && (
          <>
            {/* 下一针提醒横幅 */}
            {reminder.hasNext ? (
              <Alert
                type={reminder.overdue ? 'error' : reminder.inWindow ? 'warning' : 'info'}
                showIcon
                style={{ marginBottom: 16 }}
                message={reminder.message}
              />
            ) : (
              <Alert type="success" showIcon style={{ marginBottom: 16 }} message={reminder.message} />
            )}

            {/* 核心指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="接种计划" value={data.plans.length} suffix="份" />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="已种剂次" value={doneCount} suffix={`/ ${totalCount}`} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="下一针应种" value={reminder.hasNext ? `${reminder.dueDate ?? '-'}` : '—'} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="提醒窗口"
                    value={reminder.hasNext ? `${reminder.remindDate ?? '-'}` : '—'}
                  />
                </Card>
              </Col>
            </Row>

            {/* 接种计划台账 */}
            <Card title={`接种计划台账（患者 ${queriedId}）`} size="small">
              {data.plans.length === 0 ? (
                <Alert type="info" showIcon message="该患者暂无接种计划，点击右上角「登记接种」创建。" />
              ) : (
                <Table rowKey="id" columns={planColumns} dataSource={data.plans} pagination={false} size="middle" />
              )}
            </Card>
          </>
        )}
      </Content>

      {/* 登记接种弹窗 */}
      <Modal
        title="登记接种"
        open={modalOpen}
        onOk={submit}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        okText="确认登记"
        width={560}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="新患者：填患者标识 + 疫苗名称（系统自动排程并种第 1 针）；续种：填接种计划 recordId。"
        />
        <Form form={form} layout="vertical">
          <Form.Item name="patientId" label="患者标识" rules={[{ required: true, message: '请输入患者标识' }]}>
            <Input placeholder="如 P10086" />
          </Form.Item>
          <Form.Item name="recordId" label="接种计划 recordId（续种时填写）">
            <Input placeholder="续种已有计划时填，首针留空" />
          </Form.Item>
          <Form.Item name="vaccineName" label="疫苗名称（首针时填写）">
            <Input placeholder="如 乙肝疫苗 / HPV九价 / 新冠灭活 / 流感疫苗" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="doses" label="全程剂次（留空按类别默认）">
                <InputNumber min={1} max={10} style={{ width: '100%' }} placeholder="默认" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dose" label="接种剂次（续种，留空自动）">
                <InputNumber min={1} max={10} style={{ width: '100%' }} placeholder="自动下一针" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nurseId" label="接种护士工号" rules={[{ required: true, message: '请输入接种护士工号' }]}>
                <Input placeholder="如 N2048" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batchNo" label="疫苗批号" rules={[{ required: true, message: '请输入疫苗批号' }]}>
                <Input placeholder="如 20260912A" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Layout>
  );
}
