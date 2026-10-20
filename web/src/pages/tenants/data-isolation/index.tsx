/** 健澜科技 jlmedaios - 数据隔离验证（M264 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data {
  isolationStrategy: string; tableLevelIsolation: string; rowLevelIsolation: string; verificationResult: string;
}
export default function TenantsDataIsolationPage() {
  usePageTitle('数据隔离验证');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/tenants/data-isolation').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="多租户数据隔离验证">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="隔离策略"><Tag color="purple">{data.isolationStrategy}</Tag></Descriptions.Item>
              <Descriptions.Item label="表级隔离">{data.tableLevelIsolation}</Descriptions.Item>
              <Descriptions.Item label="行级隔离">{data.rowLevelIsolation}</Descriptions.Item>
              <Descriptions.Item label="越权验证结果"><Tag color="green">{data.verificationResult}</Tag></Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
