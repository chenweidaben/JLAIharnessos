/**
 * 健澜科技 jlmedaios - 眼科管理（M822）
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
import { useOphthalmologyWorkloadM822Store } from '@/store/ophthalmologyWorkloadM822Store';
import type { OphthalmologyWorkload } from '@/services/api/ophthalmologyWorkloadM822';

const surgeryColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '手术类型', dataIndex: 'name' },
  { title: '例数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: OphthalmologyWorkload) => void): ColumnsType<OphthalmologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊人次', dataIndex: 'outpatient', width: 100, align: 'right' },
  { title: '手术数', dataIndex: 'surgeries', width: 90, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '白内障手术', dataIndex: 'cataract', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '青光眼手术', dataIndex: 'glaucoma', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function OphthalmologyManagementM822Page() {
  usePageTitle('眼科管理');
  const { items, loading, error, demo, load } = useOphthalmologyWorkloadM822Store();
  const [detail, setDetail] = useState<OphthalmologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="眼科管理"
      description="日期 / 门诊人次 / 手术数 / 白内障手术 / 青光眼手术 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`眼科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="眼科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊人次">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="手术数">{detail.surgeries}</Descriptions.Item>
              <Descriptions.Item label="白内障手术">{detail.cataract}</Descriptions.Item>
              <Descriptions.Item label="青光眼手术">{detail.glaucoma}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="视力检查记录" span={2}>{detail.vision}</Descriptions.Item>
              <Descriptions.Item label="眼压记录" span={2}>{detail.intraocularPressure}</Descriptions.Item>
              <Descriptions.Item label="眼底照相" span={2}>{detail.fundus}</Descriptions.Item>
              <Descriptions.Item label="术后随访" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="手术类型分解">
              <Table rowKey="name" dataSource={detail.surgeryBreakdown} columns={surgeryColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
