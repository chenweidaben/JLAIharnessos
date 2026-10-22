/**
 * 健澜科技 jlmedaios - 检验检查申请（M645，配套 M572）
 *
 * 三甲流程：按类别分组 Table（检验/放射/病理/内镜），状态 badge。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Empty, Spin, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useLabRadiologyOrderV2M645Store } from '@/store/labRadiologyOrderV2M645Store';
import {
  LR_CATEGORY_META,
  LR_STATUS_META,
  type LabRadiologyOrder,
  type LrCategory,
} from '@/services/api/labRadiologyOrderV2M645';

const columns: ColumnsType<LabRadiologyOrder> = [
  { title: '申请号', dataIndex: 'id', width: 100 },
  { title: '项目', dataIndex: 'itemName', width: 200 },
  { title: '临床诊断 / 指征', dataIndex: 'clinic', ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (v: LabRadiologyOrder['status']) => (
      <Tag color={LR_STATUS_META[v].color}>{LR_STATUS_META[v].label}</Tag>
    ),
  },
  { title: '申请时间', dataIndex: 'orderedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  { title: '申请医师', dataIndex: 'requestedBy', width: 100 },
];

export default function LabRadiologyOrderV2M645Page() {
  usePageTitle('检验检查申请');

  const { items, loading, error, demo, load } = useLabRadiologyOrderV2M645Store();

  useEffect(() => {
    void load();
  }, [load]);

  const tabs = (Object.keys(LR_CATEGORY_META) as LrCategory[]).map((cat) => {
    const data = items.filter((o) => o.category === cat);
    return {
      key: cat,
      label: `${LR_CATEGORY_META[cat].label}（${data.length}）`,
      children: (
        <Table
          rowKey="id"
          dataSource={data}
          columns={columns}
          size="small"
          pagination={false}
          locale={{ emptyText: <Empty description="暂无记录" /> }}
        />
      ),
    };
  });

  return (
    <PageContainer
      title="检验检查申请（v2）"
      description="检验 / 放射 / 病理 / 内镜申请状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`检验检查申请（${items.length}）`}>
        <Spin spinning={loading}>
          <Tabs items={tabs} />
        </Spin>
      </Card>
    </PageContainer>
  );
}
