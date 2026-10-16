/**
 * 健澜科技 jlmedaios - 人力资源管理页（M191-C）
 *
 * 人员结构/职称/学历/流动/培训/考勤/成本 + 需求预测。深海蓝 VI。
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
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  dept: string;
  timeRange: string;
  structure: { doctors: number; nurses: number; technicians: number; admin: number; logistics: number };
  titleStructure: { senior: number; deputySenior: number; intermediate: number; junior: number };
  educationStructure: { phd: number; master: number; bachelor: number; college: number };
  turnover: { joined: number; left: number; transferred: number; turnoverRate: number };
  attendance: { attendanceRate: number };
  cost: { totalCost: number; perCapita: number };
  predictedNeed: { doctors: number; nurses: number; technicians: number };
  suggestions: string[];
}

export default function HRManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/hr/report');
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
        <Title level={3} style={{ color: VI.deep }}>人力资源管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">人员结构 / 职称 / 学历 / 流动 / 成本 / 需求预测</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="医师" value={data.structure.doctors} /></Card></Col>
              <Col span={4}><Card><Statistic title="护士" value={data.structure.nurses} /></Card></Col>
              <Col span={4}><Card><Statistic title="技师" value={data.structure.technicians} /></Card></Col>
              <Col span={4}><Card><Statistic title="流失率" value={`${(data.turnover.turnoverRate * 100).toFixed(1)}%`} /></Card></Col>
              <Col span={4}>
                <Card title="出勤率">
                  <Progress percent={Math.round(data.attendance.attendanceRate * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={4}><Card><Statistic title="人均人力成本" value={data.cost.perCapita} prefix="¥" /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>职称结构</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'senior', name: '正高', count: data.titleStructure.senior },
                  { key: 'deputy', name: '副高', count: data.titleStructure.deputySenior },
                  { key: 'inter', name: '中级', count: data.titleStructure.intermediate },
                  { key: 'junior', name: '初级', count: data.titleStructure.junior },
                ]}
                columns={[
                  { title: '职称', dataIndex: 'name', key: 'name' },
                  { title: '人数', dataIndex: 'count', key: 'count' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>人力配置建议</Text>}>
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
