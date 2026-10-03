/* ============================================================================
 * 健澜科技杠OS - 数据治理页面（M5-E，真实 BFF）
 *
 * 数据质量：五维检测（完整性/唯一性/有效性/一致性/及时性）、评分与趋势、
 *           逐规则结果与失败样本、规则清单；
 * 隐私分级：字段级 L1-L4 台账、自动扫描、人工修正（留痕）。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断检测/修正。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { useEffect, useState } from 'react';
import {
  Alert, Button, Form, Input, Layout, Modal, Select, Space, Spin,
  Statistic, Table, Tabs, Tag, Typography, Watermark,
} from 'antd';
import {
  SafetyCertificateOutlined, ScanOutlined, AuditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDataGovernanceStore } from '@/store/dataGovernanceStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import type {
  ClassificationView,
  DqRuleView,
  QualityRunView,
  RuleResultView,
} from '@/types/dataGovernance';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '数据治理', 'jlmedaios'];

const dimensionLabel: Record<string, string> = {
  completeness: '完整性',
  uniqueness: '唯一性',
  validity: '有效性',
  consistency: '一致性',
  timeliness: '及时性',
};

const severityColor: Record<string, string> = {
  critical: 'red',
  major: 'volcano',
  minor: 'gold',
};

const levelColor: Record<number, string> = {
  4: 'red',
  3: 'orange',
  2: 'blue',
  1: 'green',
};

function scoreColor(score: number): string {
  if (score >= 95) return '#3f8600';
  if (score >= 85) return '#d48806';
  return '#cf1322';
}

export default function DataGovernancePage() {
  const {
    dbUp, healthChecking, loading, running, error,
    latestRun, trend, detailRun, detailResults, rules, classification,
    checkHealth, loadOverview, loadResults, loadRules, loadClassification,
    runQualityCheck, scanClassification, overrideClassification, clearError,
  } = useDataGovernanceStore();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState('score');
  const [overrideTarget, setOverrideTarget] = useState<ClassificationView | null>(
    null,
  );
  const [form] = Form.useForm();

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) {
        await Promise.all([loadOverview(), loadClassification()]);
      }
      setReady(true);
    })();
  }, [checkHealth, loadOverview, loadClassification]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) {
      await Promise.all([loadOverview(), loadClassification()]);
    }
  };

  const openResults = async (runId: string) => {
    const ok = await loadResults(runId);
    if (ok) setActiveTab('results');
  };

  /** 切换 Tab 时按需懒加载（规则/结果首次为空时自动拉取）。 */
  const onTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'rules' && rules.length === 0) void loadRules();
    if (key === 'results' && detailResults.length === 0) void loadResults();
  };

  const openOverride = (record: ClassificationView) => {
    setOverrideTarget(record);
    form.setFieldsValue({
      level: record.level,
      reason: record.reason ?? '',
    });
  };

  const submitOverride = async () => {
    const values = await form.validateFields();
    if (!overrideTarget) return;
    const ok = await overrideClassification({
      schemaName: overrideTarget.schemaName,
      tableName: overrideTarget.tableName,
      columnName: overrideTarget.columnName,
      level: values.level,
      reason: values.reason,
    });
    if (ok) setOverrideTarget(null);
  };

  /* ------------------------------ 结果列 ------------------------------ */
  const resultColumns: ColumnsType<RuleResultView> = [
    { title: '规则码', dataIndex: 'ruleCode', key: 'ruleCode', width: 200 },
    {
      title: '维度',
      dataIndex: 'dimension',
      key: 'dimension',
      render: (v: string) => <Tag>{dimensionLabel[v] ?? v}</Tag>,
    },
    {
      title: '严重级',
      dataIndex: 'severity',
      key: 'severity',
      render: (v: string) => (
        <Tag color={severityColor[v] ?? 'default'}>{v}</Tag>
      ),
    },
    { title: '目标', dataIndex: 'target', key: 'target' },
    { title: '总行', dataIndex: 'totalRows', key: 'totalRows' },
    { title: '失败行', dataIndex: 'failedRows', key: 'failedRows' },
    {
      title: '通过率',
      dataIndex: 'passRate',
      key: 'passRate',
      render: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={v === 'pass' ? 'green' : 'red'}>
          {v === 'pass' ? '通过' : '失败'}
        </Tag>
      ),
    },
  ];

  /* ------------------------------ 规则列 ------------------------------ */
  const ruleColumns: ColumnsType<DqRuleView> = [
    { title: '规则码', dataIndex: 'ruleCode', key: 'ruleCode', width: 200 },
    { title: '规则名称', dataIndex: 'ruleName', key: 'ruleName' },
    {
      title: '维度',
      dataIndex: 'dimension',
      key: 'dimension',
      render: (v: string) => <Tag>{dimensionLabel[v] ?? v}</Tag>,
    },
    { title: '检测类型', dataIndex: 'checkType', key: 'checkType' },
    {
      title: '目标',
      key: 'target',
      render: (_, r) =>
        `${r.targetSchema}.${r.targetTable}${r.targetColumn ? '.' + r.targetColumn : ''}`,
    },
    {
      title: '严重级',
      dataIndex: 'severity',
      key: 'severity',
      render: (v: string) => (
        <Tag color={severityColor[v] ?? 'default'}>{v}</Tag>
      ),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>
      ),
    },
  ];

  /* ------------------------------ 趋势列 ------------------------------ */
  const trendColumns: ColumnsType<QualityRunView> = [
    {
      title: '检测时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (v: string) => v.replace('T', ' ').slice(0, 19),
    },
    { title: '规则总数', dataIndex: 'totalRules', key: 'totalRules' },
    { title: '通过', dataIndex: 'passedRules', key: 'passedRules' },
    { title: '失败', dataIndex: 'failedRules', key: 'failedRules' },
    {
      title: '质量评分',
      dataIndex: 'score',
      key: 'score',
      render: (v: number) => (
        <span style={{ color: scoreColor(v), fontWeight: 600 }}>
          {v.toFixed(2)}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, r) => (
        <Button size="small" onClick={() => void openResults(r.runId)}>
          查看结果
        </Button>
      ),
    },
  ];

  /* ------------------------------ 分级列 ------------------------------ */
  const classificationColumns: ColumnsType<ClassificationView> = [
    { title: 'Schema', dataIndex: 'schemaName', key: 'schemaName' },
    { title: '表', dataIndex: 'tableName', key: 'tableName' },
    { title: '列', dataIndex: 'columnName', key: 'columnName' },
    {
      title: '分级',
      dataIndex: 'level',
      key: 'level',
      render: (v: number) => (
        <Tag color={levelColor[v] ?? 'default'}>L{v}</Tag>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (v: string) => (
        <Tag color={v === 'manual' ? 'purple' : 'default'}>
          {v === 'manual' ? '人工' : '自动'}
        </Tag>
      ),
    },
    { title: '分级依据', dataIndex: 'reason', key: 'reason' },
    { title: '修正人', dataIndex: 'overriddenByName', key: 'overriddenByName' },
    {
      title: '操作',
      key: 'action',
      render: (_, r) => (
        <Button size="small" onClick={() => openOverride(r)}>
          修正分级
        </Button>
      ),
    },
  ];

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SafetyCertificateOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              数据治理 · 质量监控与隐私分级
            </Typography.Title>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="gov-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="gov-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，数据治理工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充检测结果。"
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
              <div data-testid="gov-content">
                <Space className="mb-4" wrap>
                  <Button
                    type="primary"
                    icon={<AuditOutlined />}
                    loading={running}
                    onClick={() => void runQualityCheck()}
                  >
                    执行质量检测
                  </Button>
                  <Button
                    icon={<ScanOutlined />}
                    loading={running}
                    onClick={() => void scanClassification()}
                  >
                    扫描隐私分级
                  </Button>
                  <Button
                    onClick={() => {
                      void loadRules();
                      setActiveTab('rules');
                    }}
                  >
                    加载规则
                  </Button>
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

                <Space className="mb-4" size="large">
                  <Statistic
                    title="最新质量评分"
                    value={latestRun?.score ?? 0}
                    precision={2}
                    valueStyle={{
                      color: scoreColor(latestRun?.score ?? 0),
                    }}
                  />
                  <Statistic
                    title="通过规则"
                    value={latestRun?.passedRules ?? 0}
                    valueStyle={{ color: '#3f8600' }}
                  />
                  <Statistic
                    title="失败规则"
                    value={latestRun?.failedRules ?? 0}
                    valueStyle={{ color: '#cf1322' }}
                  />
                  <Statistic
                    title="已分级字段"
                    value={classification.length}
                  />
                </Space>

                <Tabs
                  activeKey={activeTab}
                  onChange={onTabChange}
                  items={[
                    {
                      key: 'score',
                      label: '质量评分与趋势',
                      children: (
                        <Table
                          rowKey="runId"
                          size="small"
                          columns={trendColumns}
                          dataSource={trend}
                          loading={loading}
                          pagination={{ pageSize: 10 }}
                        />
                      ),
                    },
                    {
                      key: 'results',
                      label: '检测结果',
                      children: (
                        <>
                          {detailRun && (
                            <Alert
                              className="mb-3"
                              type="info"
                              showIcon
                              message={`检测运行 ${detailRun.runId}（${detailRun.startedAt.replace('T', ' ').slice(0, 19)}）：评分 ${detailRun.score.toFixed(2)}`}
                            />
                          )}
                          <Table
                            rowKey="ruleCode"
                            size="small"
                            columns={resultColumns}
                            dataSource={detailResults}
                            loading={loading}
                            pagination={{ pageSize: 15 }}
                            expandable={{
                              rowExpandable: (r) =>
                                r.failedSample.length > 0,
                              expandedRowRender: (r) => (
                                <pre
                                  data-testid="failed-sample"
                                  style={{ margin: 0, fontSize: 12 }}
                                >
                                  {JSON.stringify(r.failedSample, null, 2)}
                                </pre>
                              ),
                            }}
                          />
                        </>
                      ),
                    },
                    {
                      key: 'rules',
                      label: '质量规则',
                      children: (
                        <Table
                          rowKey="ruleCode"
                          size="small"
                          columns={ruleColumns}
                          dataSource={rules}
                          loading={loading}
                          pagination={{ pageSize: 15 }}
                        />
                      ),
                    },
                    {
                      key: 'classification',
                      label: '隐私分级台账',
                      children: (
                        <Table
                          rowKey={(r) =>
                            `${r.schemaName}-${r.tableName}-${r.columnName}`
                          }
                          size="small"
                          columns={classificationColumns}
                          dataSource={classification}
                          loading={loading}
                          pagination={{ pageSize: 15 }}
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

      <Modal
        title="人工修正字段分级"
        open={overrideTarget !== null}
        onOk={() => void submitOverride()}
        confirmLoading={running}
        onCancel={() => setOverrideTarget(null)}
        okText="保存（留痕）"
        cancelText="取消"
      >
        {overrideTarget && (
          <>
            <Typography.Paragraph type="secondary">
              {overrideTarget.schemaName}.{overrideTarget.tableName}.
              {overrideTarget.columnName}
            </Typography.Paragraph>
            <Form form={form} layout="vertical">
              <Form.Item
                name="level"
                label="分级"
                rules={[{ required: true, message: '请选择分级' }]}
              >
                <Select
                  options={[
                    { value: 1, label: 'L1 公开' },
                    { value: 2, label: 'L2 内部' },
                    { value: 3, label: 'L3 敏感' },
                    { value: 4, label: 'L4 机密' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="reason" label="修正依据">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </Watermark>
  );
}
