/**
 * 健澜科技 jlmedaios - 消防安保 V2 页（M229-B）
 *
 * 消防设施/通道/演练/门卫巡逻监控/访客/反恐防暴/暴力伤医处置/重点部位/门禁/视频/车辆。深海蓝 VI。
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
  fire: { facilities: number; exits: number; drills: number };
  security: { patrols: number; cameras: number; visitors: number };
  antiTerror: { drills: number };
  keyAreas: { protected: number };
  access: { doors: number };
  cctv: { coverage: number };
  traffic: { gates: number };
  team: { guards: number };
  suggestions: string[];
}

export default function FireSecurityV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/fire-security/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>消防安保 V2</Title>
        <Paragraph type="secondary">消防设施·通道·演练 / 门卫·巡逻·监控·访客 / 反恐防暴·暴力伤医处置 / 重点部位·门禁·视频·车辆</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="消防设施" value={data.fire.facilities} /></Card></Col>
              <Col span={6}><Card><Statistic title="监控摄像头" value={data.security.cameras} /></Card></Col>
              <Col span={6}><Card><Statistic title="视频覆盖率" value={`${data.cctv.coverage}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="安保人员" value={data.team.guards} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安保体系明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'exit', name: '安全出口', value: data.fire.exits },
                  { key: 'patrol', name: '巡逻次数', value: data.security.patrols },
                  { key: 'antiterror', name: '反恐演练', value: data.antiTerror.drills },
                  { key: 'access', name: '门禁点', value: data.access.doors },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '数值', dataIndex: 'value', key: 'value' },
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
