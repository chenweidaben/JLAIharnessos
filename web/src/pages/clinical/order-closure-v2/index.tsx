/**
 * 健澜科技 jlmedaios - 医嘱闭环（M643，配套 M570）
 *
 * 三甲流程：医嘱 Table（类型 badge/内容/剂量频次/开立人/审核人/状态 badge）
 * 闭环状态机：draft→pending→reviewed→executing→completed/stopped。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Space, Spin, Table, Tag, Timeline } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useOrderClosureV2M643Store } from '@/store/orderClosureV2M643Store';
import {
  ORDER_STATUS_META,
  ORDER_TYPE_META,
  type OrderItem,
  type OrderStatus,
} from '@/services/api/orderClosureV2M643';

const FLOW: OrderStatus[] = ['draft', 'pending', 'reviewed', 'executing', 'completed'];

export default function OrderClosureV2M643Page() {
  usePageTitle('医嘱闭环');

  const { items, loading, error, demo, load } = useOrderClosureV2M643Store();

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<OrderItem> = [
    { title: '医嘱号', dataIndex: 'orderNo', width: 120 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (v: OrderItem['type']) => <Tag color={ORDER_TYPE_META[v].color}>{ORDER_TYPE_META[v].label}</Tag>,
    },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '剂量', dataIndex: 'dose', width: 100 },
    { title: '频次', dataIndex: 'frequency', width: 80 },
    { title: '开立人', dataIndex: 'prescriber', width: 100 },
    { title: '审核人', dataIndex: 'reviewer', width: 100, render: (v?: string) => v ?? '—' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: OrderStatus) => <Tag color={ORDER_STATUS_META[v].color}>{ORDER_STATUS_META[v].label}</Tag>,
    },
    { title: '开立时间', dataIndex: 'orderedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ];

  return (
    <PageContainer
      title="医嘱闭环（v2）"
      description="药品 / 检验 / 检查 / 治疗 / 护理医嘱全生命周期"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`医嘱列表（${items.length}）`} style={{ marginBottom: 16 }}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Card size="small" title="闭环状态流转">
        <Timeline
          items={FLOW.map((s) => ({
            color: s === 'completed' ? 'green' : s === 'executing' ? 'blue' : 'gray',
            children: (
              <Space>
                <Tag color={ORDER_STATUS_META[s].color}>{ORDER_STATUS_META[s].label}</Tag>
                <span style={{ color: '#999' }}>{s === 'draft' ? '开立' : s === 'pending' ? '护士核对' : s === 'reviewed' ? '药师/主任审核' : s === 'executing' ? '护士执行' : '疗程结束 / 自动停止'}</span>
              </Space>
            ),
          }))}
        />
      </Card>
    </PageContainer>
  );
}
