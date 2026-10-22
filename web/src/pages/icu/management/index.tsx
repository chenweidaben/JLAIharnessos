/**
 * 健澜科技 jlmedaios - ICU 管理（M844 原地升级 M814 视图）
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
import { useIcuWorkloadM844Store } from '@/store/icuWorkloadM844Store';
import type { IcuWorkloadM844 } from '@/services/api/icuWorkloadM844';

const procColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '有创操作', dataIndex: 'name' },
  { title: '使用数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: IcuWorkloadM844) => void): ColumnsType<IcuWorkloadM844> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '在床数', dataIndex: 'occupied', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '新入数', dataIndex: 'admitted', width: 100, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '转出数', dataIndex: 'discharged', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  {
    title: '死亡数',
    dataIndex: 'deaths',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color={v > 0 ? 'red' : 'default'}>{v}</Tag>,
  },
  { title: '状态', dataIndex: 'status', width: 120 },
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

export default function IcuManagementM844Page() {
  usePageTitle('ICU 管理');
  const { items, loading, error, demo, load } = useIcuWorkloadM844Store();
  const [detail, setDetail] = useState<IcuWorkloadM844 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="ICU 管理"
      description="日期 / 在床数 / 新入数 / 转出数 / 死亡数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`ICU 工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="ICU 工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="在床数">{detail.occupied}</Descriptions.Item>
              <Descriptions.Item label="新入数">{detail.admitted}</Descriptions.Item>
              <Descriptions.Item label="转出数">{detail.discharged}</Descriptions.Item>
              <Descriptions.Item label="死亡数">{detail.deaths}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="床位使用（满床/空床）" span={2}>{detail.bedUsage}</Descriptions.Item>
              <Descriptions.Item label="危重评分（APACHE II / SOFA）" span={2}>{detail.severityScore}</Descriptions.Item>
              <Descriptions.Item label="监护指标（HR/MAP/SpO2/T）" span={2}>{detail.monitoring}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="有创操作（插管/CVC/CRRT）">
              <Table rowKey="name" dataSource={detail.invasiveProcedures} columns={procColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
