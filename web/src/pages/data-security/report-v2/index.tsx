/**
 * 健澜科技 jlmedaios - 数据安全 V2 页（M217-A）
 *
 * 分类分级/加密/脱敏/RBAC·ABAC/DLP/个保法/数据出境。深海蓝 VI。
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
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  classification: { public: number; internal: number; sensitive: number; core: number };
  encryption: { tls: boolean; aes: boolean; field: boolean };
  masking: { static: number; dynamic: number };
  accessControl: { rbac: boolean; abac: boolean };
  audit: { logs: number };
  dlp: { rules: number };
  pipl: { compliance: boolean };
  export: { approved: number };
  suggestions: string[];
}

export default function DataSecurityV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/data-security/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>数据安全与隐私保护 V2</Title>
        <Paragraph type="secondary">分类分级 / TLS·AES 加密 / 静态·动态脱敏 / RBAC·ABAC / DLP / 个保法合规</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="核心数据" value={data.classification.core} /></Card></Col>
              <Col span={6}><Card><Statistic title="敏感数据" value={data.classification.sensitive} /></Card></Col>
              <Col span={6}><Card><Statistic title="审计日志" value={data.audit.logs} /></Card></Col>
              <Col span={6}><Card><Statistic title="DLP 规则" value={data.dlp.rules} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>加密与访问控制</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'tls', name: 'TLS 传输加密', value: data.encryption.tls ? '已启用' : '未启用' },
                  { key: 'aes', name: 'AES 存储加密', value: data.encryption.aes ? '已启用' : '未启用' },
                  { key: 'field', name: '字段级加密', value: data.encryption.field ? '已启用' : '未启用' },
                  { key: 'rbac', name: 'RBAC 角色权限', value: data.accessControl.rbac ? '已启用' : '未启用' },
                  { key: 'abac', name: 'ABAC 属性权限', value: data.accessControl.abac ? '已启用' : '未启用' },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '状态', dataIndex: 'value', key: 'value' },
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
