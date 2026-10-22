/**
 * 健澜科技 jlmedaios - 放射科管理（M804）
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
import { useRadiologyWorkloadM804Store } from '@/store/radiologyWorkloadM804Store';
import type { RadiologyWorkload } from '@/services/api/radiologyWorkloadM804';

const modColumns: ColumnsType<{ name: string; count: number; positive: number }> = [
  { title: '检查类型', dataIndex: 'name' },
  { title: '检查数', dataIndex: 'count', align: 'right' },
  { title: '阳性数', dataIndex: 'positive', align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
];

const critColumns: ColumnsType<{ time: string; patient: string; finding: string; action: string }> = [
  { title: '时间', dataIndex: 'time', width: 80 },
  { title: '患者', dataIndex: 'patient', width: 100 },
  { title: '危急值', dataIndex: 'finding' },
  { title: '处置', dataIndex: 'action' },
];

const buildColumns = (setDetail: (r: RadiologyWorkload) => void): ColumnsType<RadiologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '检查类型', dataIndex: 'modality', width: 120 },
  { title: '检查数', dataIndex: 'studies', width: 100, align: 'right' },
  {
    title: '阳性数',
    dataIndex: 'positive',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color="red">{v}</Tag>,
  },
  { title: '报告时效', dataIndex: 'reportSla', width: 220, ellipsis: true },
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

export default function RadiologyManagementM804Page() {
  usePageTitle('放射科管理');
  const { items, loading, error, demo, load } = useRadiologyWorkloadM804Store();
  const [detail, setDetail] = useState<RadiologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="放射科管理"
      description="日期 / 检查类型 / 检查数 / 阳性数 / 报告时效 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`放射工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="放射工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="检查类型">{detail.modality}</Descriptions.Item>
              <Descriptions.Item label="检查数">{detail.studies}</Descriptions.Item>
              <Descriptions.Item label="阳性数">{detail.positive}</Descriptions.Item>
              <Descriptions.Item label="报告时效" span={2}>{detail.reportSla}</Descriptions.Item>
              <Descriptions.Item label="阳性率" span={2}>{detail.positivityRate}</Descriptions.Item>
              <Descriptions.Item label="报告时效统计" span={2}>{detail.reportTimeliness}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="检查类型分解" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.modalityBreakdown} columns={modColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="危急值记录">
              <Table rowKey="time" dataSource={detail.criticalValues} columns={critColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
