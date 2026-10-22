/**
 * 健澜科技 jlmedaios - 医生站工作台（M674）
 *
 * 三甲流程：今日待办 Table（kind badge / 标题 / 患者 / 截止 / 紧急标）+ 快捷操作按钮组。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Button, Card, List, Space, Spin, Tag, Typography } from 'antd';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useDoctorWorkbenchM674Store } from '@/store/doctorWorkbenchM674Store';
import {
  TODO_KIND_META,
  type DoctorTodo,
} from '@/services/api/doctorWorkbenchM674';

export default function DoctorWorkbenchM674Page() {
  usePageTitle('医生站工作台');

  const { data, loading, error, demo, load } = useDoctorWorkbenchM674Store();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title={`医生站工作台 · ${data?.doctor ?? ''}（${data?.dept ?? ''}）`}
      description="今日待办 / 快捷操作"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="快捷操作" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary">新开医嘱</Button>
          <Button>写病历</Button>
          <Button>开检验</Button>
          <Button>开检查</Button>
          <Button>查房记录</Button>
          <Button>会诊申请</Button>
        </Space>
      </Card>

      <Card size="small" title={`今日待办（${data?.todo.length ?? 0}）`}>
        <Spin spinning={loading}>
          <List<DoctorTodo>
            size="small"
            dataSource={data?.todo ?? []}
            renderItem={(item) => (
              <List.Item
                actions={[
                  item.urgent ? <Tag color="red">紧急</Tag> : <Tag>普通</Tag>,
                  <Button type="link" size="small">处理</Button>,
                ]}
              >
                <Space>
                  <Tag color={TODO_KIND_META[item.kind].color}>{TODO_KIND_META[item.kind].label}</Tag>
                  <Typography.Text>{item.title}</Typography.Text>
                  <Typography.Text type="secondary">{item.patientId}</Typography.Text>
                  <Typography.Text type="secondary">· {item.dueAt}</Typography.Text>
                </Space>
              </List.Item>
            )}
          />
        </Spin>
      </Card>
    </PageContainer>
  );
}
