/**
 * 健澜科技 jlmedaios - 印章管理（M750）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useSealM750Store } from '@/store/sealM750Store';
import {
  SEAL_STATUS_META,
  type Seal,
} from '@/services/api/sealM750';

const useColumns: ColumnsType<{ date: string; purpose: string; approver: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '用途', dataIndex: 'purpose' },
  { title: '审批人', dataIndex: 'approver', width: 120 },
];

const handoverColumns: ColumnsType<{ date: string; from: string; to: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '交出', dataIndex: 'from' },
  { title: '接收', dataIndex: 'to' },
];

const buildColumns = (setDetail: (r: Seal) => void): ColumnsType<Seal> => [
  { title: '印章名称', dataIndex: 'name', ellipsis: true },
  { title: '印章类型', dataIndex: 'type', width: 130 },
  { title: '保管人', dataIndex: 'keeper', width: 120 },
  { title: '启用日期', dataIndex: 'activatedAt', width: 120 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Seal['status']) => <Tag color={SEAL_STATUS_META[v].color}>{SEAL_STATUS_META[v].label}</Tag>,
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

export default function SealsM750Page() {
  usePageTitle('印章管理');
  const { items, loading, error, demo, load } = useSealM750Store();
  const [detail, setDetail] = useState<Seal | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="印章管理"
      description="印章名称 / 印章类型 / 保管人 / 启用日期 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`印章列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="印章详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="印章名称" span={2}>{detail.name}</Descriptions.Item>
              <Descriptions.Item label="印章类型">{detail.type}</Descriptions.Item>
              <Descriptions.Item label="保管人">{detail.keeper}</Descriptions.Item>
              <Descriptions.Item label="启用日期">{detail.activatedAt}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={SEAL_STATUS_META[detail.status].color}>{SEAL_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="印章使用记录" style={{ marginBottom: 16 }}>
              {detail.usages.length
                ? <Table rowKey="date" dataSource={detail.usages} columns={useColumns} size="small" pagination={false} />
                : <span style={{ color: '#999' }}>无使用记录</span>}
            </Card>
            <Card size="small" title="保管交接记录">
              {detail.handovers.length
                ? <Table rowKey="date" dataSource={detail.handovers} columns={handoverColumns} size="small" pagination={false} />
                : <span style={{ color: '#999' }}>无交接记录</span>}
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
