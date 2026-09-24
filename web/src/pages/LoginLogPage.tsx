/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 登录日志：列表 / 筛选 / 异常登录识别 / 统计 / 强制下线
 */
import { useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Col,
  DatePicker,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, LogoutOutlined, SearchOutlined } from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import BaseChart from '@/components/charts/BaseChart';
// TODO(P2): 接入真实 API（GET /system/login-logs）后移除本地 mock
import { loginLogs } from '@/mock/authMock';
import type { LoginLog, LoginMethod, LoginResult } from '@/types/auth';

const { RangePicker } = DatePicker;

const METHOD_MAP: Record<LoginMethod, { label: string; color: string }> = {
  password: { label: '账号密码', color: 'blue' },
  sso: { label: 'SSO', color: 'geekblue' },
  qrcode: { label: '二维码', color: 'purple' },
};

export default function LoginLogPage() {
  const { message } = AntdApp.useApp();
  const [user, setUser] = useState('');
  const [method, setMethod] = useState<LoginMethod>();
  const [result, setResult] = useState<LoginResult>();
  const [rows, setRows] = useState<LoginLog[]>(loginLogs);

  const filtered = useMemo(
    () =>
      rows.filter((l) => {
        if (user && !l.realName.includes(user) && !l.username.includes(user)) return false;
        if (method && l.method !== method) return false;
        if (result && l.result !== result) return false;
        return true;
      }),
    [rows, user, method, result],
  );

  const stats = useMemo(() => {
    const fail = rows.filter((l) => l.result === 'failure').length;
    return {
      today: rows.filter((l) => l.loginAt.startsWith(new Date().toISOString().slice(0, 10))).length,
      online: rows.filter((l) => l.result === 'success' && !l.logoutAt).length,
      failRate: rows.length ? ((fail / rows.length) * 100).toFixed(1) : '0',
      abnormal: rows.filter((l) => l.isAbnormal).length,
    };
  }, [rows]);

  const lineOption = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(5, 10);
    });
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['成功', '失败'] },
      xAxis: { type: 'category' as const, data: days },
      yAxis: { type: 'value' as const },
      series: [
        {
          name: '成功',
          type: 'line' as const,
          stack: 'a',
          data: days.map((_, i) => 30 + ((i * 7) % 20)),
        },
        {
          name: '失败',
          type: 'line' as const,
          stack: 'a',
          data: days.map((_, i) => 2 + ((i * 3) % 5)),
        },
      ],
    };
  }, []);

  const forceLogout = (id: string) => {
    setRows((rs) =>
      rs.map((r) =>
        r.id === id
          ? { ...r, logoutAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }
          : r,
      ),
    );
    message.success('已强制该会话下线');
  };

  const columns: ColumnsType<LoginLog> = [
    { title: '登录时间', dataIndex: 'loginAt', width: 170 },
    {
      title: '用户',
      render: (_, l) => (
        <div>
          <div>{l.realName}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{l.username}</div>
        </div>
      ),
    },
    {
      title: '方式',
      dataIndex: 'method',
      width: 100,
      render: (m: LoginMethod) => <Tag color={METHOD_MAP[m].color}>{METHOD_MAP[m].label}</Tag>,
    },
    {
      title: 'IP / 地点',
      render: (_, l) => (
        <div>
          <div>{l.ip}</div>
          <div style={{ fontSize: 12, color: l.isAbnormal ? '#f5222d' : '#8c8c8c' }}>
            {l.location}
          </div>
        </div>
      ),
    },
    { title: '设备', render: (_, l) => `${l.browser} / ${l.os}`, width: 150, ellipsis: true },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      render: (r: LoginResult, l) =>
        r === 'success' ? (
          <Tag color="success">成功</Tag>
        ) : (
          <Tag color="error">{l.failReason ?? '失败'}</Tag>
        ),
    },
    {
      title: '异常',
      dataIndex: 'abnormalTypes',
      width: 160,
      render: (types: string[]) =>
        types.length ? (
          <Space size={2} wrap>
            {types.map((t) => (
              <Tag key={t} color="red">
                {t}
              </Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: '#d9d9d9' }}>—</span>
        ),
    },
    { title: '登出时间', dataIndex: 'logoutAt', width: 170, render: (v: string) => v ?? '在线' },
    {
      title: '操作',
      width: 110,
      render: (_, l) =>
        l.result === 'success' && !l.logoutAt ? (
          <Popconfirm title="确认强制下线该会话？" onConfirm={() => forceLogout(l.id)}>
            <Button type="link" size="small" danger icon={<LogoutOutlined />}>
              强制下线
            </Button>
          </Popconfirm>
        ) : (
          <span style={{ color: '#d9d9d9' }}>—</span>
        ),
    },
  ];

  return (
    <PageContainer
      title="登录日志"
      description="记录全部登录尝试，自动识别异地登录、深夜登录、暴力破解等异常"
      extra={
        <Button icon={<DownloadOutlined />} onClick={() => message.success('登录日志已导出')}>
          导出
        </Button>
      }
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <div className="jl-card" style={{ padding: 16 }}>
            <Statistic title="今日登录" value={stats.today} />
          </div>
        </Col>
        <Col span={6}>
          <div className="jl-card" style={{ padding: 16 }}>
            <Statistic title="当前在线" value={stats.online} />
          </div>
        </Col>
        <Col span={6}>
          <div className="jl-card" style={{ padding: 16 }}>
            <Statistic
              title="登录失败率"
              value={stats.failRate}
              suffix="%"
              valueStyle={{ color: '#fa8c16' }}
            />
          </div>
        </Col>
        <Col span={6}>
          <div className="jl-card" style={{ padding: 16 }}>
            <Statistic title="异常登录" value={stats.abnormal} valueStyle={{ color: '#f5222d' }} />
          </div>
        </Col>
      </Row>

      <div className="jl-card" style={{ padding: 16, marginBottom: 16 }}>
        <BaseChart option={lineOption} height={220} />
      </div>

      <div className="jl-card" style={{ padding: 16, marginBottom: 16 }}>
        <Space wrap>
          <RangePicker />
          <Input
            prefix={<SearchOutlined />}
            placeholder="姓名/用户名"
            style={{ width: 180 }}
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <Select
            allowClear
            placeholder="登录方式"
            style={{ width: 130 }}
            value={method}
            onChange={setMethod}
            options={Object.entries(METHOD_MAP).map(([v, x]) => ({ value: v, label: x.label }))}
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

      <Table<LoginLog>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 12, showTotal: (t) => `共 ${t} 条` }}
      />
    </PageContainer>
  );
}
