/**
 * 健澜科技 jlmedaios - 新生儿科管理（M821）
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
import { useNeonatologyWorkloadM821Store } from '@/store/neonatologyWorkloadM821Store';
import type { NeonatologyWorkload } from '@/services/api/neonatologyWorkloadM821';

const reasonColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '入院原因', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: NeonatologyWorkload) => void): ColumnsType<NeonatologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '入院数', dataIndex: 'admissions', width: 90, align: 'right' },
  { title: '早产数', dataIndex: 'preterm', width: 90, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '低体重数', dataIndex: 'lowBirthWeight', width: 110, align: 'right', render: (v: number) => <Tag color="volcano">{v}</Tag> },
  { title: 'NICU 数', dataIndex: 'nicu', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '状态', dataIndex: 'status', width: 110 },
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

export default function NeonatologyManagementM821Page() {
  usePageTitle('新生儿科管理');
  const { items, loading, error, demo, load } = useNeonatologyWorkloadM821Store();
  const [detail, setDetail] = useState<NeonatologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="新生儿科管理"
      description="日期 / 入院数 / 早产数 / 低体重数 / NICU 数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`新生儿工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="新生儿工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="入院数">{detail.admissions}</Descriptions.Item>
              <Descriptions.Item label="早产数">{detail.preterm}</Descriptions.Item>
              <Descriptions.Item label="低体重数">{detail.lowBirthWeight}</Descriptions.Item>
              <Descriptions.Item label="NICU 数">{detail.nicu}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="暖箱记录" span={2}>{detail.incubator}</Descriptions.Item>
              <Descriptions.Item label="蓝光治疗记录" span={2}>{detail.phototherapy}</Descriptions.Item>
              <Descriptions.Item label="脐静脉插管记录" span={2}>{detail.umbilicalLine}</Descriptions.Item>
              <Descriptions.Item label="出院随访" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="入院原因分解">
              <Table rowKey="name" dataSource={detail.reasonBreakdown} columns={reasonColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
