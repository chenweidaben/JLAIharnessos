/**
 * 健澜科技 jlmedaios - 病理报告中心（M679）
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
import { usePathologyReportCenterM679Store } from '@/store/pathologyReportCenterM679Store';
import {
  REPORT_STATUS_META,
  type PathologyReport,
} from '@/services/api/pathologyReportCenterM679';

const buildColumns = (setDetail: (r: PathologyReport) => void): ColumnsType<PathologyReport> => [
  { title: '标本号', dataIndex: 'specimenNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 110 },
  { title: '部位', dataIndex: 'bodyPart', width: 120 },
  { title: '标本类型', dataIndex: 'sampleType', width: 150 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: PathologyReport['status']) => <Tag color={REPORT_STATUS_META[v].color}>{REPORT_STATUS_META[v].label}</Tag>,
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

export default function PathologyReportCenterM679Page() {
  usePageTitle('病理报告中心');
  const { items, loading, error, demo, load } = usePathologyReportCenterM679Store();
  const [detail, setDetail] = useState<PathologyReport | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="病理报告中心"
      description="标本号 / 部位 / 类型 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`病理报告（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="病理报告详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="标本号">{detail.specimenNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="部位">{detail.bodyPart}</Descriptions.Item>
            <Descriptions.Item label="标本类型">{detail.sampleType}</Descriptions.Item>
            <Descriptions.Item label="巨检">{detail.gross}</Descriptions.Item>
            <Descriptions.Item label="镜检">{detail.microscopic}</Descriptions.Item>
            <Descriptions.Item label="病理诊断">{detail.diagnosis}</Descriptions.Item>
            <Descriptions.Item label="IHC 结果">{detail.ihc}</Descriptions.Item>
            <Descriptions.Item label="病理医师">{detail.pathologist}</Descriptions.Item>
            <Descriptions.Item label="报告时间">{dayjs(detail.reportedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
