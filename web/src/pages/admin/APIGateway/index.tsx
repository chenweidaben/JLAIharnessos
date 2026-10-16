/**
 * 健澜科技 jlmedaios - M164-D API 网关管理页（系统集成深化，仅 admin）
 *
 * 【数据中台与AI大脑】
 *  - 统一入口看板：展示网关核心能力与高可用说明（无状态多实例共享，非单点）；
 *  - 登记路由：POST /api/v1/api-gateway/route（入口路径 + 方法 + 目标系统 + 认证模式）；
 *  - 登记外部系统：POST /api/v1/api-gateway/external（第三方对接台账）；
 *  - 认证鉴权（API Key / JWT / SSO）、QPS 限流、熔断三态、日志监控说明。
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Layout,
  message,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
};

const AUTH_MODES = [
  { label: 'API Key（机器对机器）', value: 'api_key' },
  { label: 'JWT（院内用户）', value: 'jwt' },
  { label: 'SSO（医联体单点登录）', value: 'sso' },
];

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function APIGatewayAdminPage() {
  const [routeOpen, setRouteOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [routeForm] = Form.useForm();
  const [systemForm] = Form.useForm();

  const createRoute = async () => {
    const values = await routeForm.validateFields();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/api-gateway/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        message.error(json.message || '登记路由失败');
        return;
      }
      message.success('网关路由已登记');
      setRouteOpen(false);
      routeForm.resetFields();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '网络异常');
    } finally {
      setSubmitting(false);
    }
  };

  const createSystem = async () => {
    const values = await systemForm.validateFields();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/api-gateway/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        message.error(json.message || '登记外部系统失败');
        return;
      }
      message.success('外部系统已登记');
      setSystemOpen(false);
      systemForm.resetFields();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '网络异常');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            API 网关与第三方对接
          </Title>
          <Paragraph type="secondary">
            数据中台与AI大脑：院内服务与外部系统（区域卫生平台 / 医联体 / 医保商保 / BI）的统一入口。
            网关无状态、配置与熔断态持久化共享，多实例水平扩展，单点宕机不影响整体。
          </Paragraph>
        </div>

        {/* 能力概览 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small" headStyle={{ background: VI.deep, color: '#fff' }} title="统一入口">
              <Statistic title="收敛路径" value="/api/v1/gateway/*" valueStyle={{ fontSize: 16, color: VI.deep }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" headStyle={{ background: VI.deep, color: '#fff' }} title="认证鉴权">
              <Space wrap>
                <Tag color="geekblue">API Key</Tag>
                <Tag color="blue">JWT</Tag>
                <Tag color="cyan">SSO</Tag>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" headStyle={{ background: VI.deep, color: '#fff' }} title="限流熔断">
              <Space wrap>
                <Tag color="green">QPS 限流</Tag>
                <Tag color="orange">熔断三态</Tag>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" headStyle={{ background: VI.deep, color: '#fff' }} title="日志监控">
              <Text type="secondary">请求日志 / 响应时间 / 错误率</Text>
            </Card>
          </Col>
        </Row>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="高可用说明：网关实例本身无状态，路由表、外部系统台账与熔断器状态全部落 Postgres，多实例共享同一份配置；任一实例故障，其余实例从共享状态继续服务。"
        />

        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" style={{ background: VI.accent, borderColor: VI.accent }} onClick={() => setRouteOpen(true)}>
            登记路由
          </Button>
          <Button style={{ background: VI.deep, color: '#fff' }} onClick={() => setSystemOpen(true)}>
            登记外部系统
          </Button>
        </Space>

        {/* 登记路由弹窗 */}
        <Modal
          title="登记网关路由"
          open={routeOpen}
          onCancel={() => setRouteOpen(false)}
          onOk={() => void createRoute()}
          confirmLoading={submitting}
          okText="登记"
          cancelText="取消"
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="路由按 (入口路径, 方法) 唯一；目标系统须先在「登记外部系统」中建立。"
          />
          <Form form={routeForm} layout="vertical" initialValues={{ method: 'GET', authMode: 'api_key', qpsLimit: 50, timeoutMs: 5000 }}>
            <Form.Item label="入口路径 routePath" name="routePath" rules={[{ required: true, message: '如 /lab/results' }]}>
              <Input placeholder="/lab/results" />
            </Form.Item>
            <Form.Item label="HTTP 方法" name="method" rules={[{ required: true }]}>
              <Select options={METHODS.map((m) => ({ label: m, value: m }))} />
            </Form.Item>
            <Form.Item label="目标系统名 targetSystem" name="targetSystem" rules={[{ required: true, message: '如 region-platform' }]}>
              <Input placeholder="region-platform" />
            </Form.Item>
            <Form.Item label="目标系统路径 targetEndpoint" name="targetEndpoint" rules={[{ required: true, message: '如 /open/lab/v1/results' }]}>
              <Input placeholder="/open/lab/v1/results" />
            </Form.Item>
            <Form.Item label="认证模式" name="authMode" rules={[{ required: true }]}>
              <Select options={AUTH_MODES} />
            </Form.Item>
            <Form.Item label="QPS 上限" name="qpsLimit">
              <Input type="number" min={1} max={1000} />
            </Form.Item>
            <Form.Item label="超时（ms）" name="timeoutMs">
              <Input type="number" min={100} max={60000} />
            </Form.Item>
            <Form.Item label="说明" name="description">
              <Input placeholder="例：区域检验结果回传" />
            </Form.Item>
          </Form>
        </Modal>

        {/* 登记外部系统弹窗 */}
        <Modal
          title="登记外部对接系统"
          open={systemOpen}
          onCancel={() => setSystemOpen(false)}
          onOk={() => void createSystem()}
          confirmLoading={submitting}
          okText="登记"
          cancelText="取消"
        >
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="endpoint 仅允许 https（开发环境 localhost 例外）；凭证不填明文，仅填密钥引用标识 credentialRef。"
          />
          <Form form={systemForm} layout="vertical" initialValues={{ authMode: 'api_key', qpsLimit: 50, timeoutMs: 5000 }}>
            <Form.Item label="系统名 systemName" name="systemName" rules={[{ required: true, message: '不含空白字符' }]}>
              <Input placeholder="region-platform" />
            </Form.Item>
            <Form.Item label="根地址 endpoint" name="endpoint" rules={[{ required: true, message: 'https://...' }]}>
              <Input placeholder="https://region.hospital.cn/open" />
            </Form.Item>
            <Form.Item label="认证模式" name="authMode" rules={[{ required: true }]}>
              <Select options={AUTH_MODES} />
            </Form.Item>
            <Form.Item label="凭证引用 credentialRef" name="credentialRef">
              <Input placeholder="kms://region-platform/apikey" />
            </Form.Item>
            <Form.Item label="QPS 上限" name="qpsLimit">
              <Input type="number" min={1} max={1000} />
            </Form.Item>
            <Form.Item label="超时（ms）" name="timeoutMs">
              <Input type="number" min={100} max={60000} />
            </Form.Item>
            <Form.Item label="说明" name="description">
              <Input placeholder="医院/厂商/用途" />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}
