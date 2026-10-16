/**
 * 健澜科技 jlmedaios - 后勤基建 V2 页（M220-A）
 *
 * 物业/水电气/被服/餐饮/基建/空间/设备/智慧后勤。深海蓝 VI。
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
  property: { workOrders: number; completed: number };
  utilities: { oxygen: boolean; vacuum: boolean; compressedAir: boolean };
  linen: { processed: number };
  food: { meals: number };
  construction: { projects: number };
  space: { occupied: number };
  equipment: { assets: number };
  smart: { iot: boolean };
  suggestions: string[];
}

export default function LogisticsV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/logistics/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>后勤与基建 V2</Title>
        <Paragraph type="secondary">物业工单 / 供氧·负压·压缩空气 / 被服·餐饮 / 基建·空间 / 智慧后勤 IoT</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="物业工单" value={data.property.workOrders} /></Card></Col>
              <Col span={6}><Card><Statistic title="被服处理" value={data.linen.processed} /></Card></Col>
              <Col span={6}><Card><Statistic title="餐饮供餐" value={data.food.meals} /></Card></Col>
              <Col span={6}><Card><Statistic title="在建项目" value={data.construction.projects} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>公用系统</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'oxy', name: '中心供氧', value: data.utilities.oxygen ? '正常' : '异常' },
                  { key: 'vac', name: '中心负压', value: data.utilities.vacuum ? '正常' : '异常' },
                  { key: 'air', name: '压缩空气', value: data.utilities.compressedAir ? '正常' : '异常' },
                  { key: 'iot', name: '智慧后勤 IoT', value: data.smart.iot ? '已启用' : '未启用' },
                ]}
                columns={[
                  { title: '系统', dataIndex: 'name', key: 'name' },
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
