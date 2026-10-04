/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 登录日志：列表 / 筛选 / 统计 / 趋势 / 对在线用户强制下线。
 * 真实 BFF + PostgreSQL（iam.login_attempts + clinical.user_sessions），无 mock。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  Col,
  Drawer,
  Input,
  Layout,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Watermark,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';

import DemoModeBanner from '@/components/common/DemoModeBanner';
import BaseChart from '@/components/charts/BaseChart';
import { useLoginLogStore } from '@/store/loginLogStore';
import type { LoginLogItem } from '@/types/adminLog';

const { Header, Content } = Layout;

export default function LoginLogPage() {
  const { message } = AntdApp.useApp();
  const {
    dbUp, healthChecking, items, total, overview, trend, loading, acting, filter,
    checkHealth, load, setFilter, forceLogout,
  } = useLoginLogStore();

  const [ready, setReady] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<LoginLogItem | null>(null);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await load();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 近 7 天登录趋势（成功/失败，真实数据） */
  const lineOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['成功', '失败'] },
      xAxis: {
        type: 'category' as const,
        data: trend.map((t) => t.date.slice(5)),
      },
      yAxis: { type: 'value' as const },
      series: [
        {
          name: '成功',
          type: 'line' as const,
          stack: 'a',
          data: trend.map((t) => t.success),
          smooth: true,
          areaStyle: {},
        },
        {
          name: '失败',
          type: 'line' as const,
          stack: 'a',
          data: trend.map((t) => t.failure),
          smooth: true,
        },
      ],
    }),
    [trend],
  );

  const doSearch = () => setFilter({ keyword });

  const columns: ColumnsType<LoginLogItem> = [
    { title: '登录时间', dataIndex: 'createdAt', width: 175 },
    {
      title: '用户',
      render: (_, l) => (
        <div>
          <div>{l.realName ?? l.username}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {l.username}
            {l.department ? ` · ${l.department}` : ''}
          </div>
        </div>
      ),
    },
    { title: 'IP', dataIndex: 'ip', width: 130 },
    {
      title: '结果',
      dataIndex: 'success',
      width: 110,
      render: (ok: boolean, l) =>
        ok ? (
          <Tag color="success">成功</Tag>
        ) : (
          <Tag color="error">{l.failReason ?? '失败'}</Tag>
        ),
    },
    {
      title: '在线状态',
      dataIndex: 'online',
      width: 100,
      render: (online: boolean) =>
        online ? <Tag color="processing">在线</Tag> : <span style={{ color: '#d9d9d9' }}>离线</span>,
    },
    {
      title: '终端',
      dataIndex: 'userAgent',
      ellipsis: true,
      width: 200,
      render: (ua: string | null) => ua ?? '—',
    },
    {
      title: '操作',
      width: 130,
      render: (_, l) =>
        l.online && l.userId ? (
          <Popconfirm
            title="确认强制该用户全部会话下线？"
            onConfirm={async () => {
              const ok = await forceLogout(l.userId as string);
              if (ok) message.success('已强制下线');
            }}
          >
            <Button type="link" size="small" danger icon={<LogoutOutlined />}>
              强制下线
            </Button>
          </Popconfirm>
        ) : (
          <Button type="link" size="small" icon={<SearchOutlined />} onClick={() => setDetail(l)}>
            详情
          </Button>
        ),
    },
  ];

  return (
    <Watermark content={['健澜科技', '登录日志', 'jlmedaios']}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <LoginOutlined className="text-2xl text-white" />
            <span className="text-lg font-semibold text-white">
              登录日志 · 成功/失败全程留痕
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="loginlog-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="loginlog-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，登录日志不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充登录日志。"
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() =>
                      void checkHealth().then((up) => {
                        if (up) void load();
                      })
                    }
                  >
                    刷 新
                  </button>
                }
              />
            ) : (
              <div data-testid="loginlog-content">
                <Row gutter={16} className="mb-3">
                  <Col span={6}>
                    <div className="jl-card p-4">
                      <Statistic title="今日登录" value={overview?.today ?? 0} />
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="jl-card p-4">
                      <Statistic title="当前在线" value={overview?.online ?? 0} />
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="jl-card p-4">
                      <Statistic
                        title="今日失败"
                        value={overview?.todayFail ?? 0}
                        valueStyle={{ color: '#f5222d' }}
                      />
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="jl-card p-4">
                      <Statistic
                        title="累计失败率"
                        value={overview?.failRate ?? 0}
                        suffix="%"
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </div>
                  </Col>
                </Row>

                <div className="jl-card mb-3 p-4">
                  <BaseChart option={lineOption} height={220} />
                </div>

                <div className="jl-card mb-3 p-3">
                  <Space wrap>
                    <Input
                      prefix={<SearchOutlined />}
                      placeholder="姓名/用户名"
                      style={{ width: 180 }}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onPressEnter={doSearch}
                      allowClear
                    />
                    <Select
                      allowClear
                      placeholder="结果"
                      style={{ width: 120 }}
                      value={filter.success}
                      onChange={(v) => setFilter({ success: v })}
                      options={[
                        { value: true, label: '成功' },
                        { value: false, label: '失败' },
                      ]}
                    />
                    <Button type="primary" icon={<SearchOutlined />} onClick={doSearch}>
                      查询
                    </Button>
                    <Button
                      onClick={() => {
                        setKeyword('');
                        setFilter({ keyword: '', success: undefined, page: 1 });
                      }}
                    >
                      重置
                    </Button>
                    <Button icon={<ReloadOutlined />} loading={loading} onClick={() => load()}>
                      刷新
                    </Button>
                  </Space>
                </div>

                <Table<LoginLogItem>
                  rowKey="id"
                  size="middle"
                  columns={columns}
                  dataSource={items}
                  loading={loading || acting}
                  scroll={{ x: 1100 }}
                  pagination={{
                    current: filter.page,
                    pageSize: filter.pageSize,
                    total,
                    showTotal: (t) => `共 ${t} 条`,
                    onChange: (page, pageSize) => setFilter({ page, pageSize }),
                  }}
                />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>

      <Drawer open={!!detail} title="登录尝试详情" width={560} onClose={() => setDetail(null)}>
        {detail && (
          <div>
            <p>
              <b>时间：</b>
              {detail.createdAt}
            </p>
            <p>
              <b>用户：</b>
              {detail.realName ?? detail.username}（{detail.username}）
            </p>
            <p>
              <b>IP：</b>
              {detail.ip ?? '—'}
            </p>
            <p>
              <b>结果：</b>
              {detail.success ? (
                <Tag color="success">成功</Tag>
              ) : (
                <Tag color="error">{detail.failReason ?? '失败'}</Tag>
              )}
            </p>
            <p>
              <b>终端 UA：</b>
              {detail.userAgent ?? '—'}
            </p>
          </div>
        )}
      </Drawer>
    </Watermark>
  );
}
