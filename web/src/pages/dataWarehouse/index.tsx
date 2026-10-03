/* ============================================================================
 * 健澜科技杠OS - 数据湖仓页面（M5-D，真实 BFF）
 *
 * 分层加工：clinical → dwd → dws → ads。
 *  - 触发全量/增量加工、单个作业重跑；
 *  - 院级日指标、科室日汇总、作业运行历史、数据血缘。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断加工。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { useEffect, useState } from 'react';
import {
  Alert, Button, Layout, Space, Spin, Statistic, Table, Tabs, Tag,
  Typography, Watermark,
} from 'antd';
import {
  CloudServerOutlined, DatabaseOutlined, ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDataWarehouseStore } from '@/store/dataWarehouseStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import type {
  DeptDailySummaryView,
  HospitalDailyMetricView,
  JobCode,
  JobRunView,
  LineageView,
} from '@/types/dataWarehouse';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '数据湖仓', 'jlmedaios'];

const jobLabels: Record<string, string> = {
  dwd_visit: 'DWD 就诊明细',
  dwd_fee: 'DWD 收费明细',
  dws_dept_daily: 'DWS 科室日汇总',
  ads_hospital_daily: 'ADS 院级日指标',
};

const statusColor: Record<string, string> = {
  success: 'green',
  running: 'processing',
  failed: 'red',
};

export default function DataWarehousePage() {
  const {
    dbUp, healthChecking, loading, running, lastRun, metrics, deptSummary,
    runs, lineage, error, checkHealth, loadAll, runPipeline, runJob, clearError,
  } = useDataWarehouseStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await loadAll();
      setReady(true);
    })();
  }, [checkHealth, loadAll]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await loadAll();
  };

  const metricColumns: ColumnsType<HospitalDailyMetricView> = [
    { title: '日期', dataIndex: 'statDate', key: 'statDate' },
    { title: '门诊量', dataIndex: 'outpatientVisits', key: 'outpatientVisits' },
    { title: '住院量', dataIndex: 'inpatientVisits', key: 'inpatientVisits' },
    { title: '急诊量', dataIndex: 'emergencyVisits', key: 'emergencyVisits' },
    { title: '总就诊量', dataIndex: 'totalVisits', key: 'totalVisits' },
    {
      title: '总收入(元)',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (v: number) => v.toFixed(2),
    },
    {
      title: '均次费用(元)',
      dataIndex: 'avgFeePerVisit',
      key: 'avgFeePerVisit',
      render: (v: number) => v.toFixed(2),
    },
  ];

  const deptColumns: ColumnsType<DeptDailySummaryView> = [
    { title: '日期', dataIndex: 'statDate', key: 'statDate' },
    { title: '科室', dataIndex: 'department', key: 'department' },
    {
      title: '类型',
      dataIndex: 'visitType',
      key: 'visitType',
      render: (v: string) => (
        <Tag>{v === 'outpatient' ? '门诊' : v === 'inpatient' ? '住院' : '急诊'}</Tag>
      ),
    },
    { title: '就诊量', dataIndex: 'visitCount', key: 'visitCount' },
    {
      title: '费用合计(元)',
      dataIndex: 'feeTotal',
      key: 'feeTotal',
      render: (v: number) => v.toFixed(2),
    },
  ];

  const runColumns: ColumnsType<JobRunView> = [
    {
      title: '作业',
      dataIndex: 'jobCode',
      key: 'jobCode',
      render: (v: string) => jobLabels[v] ?? v,
    },
    {
      title: '模式',
      dataIndex: 'runMode',
      key: 'runMode',
      render: (v: string) => (v === 'full' ? '全量' : '增量'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={statusColor[v] ?? 'default'}>{v}</Tag>
      ),
    },
    { title: '读行数', dataIndex: 'rowsRead', key: 'rowsRead' },
    { title: '写行数', dataIndex: 'rowsWritten', key: 'rowsWritten' },
    {
      title: 'watermark 至',
      dataIndex: 'watermarkTo',
      key: 'watermarkTo',
      render: (v: string | null) => (v ? v.replace('T', ' ').slice(0, 19) : '-'),
    },
    {
      title: '开始',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (v: string) => v.replace('T', ' ').slice(0, 19),
    },
  ];

  const lineageColumns: ColumnsType<LineageView> = [
    {
      title: '作业',
      dataIndex: 'jobCode',
      key: 'jobCode',
      render: (v: string) => jobLabels[v] ?? v,
    },
    { title: '源表', dataIndex: 'sourceTable', key: 'sourceTable' },
    { title: '目标表', dataIndex: 'targetTable', key: 'targetTable' },
    { title: '转换说明', dataIndex: 'transformation', key: 'transformation' },
  ];

  const totalVisits = metrics.reduce((s, m) => s + m.totalVisits, 0);
  const totalRevenue = metrics.reduce((s, m) => s + m.totalRevenue, 0);

  const singleJobButtons: JobCode[] = [
    'dwd_visit', 'dwd_fee', 'dws_dept_daily', 'ads_hospital_daily',
  ];

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <DatabaseOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              数据湖仓 · 分层加工（ODS-DWD-DWS-ADS）
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              watermark 增量 · 事务内加工 · 血缘可追溯
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="dw-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="dw-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，数据湖仓工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充加工结果。"
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
              <div data-testid="dw-content">
                <Space className="mb-4" wrap>
                  <Button
                    type="primary"
                    icon={<CloudServerOutlined />}
                    loading={running}
                    onClick={() => void runPipeline('incremental')}
                  >
                    增量加工
                  </Button>
                  <Button
                    danger
                    icon={<ReloadOutlined />}
                    loading={running}
                    onClick={() => void runPipeline('full')}
                  >
                    全量重算
                  </Button>
                  <span className="text-xs text-gray-500">
                    单作业重跑：
                  </span>
                  {singleJobButtons.map((code) => (
                    <Button
                      key={code}
                      size="small"
                      loading={running}
                      onClick={() => void runJob(code)}
                    >
                      {jobLabels[code]}
                    </Button>
                  ))}
                </Space>

                {error && (
                  <Alert
                    className="mb-4"
                    type="error"
                    showIcon
                    message={error}
                    closable
                    onClose={clearError}
                  />
                )}

                {lastRun && (
                  <Alert
                    className="mb-4"
                    type="success"
                    showIcon
                    data-testid="dw-last-run"
                    message={`加工完成（${lastRun.mode === 'full' ? '全量' : '增量'}）`}
                    description={lastRun.jobs.map((j) => (
                      <Tag key={j.jobCode} color="green">
                        {jobLabels[j.jobCode] ?? j.jobCode}: 读 {j.rowsRead} / 写 {j.rowsWritten}
                      </Tag>
                    ))}
                  />
                )}

                <Space className="mb-4" size="large">
                  <Statistic title="指标覆盖就诊总量" value={totalVisits} />
                  <Statistic
                    title="指标覆盖总收入(元)"
                    value={totalRevenue}
                    precision={2}
                  />
                </Space>

                <Tabs
                  items={[
                    {
                      key: 'metrics',
                      label: '院级日指标',
                      children: (
                        <Table
                          rowKey="statDate"
                          size="small"
                          columns={metricColumns}
                          dataSource={metrics}
                          loading={loading}
                          pagination={{ pageSize: 10 }}
                        />
                      ),
                    },
                    {
                      key: 'dept',
                      label: '科室日汇总',
                      children: (
                        <Table
                          rowKey={(r) => `${r.statDate}-${r.department}-${r.visitType}`}
                          size="small"
                          columns={deptColumns}
                          dataSource={deptSummary}
                          loading={loading}
                          pagination={{ pageSize: 10 }}
                        />
                      ),
                    },
                    {
                      key: 'runs',
                      label: '作业运行历史',
                      children: (
                        <Table
                          rowKey="runId"
                          size="small"
                          columns={runColumns}
                          dataSource={runs}
                          loading={loading}
                          pagination={{ pageSize: 10 }}
                        />
                      ),
                    },
                    {
                      key: 'lineage',
                      label: '数据血缘',
                      children: (
                        <Table
                          rowKey="id"
                          size="small"
                          columns={lineageColumns}
                          dataSource={lineage}
                          loading={loading}
                          pagination={false}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
