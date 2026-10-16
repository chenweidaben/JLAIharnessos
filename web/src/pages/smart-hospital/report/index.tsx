/**
 * 健澜科技 jlmedaios - 智慧医院评价页（M210-A）
 *
 * 三位一体/信息平台/患者体验/员工体验/评价准备。深海蓝 VI。
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
  triad: { smartMedical: number; smartService: number; smartManagement: number };
  platform: { integrated: boolean };
  patientExperience: { nps: number };
  employeeExperience: { satisfaction: number };
  readiness: { selfAssessment: number; gapAnalysis: number; rectification: number };
  suggestions: string[];
}

export default function SmartHospitalReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/smart-hospital/report');
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
        <Title level={3} style={{ color: VI.deep }}>智慧医院评价体系</Title>
        <Paragraph type="secondary">智慧医疗 / 智慧服务 / 智慧管理三位一体 / 患者体验 NPS / 员工满意度</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="智慧医疗" value={data.triad.smartMedical} /></Card></Col>
              <Col span={6}><Card><Statistic title="智慧服务" value={data.triad.smartService} /></Card></Col>
              <Col span={6}><Card><Statistic title="智慧管理" value={data.triad.smartManagement} /></Card></Col>
              <Col span={6}><Card><Statistic title="患者 NPS" value={data.patientExperience.nps} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>三位一体评价</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'm', name: '智慧医疗', value: data.triad.smartMedical },
                  { key: 's', name: '智慧服务', value: data.triad.smartService },
                  { key: 'g', name: '智慧管理', value: data.triad.smartManagement },
                ]}
                columns={[
                  { title: '维度', dataIndex: 'name', key: 'name' },
                  { title: '得分', dataIndex: 'value', key: 'value' },
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
