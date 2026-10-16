/**
 * 健澜科技 jlmedaios - 安全加固页 V2（M187-B）
 *
 * XSS/CSRF/SQLi/PHI 脱敏率审计 + 修复建议。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
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
  timeRange: string;
  xssFindings: Array<{ input: string; risk: string }>;
  csrfCoverage: number;
  sqliCoverage: number;
  phiMaskingRate: number;
  recommendations: string[];
}

export default function SecurityReportV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/security/report-v2');
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
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>安全加固 · 漏洞审计</Title>
        <Paragraph type="secondary">XSS / CSRF / SQL 注入 / PHI 脱敏率</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="CSRF 覆盖率">
                  <Progress percent={Math.round(data.csrfCoverage * 100)} status="success" />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="参数化查询覆盖率">
                  <Progress percent={Math.round(data.sqliCoverage * 100)} status={data.sqliCoverage >= 0.95 ? 'success' : 'exception'} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="PHI 脱敏率">
                  <Progress percent={Math.round(data.phiMaskingRate * 100)} status="success" />
                </Card>
              </Col>
              <Col span={6}>
                <Card><Statistic title="XSS 风险数" value={data.xssFindings.length} /></Card>
              </Col>
            </Row>

            {data.xssFindings.length > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={`发现 ${data.xssFindings.length} 处 XSS 风险输入`}
                description={
                  <Table
                    rowKey="input"
                    size="small"
                    pagination={false}
                    dataSource={data.xssFindings}
                    columns={[
                      { title: '输入', dataIndex: 'input', key: 'input' },
                      { title: '风险', dataIndex: 'risk', key: 'risk' },
                    ]}
                  />
                }
              />
            )}

            <Card title={<Text strong style={{ color: VI.deep }}>修复建议</Text>}>
              <List
                size="small"
                dataSource={data.recommendations}
                renderItem={(r) => <List.Item><Tag color="blue">建议</Tag><Text style={{ marginLeft: 8 }}>{r}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
