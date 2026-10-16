/**
 * 健澜科技 jlmedaios - 系统验收页（M200-A）
 *
 * 功能/集成/性能/安全/兼容性/UAT/迁移/验收报告。深海蓝 VI。
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
  functional: { outpatient: boolean; inpatient: boolean; surgery: boolean; pharmacy: boolean; lab: boolean; imaging: boolean };
  integration: { microserviceApis: number; dataConsistency: boolean; transactionIntegrity: boolean };
  performance: { passed: boolean; p99Ms: number };
  security: { passed: boolean; vulnerabilities: number };
  compatibility: { browsers: number; devices: number };
  uat: { doctor: boolean; nurse: boolean; pharmacist: boolean; admin: boolean; patient: boolean };
  migration: { passed: boolean };
  summary: { overallPass: boolean; passRate: number; grade: string };
  suggestions: string[];
}

export default function AcceptancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/acceptance/report');
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
        <Title level={3} style={{ color: VI.deep }}>M200 系统验收</Title>
        <Paragraph type="secondary">端到端功能 / 集成 / 性能 / 安全 / 兼容性 / UAT / 数据迁移</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card title="总体通过率">
                  <Progress type="circle" percent={data.summary.passRate} size={70} />
                </Card>
              </Col>
              <Col span={6}>
                <Card title="验收等级">
                  <Tag color="green" style={{ fontSize: 20, padding: '4px 12px' }}>{data.summary.grade}</Tag>
                </Card>
              </Col>
              <Col span={6}><Card><Statistic title="P99 延迟(ms)" value={data.performance.p99Ms} /></Card></Col>
              <Col span={6}><Card><Statistic title="安全漏洞" value={data.security.vulnerabilities} valueStyle={{ color: '#52c41a' }} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>UAT 五角色验收</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'doc', name: '医生', pass: data.uat.doctor },
                  { key: 'nur', name: '护士', pass: data.uat.nurse },
                  { key: 'pha', name: '药师', pass: data.uat.pharmacist },
                  { key: 'adm', name: '管理员', pass: data.uat.admin },
                  { key: 'pat', name: '患者', pass: data.uat.patient },
                ]}
                columns={[
                  { title: '角色', dataIndex: 'name', key: 'name' },
                  { title: '验收通过', dataIndex: 'pass', key: 'pass', render: (p: boolean) => <Tag color={p ? 'green' : 'red'}>{p ? '通过' : '未通过'}</Tag> },
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
