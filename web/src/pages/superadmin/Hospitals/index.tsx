/**
 * 健澜科技 jlmedaios - M133-B 超管后台「医院管理」页（仅 superadmin）
 *
 * 【SaaS化+智慧度】平台超级管理员视角：
 *  - 医院列表：全部接入租户的启停、院区规模、用户量、床位使用率；
 *  - 健康度：综合智慧度/EMR 评级/活跃/床位，红黄标签一眼定位问题医院；
 *  - 新建医院：开通 SaaS 实例（名称 + 初始配置）；
 *  - 医院配置：启停医院、调整智慧度/EMR/床位等运营参数。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 * 数据：/api/v1/superadmin/hospitals（GET/POST/PUT），仅 superadmin 角色可访问。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ------------------------------------------------------------------ */
/* 类型（与 BFF buildHospitalAdminDashboard 输出对齐）                    */
/* ------------------------------------------------------------------ */

type HospitalHealth = 'healthy' | 'warning' | 'critical';

interface HospitalItem {
  id: string;
  name: string;
  enabled: boolean;
  campusCount: number;
  userCount: number;
  activeUsersToday: number;
  wisdomScore: number;
  emrLevel: number;
  bedUsageRate: number;
  health: HospitalHealth;
  healthReasons: string[];
  config: Record<string, unknown>;
  createdAt?: string;
}

interface HospitalList {
  total: number;
  enabledCount: number;
  disabledCount: number;
  avgWisdomScore: number;
  items: HospitalItem[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const HEALTH_META: Record<HospitalHealth, { color: string; text: string }> = {
  healthy: { color: 'success', text: '健康' },
  warning: { color: 'warning', text: '预警' },
  critical: { color: 'error', text: '严重' },
};

/* ------------------------------------------------------------------ */
/* 组件                                                                  */
/* ------------------------------------------------------------------ */

export default function SuperAdminHospitalsPage() {
  const [data, setData] = useState<HospitalList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 新建医院弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();

  // 配置抽屉
  const [editTarget, setEditTarget] = useState<HospitalItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/superadmin/hospitals');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as HospitalList);
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

  /** 新建医院提交 */
  const handleCreate = async () => {
    const values = await createForm.validateFields();
    setCreating(true);
    try {
      const resp = await fetch('/api/v1/superadmin/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          config: {
            wisdomScore: values.wisdomScore ?? 0,
            emrLevel: values.emrLevel ?? 0,
            bedTotal: values.bedTotal ?? 0,
            bedOccupied: values.bedOccupied ?? 0,
          },
        }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        message.error(json.message || '创建失败');
        return;
      }
      message.success('医院已创建');
      setCreateOpen(false);
      createForm.resetFields();
      void load();
    } finally {
      setCreating(false);
    }
  };

  /** 打开配置抽屉 */
  const openEdit = (item: HospitalItem) => {
    setEditTarget(item);
    editForm.setFieldsValue({
      enabled: item.enabled,
      wisdomScore: item.wisdomScore,
      emrLevel: item.emrLevel,
      bedTotal: item.config.bedTotal ?? 0,
      bedOccupied: item.config.bedOccupied ?? 0,
      activeUsersToday: item.activeUsersToday,
    });
  };

