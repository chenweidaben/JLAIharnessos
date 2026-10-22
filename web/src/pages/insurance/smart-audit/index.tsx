/**
 * 健澜科技 jlmedaios - 医保智能审核（M770）
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
import { useSmartAuditM770Store } from '@/store/smartAuditM770Store';
import {
  SMART_AUDIT_RESULT_META,
  type SmartAudit,
} from '@/services/api/smartAuditM770';

const appealColumns: ColumnsType<{ time: string; by: string; result: string }> = [
  { title: '时间', dataIndex: 'time', width: 160 },
  { title: '申诉人', dataIndex: 'by', width: 160 },
  { title: '结果', dataIndex: 'result' },
];

const buildColumns = (setDetail: (r: SmartAudit) => void): ColumnsType<SmartAudit> => [
  { title: '审核单号', dataIndex: 'auditNo', width: 150 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '费用总额', dataIndex: 'totalCost', width: 120, align: 'right', render: (v: number) => `¥${v.toLocaleString()}` },
  { title: '违规金额', dataIndex: 'violationAmount', width: 120, align: 'right', render: (v: number) => <Tag color="red">¥{v.toLocaleString()}</Tag> },
  {
    title: '审核结果',
    dataIndex: 'result',
    width: 120,
    render: (v: SmartAudit['result']) => <Tag color={SMART_AUDIT_RESULT_META[v].color}>{SMART_AUDIT_RESULT_META[v].label}</Tag>,
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

export default function SmartAuditM770Page() {
  usePageTitle('医保智能审核');
  const { items, loading, error, demo, load } = useSmartAuditM770Store();
  const [detail, setDetail] = useState<SmartAudit | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医保智能审核"
      description="审核单号 / 患者姓名 / 费用总额 / 违规金额 / 审核结果"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`智能审核（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="智能审核详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="审核单号">{detail.auditNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="费用总额">¥{detail.totalCost.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="违规金额">¥{detail.violationAmount.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="审核结果">
                <Tag color={SMART_AUDIT_RESULT_META[detail.result].color}>{SMART_AUDIT_RESULT_META[detail.result].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="违规明细" span={2}>{detail.details}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="违规规则命中" style={{ marginBottom: 16 }}>
              {detail.rules.map((r) => <Tag key={r} color="red" style={{ marginBottom: 4 }}>{r}</Tag>)}
            </Card>
            <Card size="small" title="申诉记录">
              <Table rowKey="time" dataSource={detail.appeals} columns={appealColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
