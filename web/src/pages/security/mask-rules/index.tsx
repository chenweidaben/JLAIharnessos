/** 健澜科技 jlmedaios - 脱敏规则（M261 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, List, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { field: string; method: string; example: string; applicableRoles: string[] }
export default function SecurityMaskRulesPage() {
  usePageTitle('脱敏规则');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/mask-rules').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.rules ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="数据脱敏规则">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <List
            dataSource={list}
            renderItem={(r) => (
              <List.Item>
                <span style={{ minWidth: 120 }}><Tag color="purple">{r.field}</Tag></span>
                <Tag color="blue">{r.method}</Tag>
                <code style={{ margin: '0 16px' }}>{r.example}</code>
                <span>角色：{r.applicableRoles.map((x) => <Tag key={x} color="default" style={{ marginLeft: 4 }}>{x}</Tag>)}</span>
              </List.Item>
            )}
            locale={{ emptyText: <Empty description="暂无规则" /> }}
          />
        </Card>
      </Spin>
    </PageContainer>
  );
}
