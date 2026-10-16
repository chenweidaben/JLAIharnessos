/**
 * 健澜科技 jlmedaios - 安全渗透测试页（M193-B）
 *
 * OWASP Top 10 / 漏洞分级 / 基线 / 数据安全 / 访问控制。深海蓝 VI。
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
  timeRange: string;
  totalVulnerabilities: number;
  bySeverity: { high: number; medium: number; low: number };
  baseline: { passed: boolean; gaps: string[] };
  dataSecurity: { classification: number; maskingRate: number; encryptionRate: number };
  accessControl: { rbacCoverage: number; minPrivilegeRate: number; audited: number };
  suggestions: string[];
}

export default function SecurityPenTestPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/security/pen-test');
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
        <Title level={3} style={{ color: VI.deep }}>安全渗透测试</Title>
        <Paragraph type="secondary">OWASP Top 10 / 漏洞分级 / 安全基线 / 数据安全 / 访问控制</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="高危漏洞">
                  <Statistic value={data.bySeverity.high} valueStyle={{ color: '#cf1322' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="中危漏洞">
                  <Statistic value={data.bySeverity.medium} valueStyle={{ color: '#d46b08' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="低危漏洞">
                  <Statistic value={data.bySeverity.low} valueStyle={{ color: '#3f8600' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="安全基线">
                  {data.baseline.passed ? <Tag color="green">达标</Tag> : <Tag color="red">未达标</Tag>}
                  <Text> {data.baseline.gaps.length} 项缺项</Text>
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>数据安全</Text>} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="数据分类分级" value={`${data.dataSecurity.classification} 级`} />
                </Col>
                <Col span={8}>
                  <Card title="脱敏率">
                    <Progress percent={Math.round(data.dataSecurity.maskingRate * 100)} size="small" status="success" />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card title="加密率">
                    <Progress percent={Math.round(data.dataSecurity.encryptionRate * 100)} size="small" status="success" />
                  </Card>
                </Col>
              </Row>
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>修复建议</Text>}>
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
