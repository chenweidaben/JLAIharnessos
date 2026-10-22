/**
 * 健澜科技 jlmedaios - 麻醉科管理（M843）
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
import { useAnesthesiologyWorkloadM843Store } from '@/store/anesthesiologyWorkloadM843Store';
import type { AnesthesiologyWorkload } from '@/services/api/anesthesiologyWorkloadM843';

const typeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '麻醉类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const compColumns: ColumnsType<{ time: string; patient: string; type: string; action: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '并发症', dataIndex: 'type' },
  { title: '处置', dataIndex: 'action' },
];

const buildColumns = (setDetail: (r: AnesthesiologyWorkload) => void): ColumnsType<AnesthesiologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '全麻数', dataIndex: 'general', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '椎管内麻醉数', dataIndex: 'neuraxial', width: 140, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '神经阻滞数', dataIndex: 'nerveBlock', width: 120, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '麻醉恢复数', dataIndex: 'pacu', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function AnesthesiologyManagementM843Page() {
  usePageTitle('麻醉科管理');
  const { items, loading, error, demo, load } = useAnesthesiologyWorkloadM843Store();
  const [detail, setDetail] = useState<AnesthesiologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="麻醉科管理"
      description="日期 / 全麻数 / 椎管内麻醉数 / 神经阻滞数 / 麻醉恢复数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`麻醉工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="麻醉工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="全麻数">{detail.general}</Descriptions.Item>
              <Descriptions.Item label="椎管内麻醉数">{detail.neuraxial}</Descriptions.Item>
              <Descriptions.Item label="神经阻滞数">{detail.nerveBlock}</Descriptions.Item>
              <Descriptions.Item label="麻醉恢复数">{detail.pacu}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="麻醉记录（ASA/用药/出血/尿量）" span={2}>{detail.anesthesiaRecords}</Descriptions.Item>
              <Descriptions.Item label="术后镇痛记录" span={2}>{detail.postOpPain}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="麻醉类型分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="麻醉并发症（低氧/低血压/恶心呕吐）">
              <Table rowKey="time" dataSource={detail.complications} columns={compColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
