/** 健澜科技 jlmedaios - 运营看板（M323 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { outpatientVolume: string; inpatientVolume: string; surgeryVolume: string; revenue: string; satisfaction: string }
export default function OperationDashboardPage() {
  usePageTitle('运营看板');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/operation/dashboard').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="运营看板">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="门诊量"><Tag color="blue">{data.outpatientVolume}</Tag></Descriptions.Item>
              <Descriptions.Item label="住院量"><Tag color="purple">{data.inpatientVolume}</Tag></Descriptions.Item>
              <Descriptions.Item label="手术量"><Tag color="orange">{data.surgeryVolume}</Tag></Descriptions.Item>
              <Descriptions.Item label="收入"><Tag color="green">{data.revenue}</Tag></Descriptions.Item>
              <Descriptions.Item label="满意度" span={2}><Tag color="green">{data.satisfaction}</Tag></Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}