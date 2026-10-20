/** 健澜科技 jlmedaios - 病历版本历史（M261 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Tag, Timeline } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; recordNo: string; version: string; editor: string; editTime: string; reason: string; diffSummary: string }
export default function EmrVersionsPage() {
  usePageTitle('病历版本历史');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/versions').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.versions ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="病历版本历史">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          {list.length === 0 ? <Empty description="暂无版本" /> : (
            <Timeline items={list.map((v) => ({
              color: 'blue',
              children: <div>
                <strong>{v.editTime}</strong> <Tag color="purple">{v.version}</Tag> <Tag color="blue">{v.editor}</Tag>
                <div>原因：{v.reason}</div>
                <div style={{ color: '#666' }}>变更：{v.diffSummary}</div>
              </div>,
            }))} />
          )}
        </Card>
      </Spin>
    </PageContainer>
  );
}
