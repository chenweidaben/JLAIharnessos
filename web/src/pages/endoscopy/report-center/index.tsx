/**
 * 健澜科技 jlmedaios - 内镜报告中心（M681）
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
import { useEndoscopyReportCenterM681Store } from '@/store/endoscopyReportCenterM681Store';
import {
  REPORT_STATUS_META,
  type EndoscopyReport,
} from '@/services/api/endoscopyReportCenterM681';

const buildColumns = (setDetail: (r: EndoscopyReport) => void): ColumnsType<EndoscopyReport> => [
  { title: '检查号', dataIndex: 'accessionNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 110 },
  { title: '内镜类型', dataIndex: 'endoType', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', ellipsis: true },
  { title: '活检部位', dataIndex: 'biopsySite', width: 150 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: EndoscopyReport['status']) => <Tag color={REPORT_STATUS_META[v].color}>{REPORT_STATUS_META[v].label}</Tag>,
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

export default function EndoscopyReportCenterM681Page() {
  usePageTitle('内镜报告中心');
  const { items, loading, error, demo, load } = useEndoscopyReportCenterM681Store();
  const [detail, setDetail] = useState<EndoscopyReport | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="内镜报告中心"
      description="检查号 / 内镜类型 / 诊断 / 活检部位"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`内镜报告（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="内镜报告详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="检查号">{detail.accessionNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="内镜类型">{detail.endoType}</Descriptions.Item>
            <Descriptions.Item label="内镜所见">{detail.findings}</Descriptions.Item>
            <Descriptions.Item label="内镜诊断">{detail.diagnosis}</Descriptions.Item>
            <Descriptions.Item label="活检部位">{detail.biopsySite || '—'}</Descriptions.Item>
            <Descriptions.Item label="内镜医师">{detail.endoscopist}</Descriptions.Item>
            <Descriptions.Item label="报告时间">{dayjs(detail.reportedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
