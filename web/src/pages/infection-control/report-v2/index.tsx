/**
 * 健澜科技 jlmedaios - 院感 V2 页（M209-B）
 *
 * SSI/VAP/CLABSI/CAUTI/MDRO/环境卫生/AMS。深海蓝 VI。
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
  surveillance: { overall: number; target: number; outbreak: number };
  target: { ssi: number; vap: number; clabsi: number; cauti: number };
  mdro: { mrsa: number; vre: number; cre: number; crab: number; cdiff: number };
  environmental: { handHygiene: number; surface: number };
  ams: { ddd: number; audit: number };
  suggestions: string[];
}

export default function InfectionControlV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/infection-control/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>医院感染控制 V2 深化</Title>
        <Paragraph type="secondary">SSI / VAP / CLABSI / CAUTI 目标性监测 / MDRO（MRSA·VRE·CRE·CRAB·CD）/ AMS</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="院感病例" value={data.surveillance.overall} /></Card></Col>
              <Col span={6}><Card><Statistic title="暴发事件" value={data.surveillance.outbreak} /></Card></Col>
              <Col span={6}><Card><Statistic title="手卫生依从" value={`${(data.environmental.handHygiene * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="抗菌药物 DDD" value={data.ams.ddd} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>目标性监测</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'ssi', name: 'SSI 手术部位', value: data.target.ssi },
                  { key: 'vap', name: 'VAP 呼吸机相关', value: data.target.vap },
                  { key: 'clabsi', name: 'CLABSI 导管相关血流', value: data.target.clabsi },
                  { key: 'cauti', name: 'CAUTI 导尿管相关', value: data.target.cauti },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '例数', dataIndex: 'value', key: 'value' },
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
