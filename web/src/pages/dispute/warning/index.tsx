/**
 * 健澜科技 jlmedaios - 医疗纠纷预警页（M188-D）
 *
 * 投诉率/纠纷率/赔款 + 高风险科室/医生 + 预警案例。深海蓝 VI。
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
  complaintRate: number;
  disputeRate: number;
  totalCompensation: number;
  highRiskDepts: Array<{ dept: string; count: number }>;
  highRiskDoctors: Array<{ doctor: string; count: number }>;
  disputeCauses: Array<{ cause: string; count: number }>;
  predictedRiskCases: Array<{ patientId: string; level: string; reason: string }>;
  suggestions: string[];
}

function levelColor(l: string): string {
  if (l === 'high') return 'red';
  if (l === 'medium') return 'orange';
  return 'default';
}

export default function DisputeWarningPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/dispute/warning/report');
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
        <Title level={3} style={{ color: VI.deep }}>医疗纠纷 · 预警看板</Title>
        <Paragraph type="secondary">投诉率 / 纠纷率 / 赔款 / 高风险科室医生 / 预警案例</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="投诉率" value={`${(data.complaintRate * 100).toFixed(2)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="纠纷率" value={`${(data.disputeRate * 100).toFixed(2)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="赔款总额" value={data.totalCompensation} prefix="¥" /></Card></Col>
              <Col span={6}><Card><Statistic title="预警病例数" value={data.predictedRiskCases.length} valueStyle={{ color: '#cf1322' }} /></Card></Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title={<Text strong style={{ color: VI.deep }}>高风险科室</Text>}>
                  <Table
                    rowKey="dept"
                    size="small"
                    pagination={false}
                    dataSource={data.highRiskDepts}
                    columns={[
                      { title: '科室', dataIndex: 'dept', key: 'dept' },
                      { title: '纠纷数', dataIndex: 'count', key: 'count' },
                    ]}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title={<Text strong style={{ color: VI.deep }}>高风险医生</Text>}>
                  <Table
                    rowKey="doctor"
                    size="small"
                    pagination={false}
                    dataSource={data.highRiskDoctors}
                    columns={[
                      { title: '医生', dataIndex: 'doctor', key: 'doctor' },
                      { title: '纠纷数', dataIndex: 'count', key: 'count' },
                    ]}
                  />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>纠纷原因分析</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="cause"
                size="small"
                pagination={false}
                dataSource={data.disputeCauses}
                columns={[
                  { title: '原因', dataIndex: 'cause', key: 'cause' },
                  { title: '例数', dataIndex: 'count', key: 'count' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>预警病例</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="patientId"
                size="small"
                pagination={false}
                dataSource={data.predictedRiskCases}
                columns={[
                  { title: '患者ID', dataIndex: 'patientId', key: 'patientId' },
                  {
                    title: '风险等级',
                    dataIndex: 'level',
                    key: 'level',
                    render: (l: string) => <Tag color={levelColor(l)}>{l}</Tag>,
                  },
                  { title: '原因', dataIndex: 'reason', key: 'reason' },
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
