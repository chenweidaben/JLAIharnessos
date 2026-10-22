/**
 * 健澜科技 jlmedaios - 字典管理（M746）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useDictM746Store } from '@/store/dictM746Store';
import {
  DICT_STATUS_META,
  type Dictionary,
} from '@/services/api/dictM746';

const itemColumns: ColumnsType<{ itemCode: string; itemName: string; sort: number; status: 'active' | 'disabled' }> = [
  { title: '项编码', dataIndex: 'itemCode', width: 140 },
  { title: '项名称', dataIndex: 'itemName' },
  { title: '排序', dataIndex: 'sort', width: 90, align: 'right' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (v: 'active' | 'disabled') => <Tag color={DICT_STATUS_META[v].color}>{DICT_STATUS_META[v].label}</Tag>,
  },
];

const buildColumns = (setDetail: (r: Dictionary) => void): ColumnsType<Dictionary> => [
  { title: '字典编码', dataIndex: 'code', width: 200 },
  { title: '字典名称', dataIndex: 'name' },
  { title: '项数', dataIndex: 'itemCount', width: 90, align: 'right' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Dictionary['status']) => <Tag color={DICT_STATUS_META[v].color}>{DICT_STATUS_META[v].label}</Tag>,
  },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function DictionariesM746Page() {
  usePageTitle('字典管理');
  const { items, loading, error, demo, load } = useDictM746Store();
  const [detail, setDetail] = useState<Dictionary | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="字典管理"
      description="字典编码 / 字典名称 / 项数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`字典列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 900 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title={`字典详情${detail ? `：${detail.name}` : ''}`}
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Table rowKey="itemCode" dataSource={detail.items} columns={itemColumns} size="small" pagination={false} />
        )}
      </Modal>
    </PageContainer>
  );
}
