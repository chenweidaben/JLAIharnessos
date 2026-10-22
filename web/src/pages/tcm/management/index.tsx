/**
 * 健澜科技 jlmedaios - 中医科管理（M826）
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
import { useTcmWorkloadM826Store } from '@/store/tcmWorkloadM826Store';
import type { TcmWorkload } from '@/services/api/tcmWorkloadM826';

const therapyColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '治疗类型', dataIndex: 'name' },
  { title: '人次', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: TcmWorkload) => void): ColumnsType<TcmWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊人次', dataIndex: 'outpatient', width: 100, align: 'right' },
  { title: '针灸人次', dataIndex: 'acupuncture', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '推拿人次', dataIndex: 'tuina', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '中药饮片数', dataIndex: 'herbalPieces', width: 120, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
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

export default function TcmManagementM826Page() {
  usePageTitle('中医科管理');
  const { items, loading, error, demo, load } = useTcmWorkloadM826Store();
  const [detail, setDetail] = useState<TcmWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="中医科管理"
      description="日期 / 门诊人次 / 针灸人次 / 推拿人次 / 中药饮片数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`中医科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="中医科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊人次">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="针灸人次">{detail.acupuncture}</Descriptions.Item>
              <Descriptions.Item label="推拿人次">{detail.tuina}</Descriptions.Item>
              <Descriptions.Item label="中药饮片数">{detail.herbalPieces}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="舌脉记录" span={2}>{detail.tonguePulse}</Descriptions.Item>
              <Descriptions.Item label="辨证分型" span={2}>{detail.syndrome}</Descriptions.Item>
              <Descriptions.Item label="处方记录" span={2}>{detail.prescriptions}</Descriptions.Item>
              <Descriptions.Item label="疗效评估" span={2}>{detail.outcome}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="治疗类型分解">
              <Table rowKey="name" dataSource={detail.therapyBreakdown} columns={therapyColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
