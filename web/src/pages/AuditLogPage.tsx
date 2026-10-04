/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 操作审计日志：列表 / 筛选 / 详情 / 统计概览 / 分布图与趋势（只读，不可删除）。
 * 真实 BFF + PostgreSQL 哈希链审计，无 mock。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Col,
  Drawer,
  Input,
  Layout,
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
  FileSearchOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons';

import DemoModeBanner from '@/components/common/DemoModeBanner';
import BaseChart from '@/components/charts/BaseChart';
import { useAuditLogStore } from '@/store/auditLogStore';
import type { AuditLogItem } from '@/types/adminLog';

const { Header, Content } = Layout;

const RESULT_COLOR: Record<string, string> = {
  success: 'success',
  denied: 'warning',
  failure: 'error',
};
const RESULT_LABEL: Record<string, string> = {
  success: '成功',
  denied: '拒绝',
  failure: '失败',
};
const RISK_COLOR = { low: 'success', medium: 'warning', high: 'error' } as const;
const RISK_LABEL = { low: '低', medium: '中', high: '高' } as const;

export default function AuditLogPage() {
  const {
    dbUp, healthChecking, items, total, overview, distribution, trend, selected, loading,
    filter, checkHealth, load, setFilter, resetFilter, openDetail, closeDetail,
  } = useAuditLogStore();

  const [ready, setReady] = useState(false);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await load();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 操作类型分布饼图（真实数据） */
  const pieOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' as const },
      legend: { type: 'scroll', bottom: 0 },
      series: [
        {
          type: 'pie' as const,
          radius: ['40%', '70%'],
          data: distribution.map((d) => ({ name: d.action, value: d.count })),
        },
      ],
    }),
    [distribution],
  );

  /* 近 7 天趋势（总量/异常，真实数据） */
  const lineOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['总量', '异常'] },
      xAxis: {
        type: 'category' as const,
        data: trend.map((t) => t.date.slice(5)),
      },
      yAxis: { type: 'value' as const },
      series: [
        { name: '总量', type: 'line' as const, data: trend.map((t) => t.total), smooth: true },
        {
          name: '异常',
          type: 'line' as const,
          data: trend.map((t) => t.abnormal),
          smooth: true,
        },
      ],
    }),
    [trend],
  );

  const doSearch = () => {
    setFilter({ actorKeyword: keyword });
  };

  const columns: ColumnsType<AuditLogItem> = [
    { title: '操作时间', dataIndex: 'createdAt', width: 175 },
    {
      title: '操作人',
      render: (_, l) => (
        <div>
          <div>{l.actorName ?? '（匿名/系统）'}</div>
          {l.actorRole && (
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{l.actorRole}</div>
          )}
        </div>
      ),
    },
    { title: '动作', dataIndex: 'action', width: 180 },
    { title: '资源类型', dataIndex: 'resourceType', width: 110 },
    { title: 'IP', dataIndex: 'clientIp', width: 130 },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      render: (r: string) => (
        <Tag color={RESULT_COLOR[r] ?? 'default'}>{RESULT_LABEL[r] ?? r}</Tag>
      ),
    },
    {
      title: '风险',
      dataIndex: 'riskLevel',
      width: 80,
      render: (r: string | null) =>
        r ? (
          <Tag color={RISK_COLOR[r as keyof typeof RISK_COLOR]}>
            {RISK_LABEL[r as keyof typeof RISK_LABEL]}
          </Tag>
        ) : (
          <span style={{ color: '#d9d9d9' }}>—</span>
        ),
    },
    {
      title: '详情',
      width: 80,
      render: (_, l) => (
        <Button type="link" size="small" icon={<FileSearchOutlined />} onClick={() => void openDetail(l.seq)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <Watermark content={['健澜科技', '操作审计', 'jlmedaios']}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SafetyCertificateOutlined className="text-2xl text-white" />
            <span className="text-lg font-semibold text-white">
              操作审计 · 只读、哈希链防篡改
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="audit-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="audit-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，审计日志不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充审计结果。"
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
              <div data-testid="audit-content">
                <Row gutter={16} className="mb-3">
                  <Col span={6}>
                    <div className="jl-card p-4">
                      <Statistic title="今日操作" value={overview?.today ?? 0} />
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="jl-card p-4">
                      <Statistic
                        title="异常（拒绝/失败）"
                        value={overview?.abnormal ?? 0}
                        valueStyle={{ color: '#f5222d' }}
                      />
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="jl-card p-4">
                      <Statistic
                        title="高危操作"
                        value={overview?.highRisk ?? 0}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="jl-card p-4">
                      <Statistic title="累计日志" value={overview?.total ?? 0} />
                    </div>
                  </Col>
                </Row>

                <Row gutter={16} className="mb-3">
                  <Col span={12}>
                    <div className="jl-card p-4">
                      <BaseChart option={pieOption} height={260} />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="jl-card p-4">
                      <BaseChart option={lineOption} height={260} />
                    </div>
                  </Col>
                </Row>

                <div className="jl-card mb-3 p-3">
                  <Space wrap>
                    <Input
                      prefix={<SearchOutlined />}
                      placeholder="操作人姓名"
                      style={{ width: 180 }}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onPressEnter={doSearch}
                      allowClear
                    />
                    <Select
                      allowClear
                      placeholder="动作"
                      style={{ width: 180 }}
                      value={filter.action}
                      onChange={(v) => setFilter({ action: v })}
                      options={distribution.map((d) => ({ value: d.action, label: d.action }))}
                    />
                    <Select
                      allowClear
                      placeholder="结果"
                      style={{ width: 120 }}
                      value={filter.result}
                      onChange={(v) => setFilter({ result: v })}
                      options={[
                        { value: 'success', label: '成功' },
                        { value: 'denied', label: '拒绝' },
                        { value: 'failure', label: '失败' },
                      ]}
                    />
                    <Select
                      allowClear
                      placeholder="风险"
                      style={{ width: 110 }}
                      value={filter.riskLevel}
                      onChange={(v) => setFilter({ riskLevel: v })}
                      options={[
                        { value: 'low', label: '低' },
                        { value: 'medium', label: '中' },
                        { value: 'high', label: '高' },
                      ]}
                    />
                    <Button type="primary" icon={<SearchOutlined />} onClick={doSearch}>
                      查询
                    </Button>
                    <Button
                      onClick={() => {
                        setKeyword('');
                        resetFilter();
                      }}
                    >
                      重置
                    </Button>
                    <Button icon={<ReloadOutlined />} loading={loading} onClick={() => load()}>
                      刷新
                    </Button>
                  </Space>
                </div>

                <Table<AuditLogItem>
                  rowKey="seq"
                  size="middle"
                  columns={columns}
                  dataSource={items}
                  loading={loading}
                  scroll={{ x: 1100 }}
                  pagination={{
                    current: filter.page,
                    pageSize: filter.pageSize,
                    total,
                    showTotal: (t) => `共 ${t} 条`,
                    onChange: (page, pageSize) => {
                      setFilter({ page, pageSize });
                    },
                  }}
                />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>

      <Drawer
        open={!!selected}
        title="审计日志详情"
        width={640}
        onClose={closeDetail}
      >
        {selected && (
          <div>
            <p>
              <b>动作：</b>
              {selected.action}
            </p>
            <p>
              <b>操作人：</b>
              {selected.actorName ?? '（匿名/系统）'}
              {selected.actorRole ? ` · ${selected.actorRole}` : ''}
            </p>
            <p>
              <b>时间：</b>
              {selected.createdAt}
            </p>
            <p>
              <b>资源：</b>
              {selected.resourceType ?? '—'} / {selected.resourceId ?? '—'}
            </p>
            <p>
              <b>IP / 终端：</b>
              {selected.clientIp ?? '—'}
              {selected.userAgent ? ` · ${selected.userAgent}` : ''}
            </p>
            <p>
              <b>结果：</b>
              <Tag color={RESULT_COLOR[selected.result]}>
                {RESULT_LABEL[selected.result]}
              </Tag>
            </p>
            {selected.traceId && (
              <p>
                <b>Trace ID：</b>
                <span style={{ fontSize: 12 }}>{selected.traceId}</span>
              </p>
            )}
            <div className="mt-3">
              <b>变更摘要 detail</b>
              <pre className="mt-2 overflow-auto rounded p-3" style={{ background: '#f5f7fa', fontSize: 12 }}>
                {JSON.stringify(selected.detail, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </Watermark>
  );
}
