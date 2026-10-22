/**
 * 健澜科技 jlmedaios - 超声报告中心（M680）
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
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useUltrasoundReportCenterM680Store } from '@/store/ultrasoundReportCenterM680Store';
import {
  REPORT_STATUS_META,
  type UltrasoundReport,
} from '@/services/api/ultrasoundReportCenterM680';

const buildColumns = (setDetail: (r: UltrasoundReport) => void): ColumnsType<UltrasoundReport> => [
  { title: '检查号', dataIndex: 'accessionNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 110 },
  { title: '部位', dataIndex: 'bodyPart', width: 120 },
  { title: '设备', dataIndex: 'device', width: 180, ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: UltrasoundReport['status']) => <Tag color={REPORT_STATUS_META[v].color}>{REPORT_STATUS_META[v].label}</Tag>,
  },
  { title: '报告时间', dataIndex: 'reportedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        查看
      </Button>
    ),
  },
];

export default function UltrasoundReportCenterM680Page() {
  usePageTitle('超声报告中心');
  const { items, loading, error, demo, load } = useUltrasoundReportCenterM680Store();
  const [detail, setDetail] = useState<UltrasoundReport | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="超声报告中心"
      description="检查号 / 部位 / 设备 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`超声报告（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="超声报告详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="检查号">{detail.accessionNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="部位">{detail.bodyPart}</Descriptions.Item>
            <Descriptions.Item label="设备">{detail.device}</Descriptions.Item>
            <Descriptions.Item label="超声所见">{detail.findings}</Descriptions.Item>
            <Descriptions.Item label="超声提示">{detail.impression}</Descriptions.Item>
            <Descriptions.Item label="超声医师">{detail.sonographer}</Descriptions.Item>
            <Descriptions.Item label="报告时间">{dayjs(detail.reportedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
