/** 健澜科技 jlmedaios - 患者 360 风险评估（M274 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { patient: string; riskLevel: string; comorbidityCount: number; readmissionRiskScore: number; readmissionRiskLevel: string; recommendedActions: string[] }
export default function Patient360RiskPage() {
  usePageTitle('患者 360 风险评估');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/patient/360-risk').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="患者风险评估（30 天再入院）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="患者"><Tag color="purple">{data.patient}</Tag></Descriptions.Item>
              <Descriptions.Item label="整体风险等级"><Tag color={data.riskLevel === '高' ? 'red' : 'orange'}>{data.riskLevel}</Tag></Descriptions.Item>
              <Descriptions.Item label="合并症数">{data.comorbidityCount}</Descriptions.Item>
              <Descriptions.Item label="再入院风险评分">{data.readmissionRiskScore}</Descriptions.Item>
              <Descriptions.Item label="再入院风险">{data.readmissionRiskLevel}</Descriptions.Item>
              <Descriptions.Item label="推荐措施">
                {data.recommendedActions.map((a) => <Tag key={a} color="blue" style={{ marginLeft: 4 }}>{a}</Tag>)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无评估" /></Card>}
      </Spin>
    </PageContainer>
  );
}
