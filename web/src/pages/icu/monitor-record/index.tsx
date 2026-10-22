/**
 * 健澜科技 jlmedaios - ICU 监护记录（M685）
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
import { useIcuMonitorRecordM685Store } from '@/store/icuMonitorRecordM685Store';
import {
  ICU_STATUS_META,
  type IcuMonitorRecord,
} from '@/services/api/icuMonitorRecordM685';

const buildColumns = (setDetail: (r: IcuMonitorRecord) => void): ColumnsType<IcuMonitorRecord> => [
  { title: '床号', dataIndex: 'bedNo', width: 100 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '诊断', dataIndex: 'diagnosis', ellipsis: true },
  {
    title: 'APACHE II',
    dataIndex: 'apacheScore',
    width: 180,
    sorter: (a, b) => a.apacheScore - b.apacheScore,
    render: (v: number) => (
      <strong style={{ color: v >= 20 ? '#cf1322' : v >= 10 ? '#faad14' : '#3f8600' }}>
        {v} 分
      </strong>
    ),
  },
  { title: '呼吸机模式', dataIndex: 'ventMode', width: 110 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: IcuMonitorRecord['status']) => <Tag color={ICU_STATUS_META[v].color}>{ICU_STATUS_META[v].label}</Tag>,
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

export default function IcuMonitorRecordM685Page() {
  usePageTitle('ICU 监护记录');
  const { items, loading, error, demo, load } = useIcuMonitorRecordM685Store();
  const [detail, setDetail] = useState<IcuMonitorRecord | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="ICU 监护记录"
      description="床号 / 诊断 / APACHE II / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`ICU 在床（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="ICU 监护详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="床号">{detail.bedNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="诊断">{detail.diagnosis}</Descriptions.Item>
            <Descriptions.Item label="APACHE II 评分">{detail.apacheScore} 分</Descriptions.Item>
            <Descriptions.Item label="呼吸机模式">{detail.ventMode}</Descriptions.Item>
            <Descriptions.Item label="呼吸机参数">{detail.ventParams}</Descriptions.Item>
            <Descriptions.Item label="血管活性药">{detail.vasoactive}</Descriptions.Item>
            <Descriptions.Item label="24h 液体平衡">
              <span style={{ color: detail.fluidBalanceMl < 0 ? '#cf1322' : '#3f8600' }}>
                {detail.fluidBalanceMl > 0 ? '+' : ''}{detail.fluidBalanceMl} ml
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={ICU_STATUS_META[detail.status].color}>{ICU_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
