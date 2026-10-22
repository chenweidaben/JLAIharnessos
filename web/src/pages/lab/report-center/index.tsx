/**
 * 健澜科技 jlmedaios - 检验报告中心（M677）
 *
 * 三甲流程：报告 Table（报告号/患者/项目/状态 badge/时间）+ 详情 Modal（项目/结果/参考范围/异常箭头）。
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
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useLabReportCenterM677Store } from '@/store/labReportCenterM677Store';
import {
  FLAG_META,
  REPORT_STATUS_META,
  type LabReport,
  type LabReportItem,
} from '@/services/api/labReportCenterM677';

const itemColumns: ColumnsType<LabReportItem> = [
  { title: '项目', dataIndex: 'name' },
  { title: '结果', dataIndex: 'value', align: 'right', render: (v: string, row) => <strong style={{ color: FLAG_META[row.flag].color === 'default' ? 'inherit' : '#cf1322' }}>{v}</strong> },
  { title: '单位', dataIndex: 'unit', width: 90 },
  { title: '参考范围', dataIndex: 'refRange', width: 140 },
  {
    title: '异常',
    dataIndex: 'flag',
    width: 120,
    render: (v: LabReportItem['flag']) => <Tag color={FLAG_META[v].color}>{FLAG_META[v].label}</Tag>,
  },
];

const buildColumns = (setDetail: (r: LabReport) => void): ColumnsType<LabReport> => [
  { title: '报告号', dataIndex: 'reportNo', width: 150 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '科室', dataIndex: 'dept', width: 120 },
  { title: '检验项目', dataIndex: 'panel' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (v: LabReport['status']) => <Tag color={REPORT_STATUS_META[v].color}>{REPORT_STATUS_META[v].label}</Tag>,
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

export default function LabReportCenterM677Page() {
  usePageTitle('检验报告中心');

  const { items, loading, error, demo, load } = useLabReportCenterM677Store();
  const [detail, setDetail] = useState<LabReport | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="检验报告中心"
      description="报告号 / 项目 / 状态 / 时间"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`检验报告（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="检验报告详情"
        width={720}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="报告号">{detail.reportNo}</Descriptions.Item>
              <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="检验项目">{detail.panel}</Descriptions.Item>
              <Descriptions.Item label="报告时间">{dayjs(detail.reportedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={REPORT_STATUS_META[detail.status].color}>{REPORT_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Table
              rowKey="name"
              dataSource={detail.items}
              columns={itemColumns}
              size="small"
              pagination={false}
            />
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
