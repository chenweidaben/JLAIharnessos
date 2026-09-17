/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 告警中心：危急值 / 过敏 / 相互作用
 */
import { useEffect, useState } from 'react';
import { Card, Segmented } from 'antd';

import { PageContainer, EmptyState } from '@/components/common';
import { AlertBanner } from '@/components/medical';
import { usePageTitle } from '@/hooks';
import { fetchAlerts } from '@/services/api/patient';
import type { Alert } from '@/types/medical';

type Filter = 'active' | 'ack' | 'all';

export default function Alerts() {
  usePageTitle('告警中心');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<Filter>('active');

  useEffect(() => {
    fetchAlerts().then(setAlerts);
  }, []);

  const filtered = alerts.filter((a) =>
    filter === 'all' ? true : filter === 'active' ? !a.acknowledged : a.acknowledged,
  );

  return (
    <PageContainer title="告警中心" description="危急值 / 过敏史 / 药物相互作用实时提醒">
      <Card
        className="shadow-card"
        extra={
          <Segmented
            options={[
              { label: '未处理', value: 'active' },
              { label: '已处理', value: 'ack' },
              { label: '全部', value: 'all' },
            ]}
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
          />
        }
      >
        {filtered.length === 0 ? (
          <EmptyState description="暂无告警" />
        ) : (
          filtered.map((a) => <AlertBanner key={a.id} alert={a} />)
        )}
      </Card>
    </PageContainer>
  );
}