  /** 保存配置 */
  const handleSave = async () => {
    if (!editTarget) return;
    const values = await editForm.validateFields();
    setSaving(true);
    try {
      const resp = await fetch(`/api/v1/superadmin/hospitals/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: values.enabled,
          config: {
            wisdomScore: values.wisdomScore,
            emrLevel: values.emrLevel,
            bedTotal: values.bedTotal,
            bedOccupied: values.bedOccupied,
            activeUsersToday: values.activeUsersToday,
          },
        }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        message.error(json.message || '保存失败');
        return;
      }
      message.success('医院配置已更新');
      setEditTarget(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<HospitalItem> = [
    {
      title: '医院名称',
      dataIndex: 'name',
      render: (name: string, row) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{name}</span>
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{row.id}</span>
        </Space>
      ),
    },
    {
      title: '健康度',
      dataIndex: 'health',
      width: 110,
      render: (h: HospitalHealth, row) => (
        <Space direction="vertical" size={2}>
          <Tag color={HEALTH_META[h].color}>{HEALTH_META[h].text}</Tag>
          {row.healthReasons.slice(0, 1).map((r, i) => (
            <span key={i} style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
              {r}
            </span>
          ))}
        </Space>
      ),
    },
    {
      title: '智慧度',
      dataIndex: 'wisdomScore',
      width: 100,
      render: (v: number) => (
        <span style={{ color: v >= 80 ? VI.accent : v >= 60 ? '#d48806' : '#cf1322', fontWeight: 600 }}>
          {v} 分
        </span>
      ),
    },
    {
      title: 'EMR 评级',
      dataIndex: 'emrLevel',
      width: 90,
      render: (v: number) => <Tag>L{v}</Tag>,
    },
    {
      title: '院区',
      dataIndex: 'campusCount',
      width: 70,
    },
    {
      title: '注册用户',
      dataIndex: 'userCount',
      width: 90,
    },
    {
      title: '今日活跃',
      dataIndex: 'activeUsersToday',
      width: 90,
    },
    {
      title: '床位使用率',
      dataIndex: 'bedUsageRate',
      width: 110,
      render: (v: number) => `${v}%`,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) =>
        v ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>,
    },
    {
      title: '操作',
      width: 100,
      render: (_, row) => (
        <Button size="small" type="link" onClick={() => openEdit(row)}>
          配置
        </Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            医院管理（超管）
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
            SaaS 化多租户纳管 · 仅 superadmin 可见 · 不触碰单院业务 PII
          </Paragraph>
        </div>
        <Button type="primary" size="large" onClick={() => setCreateOpen(true)}
          style={{ background: VI.accent, borderColor: VI.accent }}>
          + 新建医院
        </Button>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* loading / error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载医院列表…" />
          </div>
        )}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button size="small" onClick={load}>重试</Button>}
          />
        )}

        {!loading && !error && data && (
          <>
            {/* 汇总卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="医院总数" value={data.total} suffix="家" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="启用中" value={data.enabledCount} valueStyle={{ color: '#3f8600' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="已停用" value={data.disabledCount} valueStyle={{ color: '#cf1322' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="平均智慧度" value={data.avgWisdomScore} suffix="分"
                    valueStyle={{ color: VI.accent }} />
                </Card>
              </Col>
            </Row>

            {/* 医院列表 */}
            <Card title="接入医院列表" size="small">
              <Table
                rowKey="id"
                columns={columns}
                dataSource={data.items}
                pagination={false}
                size="middle"
              />
            </Card>
          </>
        )}
      </Content>

      {/* 新建医院弹窗 */}
      <Modal
        title="新建医院（开通 SaaS 实例）"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item name="name" label="医院名称" rules={[{ required: true, message: '请输入医院名称' }]}>
            <Input placeholder="例如：杭州示范医院" maxLength={64} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="wisdomScore" label="初始智慧度（0-100）" initialValue={60}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="emrLevel" label="EMR 评级（0-5）" initialValue={3}>
                <InputNumber min={0} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bedTotal" label="开放床位" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bedOccupied" label="已占用床位" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 医院配置抽屉 */}
      <Drawer
        title={editTarget ? `配置 · ${editTarget.name}` : '医院配置'}
        width={420}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        destroyOnClose
        extra={
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存
          </Button>
        }
      >
        <Form form={editForm} layout="vertical" preserve={false}>
          <Form.Item name="enabled" label="启用状态（停用后该院立即拒绝访问）" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item name="wisdomScore" label="智慧度评分（0-100）">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="emrLevel" label="电子病历评级（0-5）">
            <InputNumber min={0} max={5} style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bedTotal" label="开放床位">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bedOccupied" label="已占用床位">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="activeUsersToday" label="今日活跃用户">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>
    </Layout>
  );
}
