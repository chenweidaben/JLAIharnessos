/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 系统监控：服务状态 + 性能指标 + 数据库/缓存/MQ监控 + Agent/集成监控 + 告警中心 + 错误日志 + 调用链 + 健康报告
 */
import { useEffect, useState } from 'react';
import { Button, Card, Col, Drawer, Progress, Row, Space, Table, Tabs, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ReloadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type {
  ServiceStatus,
  Alert,
  ErrorLog,
  TraceInfo,
  HealthCheckItem,
  AlertLevel,
} from '@/types/system';
import { ALERT_LEVEL_COLOR } from '@/types/system';
import { useSystemStore } from '@/store/systemStore';

const SVC_STATUS_COLOR: Record<string, string> = {
  running: 'green',
  error: 'red',
  stopped: 'default',
  maintenance: 'orange',
};

const ALERT_LEVEL_LABEL: Record<AlertLevel, string> = {
  P0: '紧急',
  P1: '严重',
  P2: '一般',
  P3: '提示',
};

export default function SystemMonitor() {
  const { monitorData, fetchMonitorData } = useSystemStore();
  const [tab, setTab] = useState('services');
  const [alertDetail, setAlertDetail] = useState<Alert | null>(null);
  const [traceDetail, setTraceDetail] = useState<TraceInfo | null>(null);
  const [errDetail, setErrDetail] = useState<ErrorLog | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void fetchMonitorData();
  }, [fetchMonitorData, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    message.success('监控数据已刷新');
  };

  const serviceColumns: ColumnsType<ServiceStatus> = [
    { title: '服务名称', dataIndex: 'name', width: 140 },
    { title: '版本', dataIndex: 'version', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => (
        <Tag color={SVC_STATUS_COLOR[s]}>
          {s === 'running'
            ? '运行中'
            : s === 'error'
              ? '异常'
              : s === 'stopped'
                ? '停止'
                : '维护中'}
        </Tag>
      ),
    },
    {
      title: 'CPU',
      dataIndex: 'cpuUsage',
      width: 100,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          showInfo={false}
          strokeColor={v > 80 ? '#F5222D' : v > 60 ? '#FA8C16' : '#52C41A'}
        />
      ),
    },
    {
      title: '内存',
      dataIndex: 'memoryUsage',
      width: 100,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          showInfo={false}
          strokeColor={v > 80 ? '#F5222D' : v > 60 ? '#FA8C16' : '#52C41A'}
        />
      ),
    },
    {
      title: '磁盘',
      dataIndex: 'diskUsage',
      width: 100,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          showInfo={false}
          strokeColor={v > 80 ? '#F5222D' : v > 60 ? '#FA8C16' : '#52C41A'}
        />
      ),
    },
    {
      title: '响应(ms)',
      dataIndex: 'responseMs',
      width: 90,
      render: (v: number) => <span className={v > 1000 ? 'text-danger' : ''}>{v}</span>,
    },
    { title: 'QPS', dataIndex: 'qps', width: 80 },
    {
      title: '错误率',
      dataIndex: 'errorRate',
      width: 80,
      render: (v: number) => (
        <span className={v > 0.01 ? 'text-danger' : ''}>{(v * 100).toFixed(2)}%</span>
      ),
    },
  ];

  const alertColumns: ColumnsType<Alert> = [
    { title: '时间', dataIndex: 'time', width: 160 },
    {
      title: '级别',
      dataIndex: 'level',
      width: 70,
      render: (l: AlertLevel) => (
        <Tag color={ALERT_LEVEL_COLOR[l]}>
          {l} {ALERT_LEVEL_LABEL[l]}
        </Tag>
      ),
    },
    { title: '类型', dataIndex: 'type', width: 100 },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '来源', dataIndex: 'source', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => (
        <Tag color={s === 'active' ? 'red' : s === 'acknowledged' ? 'orange' : 'green'}>{s}</Tag>
      ),
    },
    { title: '处理人', dataIndex: 'handler', width: 80 },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, r) => (
        <Button type="link" size="small" onClick={() => setAlertDetail(r)}>
          详情
        </Button>
      ),
    },
  ];

  const errColumns: ColumnsType<ErrorLog> = [
    { title: '时间', dataIndex: 'time', width: 160 },
    { title: '服务', dataIndex: 'service', width: 120 },
    {
      title: '级别',
      dataIndex: 'level',
      width: 80,
      render: (l: string) => (
        <Tag color={l === 'FATAL' ? 'red' : l === 'ERROR' ? 'orange' : 'default'}>{l}</Tag>
      ),
    },
    { title: '错误信息', dataIndex: 'message', ellipsis: true },
    { title: 'TraceID', dataIndex: 'traceId', width: 200, ellipsis: true },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, r) => (
        <Button type="link" size="small" onClick={() => setErrDetail(r)}>
          详情
        </Button>
      ),
    },
  ];

  const traceColumns: ColumnsType<TraceInfo> = [
    { title: 'TraceID', dataIndex: 'traceId', width: 220, ellipsis: true },
    { title: '服务', dataIndex: 'service', width: 120 },
    {
      title: '耗时(ms)',
      dataIndex: 'durationMs',
      width: 100,
      render: (v: number) => <span className={v > 3000 ? 'text-danger' : ''}>{v}</span>,
    },
    { title: 'Span数', dataIndex: 'spanCount', width: 80 },
    { title: '时间', dataIndex: 'startTime', width: 160 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) => <Tag color={s === 'ok' ? 'green' : 'red'}>{s}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, r) => (
        <Button type="link" size="small" onClick={() => setTraceDetail(r)}>
          查看
        </Button>
      ),
    },
  ];

  const healthColumns: ColumnsType<HealthCheckItem> = [
    { title: '检查项', dataIndex: 'name', width: 160 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) =>
        s === 'healthy' ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            正常
          </Tag>
        ) : s === 'degraded' ? (
          <Tag icon={<ExclamationCircleOutlined />} color="warning">
            降级
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            异常
          </Tag>
        ),
    },
    { title: '详情', dataIndex: 'detail', ellipsis: true },
    { title: '最后检查', dataIndex: 'lastCheck', width: 160 },
  ];

  const activeAlerts = monitorData.alerts.filter((a) => a.status === 'active').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="m-0 text-lg font-semibold text-ink-primary">系统监控</h2>
          <p className="mt-1 mb-0 text-sm text-ink-secondary">
            服务状态、性能指标、告警中心、错误日志、调用链追踪
          </p>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => message.success('健康报告已导出')}>
            导出报告
          </Button>
          <Button type="primary" icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 概览卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <div className="text-sm text-ink-secondary">系统健康评分</div>
            <Progress
              type="dashboard"
              percent={monitorData.healthScore}
              size={80}
              strokeColor={
                monitorData.healthScore > 80
                  ? '#52C41A'
                  : monitorData.healthScore > 60
                    ? '#FA8C16'
                    : '#F5222D'
              }
              className="mt-2"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div className="text-sm text-ink-secondary">运行服务</div>
            <div className="mt-2 text-2xl font-semibold text-success">
              {monitorData.services.filter((s) => s.status === 'running').length}
              <span className="text-sm text-ink-secondary"> / {monitorData.services.length}</span>
            </div>
            <div className="text-xs text-ink-secondary mt-1">活跃告警 {activeAlerts} 条</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div className="text-sm text-ink-secondary">并发用户</div>
            <div className="mt-2 text-2xl font-semibold">
              {monitorData.performance.concurrentUsers}
            </div>
            <div className="text-xs text-ink-secondary mt-1">
              吞吐量 {monitorData.performance.throughput} req/s
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div className="text-sm text-ink-secondary">Agent Token消耗(今日)</div>
            <div className="mt-2 text-2xl font-semibold">
              {(monitorData.agentService.tokenToday / 10000).toFixed(1)}万
            </div>
            <div className="text-xs text-ink-secondary mt-1">
              模型调用 {monitorData.agentService.modelCalls} 次
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-card">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'services',
              label: '服务状态',
              children: (
                <Table<ServiceStatus>
                  rowKey="name"
                  size="middle"
                  columns={serviceColumns}
                  dataSource={monitorData.services}
                  pagination={false}
                />
              ),
            },
            {
              key: 'alerts',
              label: `告警中心 (${activeAlerts})`,
              children: (
                <Table<Alert>
                  rowKey="id"
                  size="middle"
                  columns={alertColumns}
                  dataSource={monitorData.alerts}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'errors',
              label: '错误日志',
              children: (
                <Table<ErrorLog>
                  rowKey="id"
                  size="middle"
                  columns={errColumns}
                  dataSource={monitorData.errorLogs}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'traces',
              label: '调用链追踪',
              children: (
                <Table<TraceInfo>
                  rowKey="traceId"
                  size="middle"
                  columns={traceColumns}
                  dataSource={monitorData.traces}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'health',
              label: '健康检查',
              children: (
                <div>
                  <div className="mb-3">
                    <div className="text-sm text-ink-secondary mb-1">健康趋势（近7天）</div>
                    <div className="flex items-end gap-2 h-20">
                      {monitorData.healthTrend.map((t) => (
                        <div key={t.date} className="flex-1 flex flex-col items-center">
                          <div className="text-xs text-ink-secondary">{t.score}</div>
                          <div
                            className="w-full rounded-t"
                            style={{
                              height: `${t.score}%`,
                              background:
                                t.score > 80 ? '#52C41A' : t.score > 60 ? '#FA8C16' : '#F5222D',
                              minHeight: 2,
                            }}
                          />
                          <div className="text-xs text-ink-secondary mt-1">{t.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Table<HealthCheckItem>
                    rowKey="name"
                    size="middle"
                    columns={healthColumns}
                    dataSource={monitorData.healthChecks}
                    pagination={false}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 告警详情 */}
      <Drawer
        open={!!alertDetail}
        onClose={() => setAlertDetail(null)}
        width={480}
        title="告警详情"
      >
        {alertDetail && (
          <div className="space-y-3">
            <p>
              <Tag color={ALERT_LEVEL_COLOR[alertDetail.level]}>
                {alertDetail.level} {ALERT_LEVEL_LABEL[alertDetail.level]}
              </Tag>
            </p>
            <p className="text-sm">
              <span className="text-ink-secondary">时间：</span>
              {alertDetail.time}
            </p>
            <p className="text-sm">
              <span className="text-ink-secondary">类型：</span>
              {alertDetail.type}
            </p>
            <p className="text-sm">
              <span className="text-ink-secondary">来源：</span>
              {alertDetail.source}
            </p>
            <p className="text-sm">
              <span className="text-ink-secondary">内容：</span>
              {alertDetail.content}
            </p>
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  message.success('告警已确认');
                  setAlertDetail(null);
                }}
              >
                确认告警
              </Button>
              <Button
                onClick={() => {
                  message.success('告警已关闭');
                  setAlertDetail(null);
                }}
              >
                关闭告警
              </Button>
            </Space>
          </div>
        )}
      </Drawer>

      {/* 调用链详情 */}
      <Drawer
        open={!!traceDetail}
        onClose={() => setTraceDetail(null)}
        width={640}
        title="调用链详情"
      >
        {traceDetail && (
          <div>
            <p className="text-sm mb-3">
              <span className="text-ink-secondary">TraceID：</span>
              {traceDetail.traceId}
            </p>
            <p className="text-sm mb-3">
              <span className="text-ink-secondary">总耗时：</span>
              {traceDetail.durationMs}ms
            </p>
            <Card size="small" title="Span 拓扑">
              {(traceDetail.spans ?? []).map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-1 border-b border-ink-border last:border-0"
                >
                  <Tag color="blue">{s.service}</Tag>
                  <span className="flex-1">{s.durationMs}ms</span>
                  <Tag color={s.status === 'ok' ? 'green' : 'red'}>{s.status}</Tag>
                </div>
              ))}
            </Card>
          </div>
        )}
      </Drawer>

      {/* 错误详情 */}
      <Drawer open={!!errDetail} onClose={() => setErrDetail(null)} width={640} title="错误详情">
        {errDetail && (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="text-ink-secondary">时间：</span>
              {errDetail.time}
            </p>
            <p className="text-sm">
              <span className="text-ink-secondary">服务：</span>
              {errDetail.service}
            </p>
            <p className="text-sm">
              <span className="text-ink-secondary">级别：</span>
              <Tag color={errDetail.level === 'FATAL' ? 'red' : 'orange'}>{errDetail.level}</Tag>
            </p>
            <p className="text-sm">
              <span className="text-ink-secondary">信息：</span>
              {errDetail.message}
            </p>
            <p className="text-sm">
              <span className="text-ink-secondary">TraceID：</span>
              {errDetail.traceId}
            </p>
            {errDetail.stack && (
              <Card size="small" title="错误堆栈">
                <pre className="text-xs bg-ink-bg p-2 rounded overflow-auto">{errDetail.stack}</pre>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
