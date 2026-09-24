/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 操作审计日志：列表 / 筛选 / 详情 / 统计概览 / 导出（只读，不可删除）
 */
import { useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Col,
  DatePicker,
  Drawer,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import BaseChart from '@/components/charts/BaseChart';
// TODO(P2): 接入真实 API（GET /system/audit-logs）后移除本地 mock
import { auditLogs } from '@/mock/authMock';
import type { AuditAction, AuditLog, OperateResult } from '@/types/auth';

const { RangePicker } = DatePicker;

const ACTION_MAP: Record<AuditAction, { label: string; color: string }> = {
  login: { label: '登录', color: 'blue' },
  logout: { label: '登出', color: 'default' },
  create: { label: '新增', color: 'green' },
  update: { label: '修改', color: 'orange' },
  delete: { label: '删除', color: 'red' },
  query: { label: '查询', color: 'cyan' },
  export: { label: '导出', color: 'purple' },
  approve: { label: '审批', color: 'geekblue' },
  config: { label: '配置', color: 'magenta' },
  other: { label: '其他', color: 'default' },
};

const RISK_COLOR = { low: 'success', medium: 'warning', high: 'error' } as const;

export default function AuditLogPage() {
  const { message } = AntdApp.useApp();
  const [operator, setOperator] = useState('');
  const [action, setAction] = useState<AuditAction>();
  const [module, setModule] = useState<string>();
  const [result, setResult] = useState<OperateResult>();
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const modules = useMemo(() => [...new Set(auditLogs.map((l) => l.module))], []);

  const filtered = useMemo(
    () =>
      auditLogs.filter((l) => {
        if (operator && !l.operatorName.includes(operator) && !l.operatorNo.includes(operator))
          return false;
        if (action && l.action !== action) return false;
        if (module && l.module !== module) return false;
        if (result && l.result !== result) return false;
        return true;
      }),
    [operator, action, module, result],
  );

  const stats = useMemo(() => {
    const today = auditLogs.filter((l) =>
      l.createdAt.startsWith(new Date().toISOString().slice(0, 10)),
    );
    return {
      total: auditLogs.length,
      abnormal: auditLogs.filter((l) => l.result === 'failure').length,
      highRisk: auditLogs.filter((l) => l.riskLevel === 'high').length,
      today: today.length,
    };
  }, []);

  /* 操作类型分布饼图 */
  const pieOption = useMemo(() => {
    const map = new Map<AuditAction, number>();
    auditLogs.forEach((l) => map.set(l.action, (map.get(l.action) ?? 0) + 1));
    return {
      tooltip: { trigger: 'item' as const },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie' as const,
          radius: ['40%', '70%'],
          data: [...map.entries()].map(([k, v]) => ({ name: ACTION_MAP[k].label, value: v })),
        },
      ],
    };
  }, []);

  /* 近 7 天趋势 */
  const lineOption = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(5, 10);
    });
    const data = days.map((_, i) => 20 + ((i * 13) % 40));
    return {
      tooltip: { trigger: 'axis' as const },
      xAxis: { type: 'category' as const, data: days },
      yAxis: { type: 'value' as const },
      series: [{ type: 'line' as const, data, smooth: true, areaStyle: {} }],
    };
  }, []);

  const columns: ColumnsType<AuditLog> = [
    { title: '操作时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作人',
      render: (_, l) => (
        <div>
          <div>{l.operatorName}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            {l.operatorNo} · {l.operatorDept}
          </div>
        </div>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      width: 90,
      render: (a: AuditAction) => <Tag color={ACTION_MAP[a].color}>{ACTION_MAP[a].label}</Tag>,
    },
    { title: '模块', dataIndex: 'module', width: 110 },
    { title: '操作内容', dataIndex: 'content', ellipsis: true },
    { title: 'IP', dataIndex: 'ip', width: 130 },
    { title: '设备', dataIndex: 'device', width: 150, ellipsis: true },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      render: (r: OperateResult) => (
        <Tag color={r === 'success' ? 'success' : 'error'}>{r === 'success' ? '成功' : '失败'}</Tag>
      ),
    },
    {
      title: '风险',
      dataIndex: 'riskLevel',
      width: 80,
      render: (r: 'low' | 'medium' | 'high') => (
        <Tag color={RISK_COLOR[r]}>{r === 'high' ? '高' : r === 'medium' ? '中' : '低'}</Tag>
      ),
    },
    {
      title: '详情',
      width: 80,
      render: (_, l) => (
        <Button type="link" size="small" onClick={() => setDetail(l)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="操作审计"
      description="审计日志只读、不可删除或修改，满足医疗行业数据安全合规要求"
      extra={
        <Button
          icon={<DownloadOutlined />}
          onClick={() => message.success('审计日志已导出（CSV）')}
        >
          导出
        </Button>
      }
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <div className="jl-card" style={{ padding: 16 }}>
            <Statistic title="今日操作" value={stats.today} />
          </div>
        </Col>
        <Col span={6}>
          <div className="jl-card" style={{ padding: 16 }}>
            <Statistic title="异常操作" value={stats.abnormal} valueStyle={{ color: '#f5222d' }} />
          </div>
        </Col>
        <Col span={6}>
          <div className="jl-card" style={{ padding: 16 }}>
            <Statistic title="高危操作" value={stats.highRisk} valueStyle={{ color: '#fa8c16' }} />
          </div>
        </Col>
        <Col span={6}>
          <div className="jl-card" style={{ padding: 16 }}>
            <Statistic title="累计日志" value={stats.total} />
          </div>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <div className="jl-card" style={{ padding: 16 }}>
            <BaseChart option={pieOption} height={260} />
          </div>
        </Col>
        <Col span={12}>
          <div className="jl-card" style={{ padding: 16 }}>
            <BaseChart option={lineOption} height={260} />
          </div>
        </Col>
      </Row>

      <div className="jl-card" style={{ padding: 16, marginBottom: 16 }}>
        <Space wrap>
          <RangePicker />
          <Input
            prefix={<SearchOutlined />}
            placeholder="操作人姓名/工号"
            style={{ width: 180 }}
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
          />
          <Select
            allowClear
            placeholder="操作类型"
            style={{ width: 120 }}
            value={action}
            onChange={setAction}
            options={Object.entries(ACTION_MAP).map(([v, x]) => ({ value: v, label: x.label }))}
          />
          <Select
            allowClear
            placeholder="模块"
            style={{ width: 140 }}
            value={module}
            onChange={setModule}
            options={modules.map((m) => ({ value: m, label: m }))}
          />
          <Select
            allowClear
            placeholder="结果"
            style={{ width: 110 }}
            value={result}
            onChange={setResult}
            options={[
              { value: 'success', label: '成功' },
              { value: 'failure', label: '失败' },
            ]}
          />
        </Space>
      </div>

      <Table<AuditLog>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 12, showTotal: (t) => `共 ${t} 条` }}
      />

      <Drawer open={!!detail} title="日志详情" width={640} onClose={() => setDetail(null)}>
        {detail && (
          <div>
            <p>
              <b>操作内容：</b>
              {detail.content}
            </p>
            <p>
              <b>操作人：</b>
              {detail.operatorName}（{detail.operatorNo}）· {detail.operatorDept}
            </p>
            <p>
              <b>时间：</b>
              {detail.createdAt} · 耗时 {detail.duration}ms
            </p>
            <p>
              <b>IP / 设备：</b>
              {detail.ip} · {detail.device}
            </p>
            <p>
              <b>结果：</b>
              <Tag color={detail.result === 'success' ? 'success' : 'error'}>
                {detail.result === 'success' ? '成功' : '失败'}
              </Tag>
            </p>
            <div style={{ marginTop: 16 }}>
              <b>请求参数</b>
              <pre style={{ background: '#f5f7fa', padding: 12, borderRadius: 6, fontSize: 12 }}>
                {detail.requestParams}
              </pre>
            </div>
            <div>
              <b>响应数据</b>
              <pre style={{ background: '#f5f7fa', padding: 12, borderRadius: 6, fontSize: 12 }}>
                {detail.responseData}
              </pre>
            </div>
            {detail.detail && (
              <div>
                <b>异常说明：</b>
                <Tag color="error">{detail.detail}</Tag>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
}
