/**
 * 健澜科技 jlmedaios - 设备预测性维护页（M184-C）
 *
 * 选择设备，展示故障风险预测与维护排期。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Layout,
  Row,
  Select,
  Spin,
  Statistic,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Prediction {
  equipmentId: string;
  riskLevel: 'low' | 'medium' | 'high';
  failureProbability: number;
  score: number;
  recommendation: string;
}

interface Schedule {
  equipmentId: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedWithinDays: number;
  action: string;
}

interface Resp {
  prediction: Prediction;
  schedule: Schedule;
}

function riskColor(level: string): string {
  if (level === 'high') return 'red';
  if (level === 'medium') return 'orange';
  return 'green';
}

export default function EquipmentPredictivePage() {
  const [equipId, setEquipId] = useState('ct-001');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Resp>('/api/v1/equipment/predictive', {
          query: { equipmentId: equipId },
        });
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [equipId]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>设备预测性维护</Title>
        <Paragraph type="secondary">基于运行时长/故障历史/维护记录预测故障风险</Paragraph>

        <Card size="small" style={{ marginBottom: 16 }}>
          <Select
            value={equipId}
            onChange={setEquipId}
            style={{ width: 200 }}
            options={[
              { value: 'ct-001', label: 'CT 机 #001' },
              { value: 'mri-001', label: 'MRI #001' },
              { value: 'xray-001', label: 'X光机 #001' },
            ]}
          />
        </Card>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Alert
              type={data.prediction.riskLevel === 'high' ? 'error' : data.prediction.riskLevel === 'medium' ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: 16 }}
              message={
                <span>
                  风险等级：<Tag color={riskColor(data.prediction.riskLevel)}>{data.prediction.riskLevel}</Tag>
                  故障概率 {(data.prediction.failureProbability * 100).toFixed(0)}%
                </span>
              }
              description={data.prediction.recommendation}
            />

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Statistic title="风险评分" value={data.prediction.score} valueStyle={{ color: VI.mid }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="建议维护时限"
                    value={data.schedule.recommendedWithinDays}
                    suffix="天内"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="设备 ID"
                    value={data.prediction.equipmentId}
                    valueStyle={{ color: VI.accent }}
                  />
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>维护排期建议</Text>}>
              <Timeline
                items={[
                  {
                    children: (
                      <div>
                        <Text strong>{data.schedule.action}</Text>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
