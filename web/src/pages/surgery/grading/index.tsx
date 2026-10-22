/**
 * 健澜科技 jlmedaios - 手术分级授权管理（M712）
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
import { useSurgeryGradingM712Store } from '@/store/surgeryGradingM712Store';
import {
  SURGERY_GRADE_META,
  type SurgeryGrading,
} from '@/services/api/surgeryGradingM712';

const assessColumns: ColumnsType<{ date: string; result: string }> = [
  { title: '考核日期', dataIndex: 'date', width: 140 },
  { title: '考核结果', dataIndex: 'result' },
];

const changeColumns: ColumnsType<{ date: string; change: string }> = [
  { title: '变更日期', dataIndex: 'date', width: 140 },
  { title: '变更内容', dataIndex: 'change' },
];

const buildColumns = (setDetail: (r: SurgeryGrading) => void): ColumnsType<SurgeryGrading> => [
  { title: '医师姓名', dataIndex: 'physician', width: 110 },
  { title: '科室', dataIndex: 'dept', width: 120 },
  {
    title: '授权级别',
    dataIndex: 'grade',
    width: 110,
    render: (v: SurgeryGrading['grade']) => <Tag color={SURGERY_GRADE_META[v].color}>{SURGERY_GRADE_META[v].label}</Tag>,
  },
  {
    title: '授权手术种类',
    dataIndex: 'authorizedSurgeries',
    ellipsis: true,
    render: (arr: string[]) => arr.join('、'),
  },
  { title: '有效期至', dataIndex: 'validUntil', width: 120 },
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

export default function SurgeryGradingM712Page() {
  usePageTitle('手术分级授权管理');
  const { items, loading, error, demo, load } = useSurgeryGradingM712Store();
  const [detail, setDetail] = useState<SurgeryGrading | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="手术分级授权管理"
      description="医师姓名 / 科室 / 授权级别 / 授权手术种类 / 有效期"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`手术授权（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="手术分级授权详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="医师">{detail.physician}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="授权级别">
                <Tag color={SURGERY_GRADE_META[detail.grade].color}>{SURGERY_GRADE_META[detail.grade].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="有效期至">{detail.validUntil}</Descriptions.Item>
              <Descriptions.Item label="授权手术清单" span={2}>
                {detail.authorizedSurgeries.map((s) => <Tag key={s} style={{ marginBottom: 4 }}>{s}</Tag>)}
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="考核记录" style={{ marginBottom: 16 }}>
              <Table rowKey="date" dataSource={detail.assessments} columns={assessColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="授权变更记录">
              {detail.changes.length ? (
                <Table rowKey="date" dataSource={detail.changes} columns={changeColumns} size="small" pagination={false} />
              ) : (
                <span style={{ color: '#999' }}>无变更记录</span>
              )}
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
