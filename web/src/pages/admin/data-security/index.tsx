/**
 * 健澜科技 jlmedaios - 数据安全页（M198-A）
 *
 * 分类分级/加密/脱敏/访问控制/DLP/备份/生命周期/隐私。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
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
  timeRange: string;
  classification: { public: number; internal: number; sensitive: number; core: number };
  encryption: { tls: boolean; aes: boolean; fieldLevel: number; keyRotation: number };
  masking: { static: number; dynamic: number; coverage: number };
  access: { rbac: boolean; abac: boolean; leastPrivilege: number; unauthorizedAttempts: number };
  dlp: { rules: number; blocked: number };
  backup: { daily: boolean; recoveryTimeHours: number; recoveryPointMinutes: number };
  lifecycle: { archived: number; deleted: number };
  privacy: { pia: number; consentRate: number };
  suggestions: string[];
}

export default function DataSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/data-security/report');
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
        <Title level={3} style={{ color: VI.deep }}>数据安全与隐私保护</Title>
        <Paragraph type="secondary">分类分级 / 加密 / 脱敏 / 访问控制 / DLP / 备份 / 生命周期 / PIA</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="核心数据" value={data.classification.core} /></Card></Col>
              <Col span={6}><Card><Statistic title="敏感数据" value={data.classification.sensitive} /></Card></Col>
              <Col span={6}><Card><Statistic title="脱敏覆盖率" value={`${(data.masking.coverage * 100).toFixed(1)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="越权尝试" value={data.access.unauthorizedAttempts} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>数据分类分级</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'pub', name: '公开', count: data.classification.public, color: 'green' },
                  { key: 'int', name: '内部', count: data.classification.internal, color: 'blue' },
                  { key: 'sen', name: '敏感', count: data.classification.sensitive, color: 'orange' },
                  { key: 'core', name: '核心', count: data.classification.core, color: 'red' },
                ]}
                columns={[
                  { title: '级别', dataIndex: 'name', key: 'name', render: (n: string, r: { color: string; [k: string]: unknown }) => <Tag color={r.color}>{n}</Tag> },
                  { title: '数量', dataIndex: 'count', key: 'count' },
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
