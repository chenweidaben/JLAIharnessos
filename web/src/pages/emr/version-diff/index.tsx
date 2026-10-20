/** 健澜科技 jlmedaios - 病历版本 diff（M273 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { medicalRecordNo: string; versionA: string; versionB: string; totalDiffLines: number; addedLines: number; removedLines: number }
export default function EmrVersionDiffPage() {
  usePageTitle('病历版本 diff');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/version-diff').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="病历版本 diff">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="病历号"><Tag color="purple">{data.medicalRecordNo}</Tag></Descriptions.Item>
              <Descriptions.Item label="版本 A">{data.versionA}</Descriptions.Item>
              <Descriptions.Item label="版本 B">{data.versionB}</Descriptions.Item>
              <Descriptions.Item label="总差异行数">{data.totalDiffLines}</Descriptions.Item>
              <Descriptions.Item label="新增行数"><Tag color="green">+{data.addedLines}</Tag></Descriptions.Item>
              <Descriptions.Item label="删除行数"><Tag color="red">-{data.removedLines}</Tag></Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无 diff" /></Card>}
      </Spin>
    </PageContainer>
  );
}
