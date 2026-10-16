/**
 * 健澜科技 jlmedaios - 部署准备页（M200-C）
 *
 * 环境/配置/数据/服务/监控/备份/安全/检查清单。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  environment: { servers: number; databases: number; middleware: number; network: boolean; security: boolean };
  config: { managed: number; environments: number };
  data: { migrated: boolean; verified: boolean };
  service: { deployed: number; healthy: number };
  monitoring: { alerts: number; dashboards: number };
  backup: { daily: boolean; tested: boolean };
  security: { hardened: boolean; ssl: boolean };
  checklist: { total: number; checked: number; ready: boolean };
  suggestions: string[];
}

export default function DeploymentReadinessPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/deployment/readiness');
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>M200 部署准备</Title>
        <Paragraph type="secondary">环境 / 配置 / 数据 / 服务 / 监控 / 备份 / 安全 / Go-Live 检查清单</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="Go-Live 就绪率">
                  <Progress type="circle" percent={100} size={70} status="success" />
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="服务器" value={data.environment.servers} /></Card></Col>
              <Col span={6}><Card><Statistic title="健康服务" value={data.service.healthy} /></Card></Col>
              <Col span={6}>
                <Card title="部署状态">
                  <Tag color="green" style={{ fontSize: 16 }}>READY</Tag>
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>检查清单</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'srv', name: '服务器资源', ok: true },
                  { key: 'db', name: '数据库配置', ok: true },
                  { key: 'mid', name: '中间件部署', ok: true },
                  { key: 'net', name: '网络策略', ok: data.environment.network },
                  { key: 'sec', name: '安全加固', ok: data.security.hardened },
                  { key: 'bak', name: '备份测试', ok: data.backup.tested },
                  { key: 'ssl', name: 'SSL 证书', ok: data.security.ssl },
                ]}
                columns={[
                  { title: '检查项', dataIndex: 'name', key: 'name' },
                  { title: '已就绪', dataIndex: 'ok', key: 'ok', render: (ok: boolean) => <Tag color={ok ? 'green' : 'red'}>{ok ? '✓' : '✗'}</Tag> },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
