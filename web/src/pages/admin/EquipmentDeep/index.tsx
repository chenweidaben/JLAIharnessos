/**
 * 健澜科技 jlmedaios - M177-C 医院设备管理深化页（admin）【病案设备耗材】
 *
 * 业务目标：设备管理要真实，不能台账和实物对不上。
 *  - 设备台账：采购→验收→入账→使用→报废 五段全留痕，资产编号与实物对码；
 *  - 维保管理：保养计划到期/逾期预警 + 未结故障（带病运行）跟踪；
 *  - 计量管理：强检设备证书到期预警，漏检即停用；
 *  - 折旧管理：折旧方法/年限/累计折旧/账面净值一口算清。
 *
 * 生产安全：
 *  - 拉取 GET /api/v1/equipment/deep；
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading / error（可重试）/ empty；不引入新依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Layout,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

type MaintenanceStatus = 'overdue' | 'due-soon' | 'on-track';

interface MaintenanceAlert {
  equipmentId: string;
  assetNo: string;
  name: string;
  planType: string;
  cycleMonths: number;
  lastDoneDate: string;
  nextDueDate: string;
  daysUntilDue: number;
  status: MaintenanceStatus;
  overdueDays: number;
  suggestedAction: string;
}

interface ExpiredCert {
  equipmentId: string;
  assetNo: string;
  name: string;
  validUntil: string;
  overdueDays: number;
}

interface DeviceRow {
  equipmentId: string;
  assetNo: string;
  name: string;
  dept: string;
  manufacturer: string;
  currentStage: string;
  currentStageLabel: string;
  scrapped: boolean;
  maintenance: { status: MaintenanceStatus; nextDueDate: string; daysUntilDue: number; openFaults: number };
  metrology: { mandatory: boolean; certificateNo: string | null; lastInspectionDate: string | null };
  depreciation: { method: string; originalValue: number; accumulated: number; netBookValue: number };
}

interface DeepEquipmentMgmt {
  generatedAt: string;
  ledger: { total: number; byStage: Record<string, number>; scrappedCount: number; totalOriginalValue: number };
  maintenance: {
    alerts: MaintenanceAlert[];
    overdueCount: number;
    dueSoonCount: number;
    openFaultCount: number;
    openFaultCost: number;
  };
  metrology: { mandatoryCount: number; expiredCertCount: number; expiredCerts: ExpiredCert[] };
  depreciation: { totalOriginalValue: number; totalAccumulated: number; totalNetBookValue: number };
  devices: DeviceRow[];
  notice: string;
}

/* ------------------------------ 深海蓝 VI ------------------------------ */
const PRIMARY = '#0B2A4A';
const ACCENT = '#1E5AA8';

const MAINT_COLOR: Record<MaintenanceStatus, string> = {
  overdue: 'red', 'due-soon': 'orange', 'on-track': 'green',
};
const STAGE_COLOR: Record<string, string> = {
  purchase: 'default', acceptance: 'cyan', capitalization: 'blue', in_use: 'geekblue', scrapped: 'default',
};

