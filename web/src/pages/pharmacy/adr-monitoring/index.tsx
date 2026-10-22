/**
 * 健澜科技 jlmedaios - 药品不良反应监测（M715）
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
import { useAdrMonitoringM715Store } from '@/store/adrReportM715Store';
import {
  ADR_GRADE_META,
  ADR_STATUS_META,
  type AdrReport,
} from '@/services/api/adrReportM715';

const buildColumns = (setDetail: (r: AdrReport) => void): ColumnsType<AdrReport> => [
  { title: '报告号', dataIndex: 'reportNo', width: 140 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '可疑药品', dataIndex: 'suspectedDrug', width: 140 },
  { title: '反应名称', dataIndex: 'reaction', ellipsis: true },
  {
    title: '分级',
    dataIndex: 'grade',
    width: 90,
    render: (v: AdrReport['grade']) => <Tag color={ADR_GRADE_META[v].color}>{ADR_GRADE_META[v].label}</Tag>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: AdrReport['status']) => <Tag color={ADR_STATUS_META[v].color}>{ADR_STATUS_META[v].label}</Tag>,
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

export default function AdrMonitoringM715Page() {
  usePageTitle('药品不良反应监测');
  const { items, loading, error, demo, load } = useAdrMonitoringM715Store();
  const [detail, setDetail] = useState<AdrReport | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="药品不良反应监测"
      description="报告号 / 患者 / 可疑药品 / 反应名称 / 分级 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`ADR 报告（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="ADR 报告详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="报告号">{detail.reportNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="可疑药品">{detail.suspectedDrug}</Descriptions.Item>
            <Descriptions.Item label="不良反应">{detail.reaction}</Descriptions.Item>
            <Descriptions.Item label="分级">
              <Tag color={ADR_GRADE_META[detail.grade].color}>{ADR_GRADE_META[detail.grade].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="不良反应过程描述">{detail.process}</Descriptions.Item>
            <Descriptions.Item label="处理措施">{detail.handling}</Descriptions.Item>
            <Descriptions.Item label="因果关系评价">{detail.causality}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={ADR_STATUS_META[detail.status].color}>{ADR_STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
