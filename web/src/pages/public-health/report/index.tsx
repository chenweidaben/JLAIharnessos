/**
 * 健澜科技 jlmedaios - 传染病上报管理（M763）
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
import { useInfectiousReportM763Store } from '@/store/infectiousReportM763Store';
import {
  REPORT_STATUS_META,
  type InfectiousReport,
} from '@/services/api/infectiousReportM763';

const reviewColumns: ColumnsType<{ time: string; by: string; result: string }> = [
  { title: '时间', dataIndex: 'time', width: 160 },
  { title: '审核人', dataIndex: 'by', width: 140 },
  { title: '结果', dataIndex: 'result' },
];

const buildColumns = (setDetail: (r: InfectiousReport) => void): ColumnsType<InfectiousReport> => [
  { title: '报告卡编号', dataIndex: 'reportNo', width: 140 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '传染病名称', dataIndex: 'disease', width: 180, ellipsis: true },
  { title: '分类', dataIndex: 'category', width: 90 },
  { title: '上报时间', dataIndex: 'reportedAt', width: 160 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: InfectiousReport['status']) => <Tag color={REPORT_STATUS_META[v].color}>{REPORT_STATUS_META[v].label}</Tag>,
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

export default function InfectiousReportsM763Page() {
  usePageTitle('传染病上报管理');
  const { items, loading, error, demo, load } = useInfectiousReportM763Store();
  const [detail, setDetail] = useState<InfectiousReport | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="传染病上报管理"
      description="报告卡编号 / 患者姓名 / 传染病名称 / 分类 / 上报时间 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`传染病上报（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="传染病上报详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="报告卡编号">{detail.reportNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="传染病名称">{detail.disease}</Descriptions.Item>
              <Descriptions.Item label="分类">{detail.category}</Descriptions.Item>
              <Descriptions.Item label="上报时间">{detail.reportedAt}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={REPORT_STATUS_META[detail.status].color}>{REPORT_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="诊断依据" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="流行病学史" span={2}>{detail.epiHistory}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="审核记录">
              <Table rowKey="time" dataSource={detail.reviews} columns={reviewColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
