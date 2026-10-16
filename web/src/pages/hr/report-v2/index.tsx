/**
 * 健澜科技 jlmedaios - 人力资源 V2 页（M211-C）
 *
 * 人事/排班/考勤/薪酬/培训/人才梯队/员工关系/编制。深海蓝 VI。
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
  personnel: { total: number; onBoard: number; offBoard: number };
  schedule: { shifts: number };
  attendance: { rate: number };
  compensation: { avgSalary: number; socialInsurance: number };
  training: { hours: number };
  talent: { pipeline: number };
  relations: { satisfaction: number };
  establishment: { approved: number; actual: number };
  suggestions: string[];
}

export default function HRV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/hr/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>人力资源与薪酬管理 V2</Title>
        <Paragraph type="secondary">入转调离 / 排班考勤 / 薪酬社保 / 培训发展 / 人才梯队 / 编制管理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="总人数" value={data.personnel.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="入职" value={data.personnel.onBoard} /></Card></Col>
              <Col span={6}><Card><Statistic title="离职" value={data.personnel.offBoard} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均薪酬" value={`${data.compensation.avgSalary} 元`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>编制管理</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'app', name: '批准编制', value: data.establishment.approved },
                  { key: 'act', name: '实际人数', value: data.establishment.actual },
                  { key: 'gap', name: '缺编', value: data.establishment.approved - data.establishment.actual },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '人数', dataIndex: 'value', key: 'value' },
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
