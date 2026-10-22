/**
 * 健澜科技 jlmedaios - 新生儿科管理（M851 原地升级 M821 视图）
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
import { useNeonatologyWorkloadM851Store } from '@/store/neonatologyWorkloadM851Store';
import type { NeonatologyWorkloadM851 } from '@/services/api/neonatologyWorkloadM851';

const gestationalColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '孕周', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: NeonatologyWorkloadM851) => void): ColumnsType<NeonatologyWorkloadM851> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '入院数', dataIndex: 'admitted', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '早产数', dataIndex: 'premature', width: 100, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  {
    title: '窒息数',
    dataIndex: 'asphyxia',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color={v > 0 ? 'red' : 'default'}>{v}</Tag>,
  },
  { title: '黄疸数', dataIndex: 'jaundice', width: 100, align: 'right', render: (v: number) => <Tag color="gold">{v}</Tag> },
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

export default function NeonatologyManagementM851Page() {
  usePageTitle('新生儿科管理');
  const { items, loading, error, demo, load } = useNeonatologyWorkloadM851Store();
  const [detail, setDetail] = useState<NeonatologyWorkloadM851 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="新生儿科管理"
      description="日期 / 入院数 / 早产数 / 窒息数 / 黄疸数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`新生儿工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
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
              <Descriptions.Item label="入院数">{detail.admitted}</Descriptions.Item>
              <Descriptions.Item label="早产数">{detail.premature}</Descriptions.Item>
              <Descriptions.Item label="窒息数">{detail.asphyxia}</Descriptions.Item>
              <Descriptions.Item label="黄疸数">{detail.jaundice}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="Apgar 评分" span={2}>{detail.apgar}</Descriptions.Item>
              <Descriptions.Item label="蓝光治疗记录" span={2}>{detail.phototherapy}</Descriptions.Item>
              <Descriptions.Item label="NICU 监护记录" span={2}>{detail.nicuMonitoring}</Descriptions.Item>
              <Descriptions.Item label="出院随访" span={2}>{detail.followUp}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="孕周分解">
              <Table rowKey="name" dataSource={detail.gestationalBreakdown} columns={gestationalColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