function yuan(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 万元`;
  return `${n.toLocaleString()} 元`;
}

export default function EquipmentDeepPage() {
  const [data, setData] = useState<DeepEquipmentMgmt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/equipment/deep');
      const json = await resp.json();
      if (json.code !== 0) throw new Error(json.message || '加载失败');
      setData(json.data as DeepEquipmentMgmt);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" tip="加载设备深度管理看板…" /></div>;
  }
  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message="设备深度管理看板加载失败" description={error} showIcon />
        <Button style={{ marginTop: 16 }} onClick={load}>重试</Button>
      </div>
    );
  }
  if (!data) {
    return <div style={{ padding: 24 }}>暂无设备管理数据。</div>;
  }

  /* ---- 设备台账表 ---- */
  const deviceColumns: ColumnsType<DeviceRow> = [
    { title: '资产编号', dataIndex: 'assetNo', key: 'assetNo', width: 130, render: (v: string) => <Text strong>{v}</Text> },
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    { title: '科室', dataIndex: 'dept', key: 'dept', width: 110 },
    { title: '厂商', dataIndex: 'manufacturer', key: 'manufacturer', width: 120 },
    {
      title: '台账阶段', dataIndex: 'currentStageLabel', key: 'stage', width: 90,
      render: (_: string, r) => <Tag color={STAGE_COLOR[r.currentStage] || 'default'}>{r.currentStageLabel}</Tag>,
    },
    {
      title: '维保', dataIndex: ['maintenance', 'status'], key: 'maint', width: 110,
      render: (_: MaintenanceStatus, r) => (
        <Space>
          <Tag color={MAINT_COLOR[r.maintenance.status]}>
            {r.maintenance.status === 'overdue' ? '已逾期' : r.maintenance.status === 'due-soon' ? '临期' : '正常'}
          </Tag>
          {r.maintenance.openFaults > 0 && <Badge count={r.maintenance.openFaults} title="未结故障" style={{ backgroundColor: '#cf1322' }} />}
        </Space>
      ),
    },
    {
      title: '计量', dataIndex: ['metrology', 'mandatory'], key: 'metro', width: 130,
      render: (m: boolean, r) => (m
        ? <Tag color="blue" title={r.metrology.certificateNo ?? ''}>强检 {r.metrology.certificateNo || '无证书'}</Tag>
        : <Text type="secondary">非强检</Text>),
    },
    {
      title: '账面净值', dataIndex: ['depreciation', 'netBookValue'], key: 'nbv', width: 120,
      render: (v: number, r) => (
        <Text type={r.scrapped ? 'secondary' : undefined}>{yuan(v)}</Text>
      ),
    },
  ];

  /* ---- 维保预警表 ---- */
  const alertColumns: ColumnsType<MaintenanceAlert> = [
    { title: '资产编号', dataIndex: 'assetNo', key: 'assetNo', width: 130 },
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    { title: '保养类型', dataIndex: 'planType', key: 'planType', width: 100 },
    { title: '上次保养', dataIndex: 'lastDoneDate', key: 'lastDoneDate', width: 110 },
    { title: '下次到期', dataIndex: 'nextDueDate', key: 'nextDueDate', width: 110 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (s: MaintenanceStatus, r) => (
        <Tag color={MAINT_COLOR[s]}>{s === 'overdue' ? `逾期${r.overdueDays}天` : s === 'due-soon' ? `${r.daysUntilDue}天后` : '正常'}</Tag>
      ),
    },
    { title: '处置建议', dataIndex: 'suggestedAction', key: 'suggestedAction' },
  ];

  /* ---- 强检证书到期表 ---- */
  const certColumns: ColumnsType<ExpiredCert> = [
    { title: '资产编号', dataIndex: 'assetNo', key: 'assetNo', width: 130 },
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    { title: '证书有效期至', dataIndex: 'validUntil', key: 'validUntil', width: 130 },
    {
      title: '逾期', dataIndex: 'overdueDays', key: 'overdueDays', width: 100,
      render: (v: number) => <Text type="danger" strong>{v} 天</Text>,
    },
  ];

  const stageKeys = Object.keys(data.ledger.byStage);

  return (
    <Layout style={{ background: '#f0f4f8' }}>
      <Content style={{ padding: 24 }}>
        {/* 标题栏 */}
        <div style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
          padding: '20px 24px', borderRadius: 8, marginBottom: 16 }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>医疗设备管理深化 · 账实一致闭环</Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0' }}>
            台账五段留痕（采购→验收→入账→使用→报废）+ 维保预警与未结故障 + 强检证书到期 + 折旧净值，资产编号与实物一一对应。
          </Paragraph>
        </div>

        {/* 四张资产/折旧总览卡 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}><Card><Statistic title="设备总数（在册）" value={data.ledger.total} suffix="台" valueStyle={{ color: PRIMARY }} /></Card></Col>
          <Col span={6}><Card><Statistic title="资产原值合计" value={data.depreciation.totalOriginalValue} formatter={(v) => yuan(Number(v))} valueStyle={{ color: PRIMARY }} /></Card></Col>
          <Col span={6}><Card><Statistic title="累计折旧" value={data.depreciation.totalAccumulated} formatter={(v) => yuan(Number(v))} valueStyle={{ color: '#cf1322' }} /></Card></Col>
          <Col span={6}><Card><Statistic title="账面净值" value={data.depreciation.totalNetBookValue} formatter={(v) => yuan(Number(v))} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        </Row>

        {/* ① 设备台账 */}
        <Card
          title={<span style={{ color: PRIMARY }}>① 设备台账 · 五段生命周期</span>}
          style={{ marginBottom: 16 }}
          extra={
            <Space wrap>
              {stageKeys.map((k) => (
                <Tag key={k} color={STAGE_COLOR[k] || 'default'}>
                  {{ purchase: '采购', acceptance: '验收', capitalization: '入账', in_use: '使用', scrapped: '报废' }[k] ?? k}：{data.ledger.byStage[k]}
                </Tag>
              ))}
            </Space>
          }
        >
          <Table rowKey="equipmentId" size="small" columns={deviceColumns} dataSource={data.devices} pagination={false} />
        </Card>

        {/* ② 维保管理 */}
        <Card
          title={<span style={{ color: PRIMARY }}>② 维保管理 · 保养计划与故障跟踪</span>}
          style={{ marginBottom: 16 }}
          extra={
            <Space>
              <Tag color={data.maintenance.overdueCount > 0 ? 'red' : 'green'}>逾期 {data.maintenance.overdueCount}</Tag>
              <Tag color={data.maintenance.dueSoonCount > 0 ? 'orange' : 'green'}>临期 {data.maintenance.dueSoonCount}</Tag>
              <Tag color={data.maintenance.openFaultCount > 0 ? 'red' : 'green'}>未结故障 {data.maintenance.openFaultCount} 条</Tag>
            </Space>
          }
        >
          {data.maintenance.alerts.length === 0
            ? <Alert type="success" showIcon message="所有设备保养计划均在计划内，无逾期/临期项。" />
            : <Table rowKey="equipmentId" size="small" columns={alertColumns} dataSource={data.maintenance.alerts} pagination={false} />}
          {data.maintenance.openFaultCount > 0 && (
            <Alert style={{ marginTop: 12 }} type="warning" showIcon
              message={`尚有 ${data.maintenance.openFaultCount} 条未结故障，预估待修费用 ${yuan(data.maintenance.openFaultCost)}，须跟踪闭环后方可销账。`} />
          )}
        </Card>

        {/* ③ 计量管理 */}
        <Card
          title={<span style={{ color: PRIMARY }}>③ 计量管理 · 强制检定证书</span>}
          style={{ marginBottom: 16 }}
          extra={<Tag color="blue">强检设备 {data.metrology.mandatoryCount} 台</Tag>}
        >
          {data.metrology.expiredCerts.length === 0
            ? <Alert type="success" showIcon message="全部强检设备证书在有效期内。" />
            : <Table rowKey="equipmentId" size="small" columns={certColumns} dataSource={data.metrology.expiredCerts} pagination={false} />}
        </Card>

        {/* ④ 折旧管理 */}
        <Card title={<span style={{ color: PRIMARY }}>④ 折旧管理 · 方法 / 年限 / 净值</span>}>
          <Table
            rowKey="equipmentId" size="small" pagination={false}
            columns={[
              { title: '资产编号', dataIndex: 'assetNo', key: 'assetNo', width: 130 },
              { title: '设备名称', dataIndex: 'name', key: 'name' },
              { title: '折旧方法', dataIndex: ['depreciation', 'method'], key: 'method', width: 130, render: (m: string) => <Tag color={ACCENT}>{m}</Tag> },
              { title: '原值', dataIndex: ['depreciation', 'originalValue'], key: 'orig', width: 120, render: (v: number) => yuan(v) },
              { title: '累计折旧', dataIndex: ['depreciation', 'accumulated'], key: 'acc', width: 120, render: (v: number) => yuan(v) },
              { title: '账面净值', dataIndex: ['depreciation', 'netBookValue'], key: 'nbv', width: 120, render: (v: number) => <Text strong>{yuan(v)}</Text> },
            ]}
            dataSource={data.devices}
          />
          <Alert style={{ marginTop: 12 }} type="info" showIcon message={data.notice} />
        </Card>
      </Content>
    </Layout>
  );
}
