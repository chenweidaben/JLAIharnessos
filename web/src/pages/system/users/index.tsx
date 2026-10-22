/**
 * 健澜科技 jlmedaios - 用户管理（M743，升级自 M223 简易页）
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
import { useSystemUserM743Store } from '@/store/systemUserM743Store';
import {
  USER_STATUS_META,
  type SystemUser,
} from '@/services/api/systemUserM743';

const logColumns: ColumnsType<{ time: string; ip: string; result: string }> = [
  { title: '登录时间', dataIndex: 'time', width: 180 },
  { title: 'IP 地址', dataIndex: 'ip', width: 140 },
  {
    title: '结果',
    dataIndex: 'result',
    render: (v: string) => <Tag color={v === '成功' ? 'green' : 'red'}>{v}</Tag>,
  },
];

const buildColumns = (setDetail: (r: SystemUser) => void): ColumnsType<SystemUser> => [
  { title: '用户名', dataIndex: 'username', width: 140 },
  { title: '姓名', dataIndex: 'name', width: 110 },
  { title: '科室', dataIndex: 'dept', width: 140 },
  { title: '角色', dataIndex: 'role', width: 140 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (v: SystemUser['status']) => <Tag color={USER_STATUS_META[v].color}>{USER_STATUS_META[v].label}</Tag>,
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

export default function SystemUsersPage() {
  usePageTitle('用户管理');
  const { items, loading, error, demo, load } = useSystemUserM743Store();
  const [detail, setDetail] = useState<SystemUser | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="用户管理"
      description="用户名 / 姓名 / 科室 / 角色 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`用户列表（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1000 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="用户详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="用户名">{detail.username}</Descriptions.Item>
              <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="科室">{detail.dept}</Descriptions.Item>
              <Descriptions.Item label="角色">{detail.role}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={USER_STATUS_META[detail.status].color}>{USER_STATUS_META[detail.status].label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Card size="small" title="权限清单" style={{ marginBottom: 16 }}>
              {detail.permissions.map((p) => <Tag key={p} color="blue" style={{ marginBottom: 4 }}>{p}</Tag>)}
            </Card>
            <Card size="small" title="登录日志">
              <Table rowKey="time" dataSource={detail.loginLogs} columns={logColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
