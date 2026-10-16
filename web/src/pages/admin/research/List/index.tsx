/**
 * 健澜科技 jlmedaios - M140-B 科研项目管理页（医院管理深化，仅 admin）
 *
 * 展示 BFF /api/v1/admin/research 的科研项目台账。
 * 核心红线：跟踪到结题，不能登记完就不管了——
 *   申报中 -> 进行中 -> 已结题 -> 已验收，进度 100% 自动收口为已结题。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无项目）。
 * 视觉：深海蓝 VI（#0a2540 -> #123a5e 渐变头部）。
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
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type ResearchStatus = 'applying' | 'active' | 'completed' | 'accepted';

interface ResearchProject {
  id: string;
  title: string;
  leaderId: string;
  dept: string;
  funding: number;
  startDate: string;
  endDate: string;
  status: ResearchStatus;
  progress: number;
  milestone: string;
}

interface ResearchView {
  projects: ResearchProject[];
  statusLabel: Record<ResearchStatus, string>;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const STATUS_META: Record<ResearchStatus, { color: string; text: string }> = {
  applying: { color: 'default', text: '申报中' },
  active: { color: 'processing', text: '进行中' },
  completed: { color: 'cyan', text: '已结题' },
  accepted: { color: 'success', text: '已验收' },
};

export default function ResearchListPage() {
  const [data, setData] = useState<ResearchView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [progressTarget, setProgressTarget] = useState<ResearchProject | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [regForm] = Form.useForm();
  const [progForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/research');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as ResearchView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submitRegister = async () => {
    const values = await regForm.validateFields();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/admin/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        Modal.error({ title: '登记失败', content: json.message || '请稍后重试' });
      } else {
        setRegisterOpen(false);
        regForm.resetFields();
        void load();
      }
    } catch (e) {
      Modal.error({ title: '网络异常', content: e instanceof Error ? e.message : '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitProgress = async () => {
    if (!progressTarget) return;
    const values = await progForm.validateFields();
    setSubmitting(true);
    try {
      const resp = await fetch(`/api/v1/admin/research/${progressTarget.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        Modal.error({ title: '更新失败', content: json.message || '请稍后重试' });
      } else {
        setProgressTarget(null);
        progForm.resetFields();
        void load();
      }
    } catch (e) {
      Modal.error({ title: '网络异常', content: e instanceof Error ? e.message : '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const openProgress = (row: ResearchProject) => {
    progForm.setFieldsValue({ progress: row.progress, milestone: row.milestone });
    setProgressTarget(row);
  };

  const columns: ColumnsType<ResearchProject> = [
    { title: '编号', dataIndex: 'id', width: 130 },
    { title: '课题名称', dataIndex: 'title' },
    { title: '负责人', dataIndex: 'leaderId', width: 90 },
    { title: '承担科室', dataIndex: 'dept', width: 120 },
    {
      title: '经费(万)',
      dataIndex: 'funding',
      width: 100,
      render: (v: number) => <Text strong>{v.toFixed(2)}</Text>,
    },
    {
      title: '工期',
      dataIndex: 'startDate',
      width: 180,
      render: (_: unknown, row) => `${row.startDate} ~ ${row.endDate}`,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 140,
      render: (v: number, row) => (
        <Progress
          percent={v}
          size="small"
          status={row.status === 'accepted' ? 'success' : v >= 100 ? 'active' : 'normal'}
        />
      ),
    },
    { title: '当前里程碑', dataIndex: 'milestone', width: 140, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: ResearchStatus) => <Tag color={STATUS_META[s].color}>{STATUS_META[s].text}</Tag>,
    },
    {
      title: '操作',
      width: 110,
      render: (_: unknown, row) => (
        <Button
          size="small"
          type="link"
          disabled={row.status === 'accepted'}
          onClick={() => openProgress(row)}
        >
          更新进度
        </Button>
      ),
    },
  ];

  const projects = data?.projects ?? [];
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const doneCount = projects.filter((p) => p.status === 'completed' || p.status === 'accepted').length;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              科研项目管理 · 全周期跟踪
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              申报中 / 进行中 / 已结题 / 已验收 · 跟踪到结题，不登记完就不管
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" style={{ background: VI.accent, borderColor: VI.accent }} onClick={() => setRegisterOpen(true)}>
              登记新项目
            </Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载科研项目台账…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && !error && projects.length === 0 && (
          <Alert type="info" showIcon message="暂无科研项目，点击右上角「登记新项目」开始。" />
        )}

        {!loading && !error && projects.length > 0 && (
          <>
            {/* 闭环统计横幅 */}
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`共 ${projects.length} 项课题：进行中 ${activeCount} 项，已结题/已验收 ${doneCount} 项。`}
            />
            <Card title="科研项目台账" size="small">
              <Table rowKey="id" columns={columns} dataSource={projects} pagination={false} size="middle" />
            </Card>
          </>
        )}
      </Content>

      {/* 登记新项目弹窗 */}
      <Modal
        title="登记科研项目"
        open={registerOpen}
        onOk={submitRegister}
        confirmLoading={submitting}
        onCancel={() => setRegisterOpen(false)}
        okText="确认登记"
        width={560}
      >
        <Form form={regForm} layout="vertical">
          <Form.Item name="title" label="课题名称" rules={[{ required: true, message: '请输入课题名称' }]}>
            <Input placeholder="如：基于多组学的肺癌早期预警研究" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="leaderId" label="课题负责人工号" rules={[{ required: true, message: '请输入负责人' }]}>
                <Input placeholder="如 D10086" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dept" label="承担科室" rules={[{ required: true, message: '请输入承担科室' }]}>
                <Input placeholder="如 呼吸与危重症医学科" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="funding" label="经费（万元）" rules={[{ required: true, message: '请输入经费' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="如 20.00" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="开始日期" rules={[{ required: true, message: '请选择开始日期' }]}>
                <Input placeholder="yyyy-mm-dd" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="结束日期" rules={[{ required: true, message: '请选择结束日期' }]}>
                <Input placeholder="yyyy-mm-dd" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 更新进度弹窗 */}
      <Modal
        title={progressTarget ? `更新进度 · ${progressTarget.id}` : ''}
        open={progressTarget !== null}
        onOk={submitProgress}
        confirmLoading={submitting}
        onCancel={() => setProgressTarget(null)}
        okText="确认更新"
      >
        <Form form={progForm} layout="vertical">
          <Form.Item
            name="progress"
            label="完成进度（%，100 自动收口为已结题）"
            rules={[{ required: true, message: '请输入进度' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="milestone"
            label="当前里程碑"
            rules={[{ required: true, message: '请输入里程碑' }]}
            extra="结题后再录入「验收通过」即可转为已验收闭环。"
          >
            <Select
              placeholder="选择或输入里程碑"
              options={[
                { value: '伦理审查通过', label: '伦理审查通过' },
                { value: '立项公示', label: '立项公示' },
                { value: '中期检查', label: '中期检查' },
                { value: '数据锁库', label: '数据锁库' },
                { value: '论文发表', label: '论文发表' },
                { value: '结题材料提交', label: '结题材料提交' },
                { value: '验收通过', label: '验收通过' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
