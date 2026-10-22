/**
 * 健澜科技 jlmedaios - 实习管理（M742）
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
import { useInternM742Store } from '@/store/internM742Store';
import {
  INTERN_STATUS_META,
  type Intern,
} from '@/services/api/internM742';

const buildColumns = (setDetail: (r: Intern) => void): ColumnsType<Intern> => [
  { title: '姓名', dataIndex: 'name', width: 100 },
  { title: '学校', dataIndex: 'school', width: 200, ellipsis: true },
  { title: '实习科室', dataIndex: 'dept', width: 130 },
  { title: '实习时间', dataIndex: 'period', width: 220 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: Intern['status']) => <Tag color={INTERN_STATUS_META[v].color}>{INTERN_STATUS_META[v].label}</Tag>,
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

export default function InternsM742Page() {
  usePageTitle('实习管理');
  const { items, loading, error, demo, load } = useInternM742Store();
  const [detail, setDetail] = useState<Intern | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="实习管理"
      description="姓名 / 学校 / 实习科室 / 实习时间 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`实习生（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="实习生详情"
        width={720}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="实习科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="学校" span={2}>{detail.school}</Descriptions.Item>
              <Descriptions.Item label="实习时间" span={2}>{detail.period}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={INTERN_STATUS_META[detail.status].color}>{INTERN_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="实习计划" style={{ marginBottom: 16 }}>{detail.plan}</Card>
            <Card size="small" title="出科考核" style={{ marginBottom: 16 }}>{detail.exitExam}</Card>
            <Card size="small" title="带教老师评价">{detail.tutorComment}</Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
