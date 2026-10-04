/* ============================================================================
 * 健澜科技杠OS - 会话管理页面（M7-F，真实 BFF）
 *
 * 在线会话审计 → 按 jti 或用户强制下线（JWT 主动吊销）。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { useEffect, useState } from 'react';
import {
  Alert, Button, Input, Layout, Popconfirm, Space, Spin, Table, Tag,
  Typography, Watermark, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SafetyOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSessionAdminStore } from '@/store/sessionAdminStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import type { ActiveSession } from '@/types/session';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '会话管理', 'jlmedaios'];

export default function SessionsPage() {
  const {
    dbUp, healthChecking, sessions, loading, acting,
    checkHealth, loadSessions, revokeByJti,
  } = useSessionAdminStore();
  const [ready, setReady] = useState(false);
  const [filterUserId, setFilterUserId] = useState('');

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadSessions();
      setReady(true);
    })();
  }, [checkHealth, loadSessions]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await loadSessions(filterUserId.trim() || undefined);
  };

  const onRevoke = async (jti: string) => {
    const ok = await revokeByJti(jti);
    if (ok) message.success('会话已吊销，该令牌立即失效');
  };

  const columns: ColumnsType<ActiveSession> = [
    {
      title: '用户 ID',
      dataIndex: 'userId',
      key: 'userId',
      ellipsis: true,
      width: 220,
    },
    {
      title: '登录时间',
      dataIndex: 'issuedAt',
      key: 'issuedAt',
      width: 190,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '过期时间',
      dataIndex: 'accessExpiresAt',
      key: 'accessExpiresAt',
      width: 190,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '终端 (User-Agent)',
      dataIndex: 'userAgent',
      key: 'userAgent',
      ellipsis: true,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (_, record) => (
        <Popconfirm
          title="强制下线"
          description="吊销后该令牌立即失效，确认？"
          okText="吊销"
          cancelText="取消"
          onConfirm={() => void onRevoke(record.jti)}
        >
          <Button size="small" danger>
            强制下线
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SafetyOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              会话管理 · 在线会话审计与强制下线
            </Typography.Title>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="session-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="session-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，会话管理不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充在线会话。"
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() => void onRefresh()}
                  >
                    刷 新
                  </button>
                }
              />
            ) : (
              <div data-testid="session-content">
                <Space className="mb-4" wrap>
                  <Input
                    allowClear
                    placeholder="按用户 ID 筛选"
                    value={filterUserId}
                    style={{ width: 260 }}
                    onChange={(e) => setFilterUserId(e.target.value)}
                    onPressEnter={() => void loadSessions(filterUserId.trim() || undefined)}
                  />
                  <Button
                    type="primary"
                    onClick={() => void loadSessions(filterUserId.trim() || undefined)}
                  >
                    查询
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    loading={loading}
                    onClick={() => void onRefresh()}
                  >
                    刷新
                  </Button>
                </Space>
                <Table<ActiveSession>
                  rowKey="jti"
                  columns={columns}
                  dataSource={sessions}
                  loading={loading || acting}
                  size="middle"
                  pagination={{ pageSize: 15, showSizeChanger: false }}
                />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
