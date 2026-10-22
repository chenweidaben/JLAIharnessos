/**
 * 健澜科技 jlmedaios - 心电检查报告中心（M682）
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
import { useEcgReportCenterM682Store } from '@/store/ecgReportCenterM682Store';
import {
  REPORT_STATUS_META,
  type EcgReport,
} from '@/services/api/ecgReportCenterM682';

const buildColumns = (setDetail: (r: EcgReport) => void): ColumnsType<EcgReport> => [
  { title: '检查号', dataIndex: 'accessionNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 110 },
  { title: '心率', dataIndex: 'heartRate', width: 90, align: 'right', render: (v: number) => `${v} bpm` },
  { title: '心律', dataIndex: 'rhythm', width: 130 },
  { title: '诊断结论', dataIndex: 'ecgDiagnosis', ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: EcgReport['status']) => <Tag color={REPORT_STATUS_META[v].color}>{REPORT_STATUS_META[v].label}</Tag>,
  },
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

export default function EcgReportCenterM682Page() {
  usePageTitle('心电报告中心');
  const { items, loading, error, demo, load } = useEcgReportCenterM682Store();
  const [detail, setDetail] = useState<EcgReport | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="心电检查报告中心"
      description="检查号 / 心率 / 心律 / 诊断结论"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`心电报告（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="心电报告详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="检查号">{detail.accessionNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="心率">{detail.heartRate} bpm</Descriptions.Item>
            <Descriptions.Item label="心律">{detail.rhythm}</Descriptions.Item>
            <Descriptions.Item label="测量值">
              {detail.measurements.map((m) => (
                <div key={m.name}>· {m.name}：{m.value}</div>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="心电图诊断">{detail.ecgDiagnosis}</Descriptions.Item>
            <Descriptions.Item label="诊断医师">{detail.reader}</Descriptions.Item>
            <Descriptions.Item label="报告时间">{dayjs(detail.reportedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
