/**
 * 健澜科技 jlmedaios - 护理 V2 页（M212-C）
 *
 * 基础/特级/一级护理/跌倒压疮管路/床护比/专科护士/科研/三级管理。深海蓝 VI。
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
  quality: { basic: number; special: number; level1: number };
  safety: { fall: number; pressureUlcer: number; tubeDisplacement: number; medicationError: number };
  staffing: { beds: number; nurses: number; nightShift: number };
  specialty: { picc: number; icu: number; er: number; wound: number };
  research: { projects: number };
  management: { threeTier: boolean };
  suggestions: string[];
}

export default function NursingV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/nursing/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>护理管理 V2</Title>
        <Paragraph type="secondary">基础/特级/一级护理合格率 / 跌倒·压疮·管路滑脱 / 床护比 / 专科护士</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="基础护理合格率" value={`${(data.quality.basic * 100).toFixed(0)}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="床护比" value={`1:${(data.staffing.nurses / data.staffing.beds).toFixed(1)}`} /></Card></Col>
              <Col span={6}><Card><Statistic title="跌倒" value={data.safety.fall} /></Card></Col>
              <Col span={6}><Card><Statistic title="专科护士" value={data.specialty.picc + data.specialty.icu + data.specialty.er + data.specialty.wound} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>护理安全</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'fall', name: '跌倒', value: data.safety.fall },
                  { key: 'pu', name: '压疮', value: data.safety.pressureUlcer },
                  { key: 'tube', name: '管路滑脱', value: data.safety.tubeDisplacement },
                  { key: 'med', name: '给药错误', value: data.safety.medicationError },
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
