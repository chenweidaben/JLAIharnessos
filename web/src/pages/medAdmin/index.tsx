/**
 * 健澜科技 jlmedaios - 给药三查七对工作站（M17-B，PDA MAR 核对屏）
 *
 * 三个核心区：
 *  - 给药核对屏：录入就诊/医嘱/腕带 patientId/药名/剂量，高危药双人核对人，本人签名执行；
 *    CDS 拦截或五对未过时强制填 override 理由；
 *  - 给药记录：列表展示五对结果/状态/差错分类；
 *  - 差错指标：NQI_MED_ERROR 给药差错率（given 例次分母，差错类分子）。
 *
 * 医疗安全：本人签名必填；高危药双人核对 ≠ 执行人；AI 不开新医嘱。
 * 写按钮按 med_admin:execute 入口隐藏。健康门禁：db 不可用显式红 Alert+水印，不渲染业务数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Watermark,
  Layout,
  Space,
  Checkbox,
  message,
} from 'antd';
import { AlertOutlined, SafetyCertificateOutlined, ScanOutlined } from '@ant-design/icons';

import { useMedAdminStore } from '@/store/medAdminStore';
import { usePermission } from '@/router/guards';
import { medStatusLabel, medStatusColor, medErrorLabel, previewHighRisk } from '@/utils/medAdmin';
import type { CheckItemView, MedAdministration } from '@/types/medAdmin';

const { Content } = Layout;
const watermarkText = ['健澜科技', '给药三查七对', 'jlmedaios'];

/** v5.0试点扩展（M197护士药师工作流）：模拟腕带扫码核对的 DEMO 患者 */
const SCAN_MOCK_PATIENT = {
  name: '陈桂兰',
  patientId: 'INP-20260918-037',
  visitId: 'VISIT-0037',
  bed: '08-12 床',
  age: 71,
};

/** v5.0试点扩展（M197护士药师工作流）：扫码核对成功后回填的 DEMO 医嘱（三查七对闭环） */
const SCAN_MOCK_ORDER = {
  patientName: '张三',
  bed: '12-3',
  content: '头孢呋辛 1.5g ivgtt',
};

/** v5.0试点扩展（M197护士药师工作流）：今日待执行医嘱（DEMO mock，扫码成功后置为"已执行"） */
interface MockTodoOrder {
  key: string;
  content: string;
  execTime: string;
  status: '待执行' | '执行中' | '已执行';
}
const INITIAL_TODO_ORDERS: MockTodoOrder[] = [
  { key: '1', content: '头孢呋辛 1.5g ivgtt q12h', execTime: '08:00', status: '待执行' },
  { key: '2', content: '0.9% 氯化钠 100ml ivgtt qd', execTime: '09:00', status: '待执行' },
  { key: '3', content: '阿司匹林肠溶片 100mg po qd', execTime: '07:30', status: '已执行' },
  { key: '4', content: '二甲双胍片 0.5g po tid', execTime: '12:00', status: '待执行' },
  { key: '5', content: '雾化吸入 氨溴索 30mg bid', execTime: '10:00', status: '执行中' },
];

function run(p: Promise<unknown>): void {
  void p.catch(() => undefined);
}

/* ------------------------------------------------------------------ */
/* PDA 给药核对屏                                                      */
/* ------------------------------------------------------------------ */
function ExecuteTab() {
  const { execute, loadRecords } = useMedAdminStore();
  const { hasPermission } = usePermission();
  const canExecute = hasPermission('med_admin:execute');

  const [visitId, setVisitId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [wristband, setWristband] = useState('');
  const [medName, setMedName] = useState('');
  const [dose, setDose] = useState('');
  const [doubleCheckBy, setDoubleCheckBy] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [signature, setSignature] = useState('');
  const [withinTimeWindow, setWithinTimeWindow] = useState(true);
  const [notExpired, setNotExpired] = useState(true);
  const [lastChecks, setLastChecks] = useState<CheckItemView[] | null>(null);
  // v5.0试点扩展（M197护士药师工作流）：模拟腕带扫码核对弹窗 + 80/20 概率结果
  const [scanOpen, setScanOpen] = useState(false);
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'success' | 'mismatch'>('idle');
  // v5.0试点扩展（M197护士药师工作流）：今日待执行医嘱（扫码成功后首条置为"已执行"）
  const [todoOrders, setTodoOrders] = useState<MockTodoOrder[]>(INITIAL_TODO_ORDERS);

  const highRisk = previewHighRisk(medName);

  /** v5.0试点扩展（M197护士药师工作流）：点击"扫码核对"→ 80% 成功 / 20% 患者不匹配 */
  const onMockScan = () => {
    setScanPhase('scanning');
    window.setTimeout(() => {
      const ok = Math.random() < 0.8;
      if (ok) {
        setScanPhase('success');
        // 成功：回填腕带/就诊/药名/剂量，并把今日待执行首条医嘱置为"已执行"
        setWristband(SCAN_MOCK_PATIENT.patientId);
        setVisitId(SCAN_MOCK_PATIENT.visitId);
        setMedName('头孢呋辛');
        setDose('1.5g ivgtt');
        setTodoOrders((prev) =>
          prev.map((o, i) => (i === 0 ? { ...o, status: '已执行' } : o)),
        );
      } else {
        setScanPhase('mismatch');
      }
    }, 600);
  };

  const onSubmit = () => {
    if (!visitId.trim() || !orderId.trim() || !medName.trim() || !dose.trim()) {
      message.warning('就诊/医嘱/药名/剂量必填');
      return;
    }
    if (!signature.trim()) {
      message.warning('须由护士本人签名');
      return;
    }
    run(
      execute({
        visitId: visitId.trim(),
        orderId: orderId.trim(),
        wristbandPatientId: wristband.trim(),
        medName: medName.trim(),
        dose: dose.trim(),
        withinTimeWindow,
        notExpired,
        doubleCheckBy: doubleCheckBy.trim() || null,
        overrideReason: overrideReason.trim() || null,
        signature: signature.trim(),
        idempotencyKey: `mar-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      })
        .then((r) => {
          setLastChecks(r.checks);
          message.success(`给药成功：${r.administration.medName}，${highRisk ? '高危药已双人核对' : '普通药'}`);
          return loadRecords();
        })
        .catch(() => undefined),
    );
  };

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Card title="PDA 给药核对屏（三查七对）" size="small">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Input placeholder="就诊 visitId" value={visitId} onChange={(e) => setVisitId(e.target.value)} />
            <Input placeholder="医嘱 orderId" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
            {/* v5.0试点扩展（M190三角色工作流）：腕带录入 + 模拟扫码核对 */}
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="腕带扫描 patientId" value={wristband} onChange={(e) => setWristband(e.target.value)} />
              <Button icon={<ScanOutlined />} onClick={() => setScanOpen(true)}>模拟扫码</Button>
            </Space.Compact>
            <Input placeholder="药名" value={medName} onChange={(e) => setMedName(e.target.value)} addonAfter={highRisk ? <Tag color="red">高危</Tag> : null} />
            <Input placeholder="剂量" value={dose} onChange={(e) => setDose(e.target.value)} />
            {highRisk && (
              <Input placeholder="双人核对人 doubleCheckBy(≠执行人)" value={doubleCheckBy} onChange={(e) => setDoubleCheckBy(e.target.value)} />
            )}
            <Checkbox checked={withinTimeWindow} onChange={(e) => setWithinTimeWindow(e.target.checked)}>在给药时间窗内</Checkbox>
            <Checkbox checked={notExpired} onChange={(e) => setNotExpired(e.target.checked)}>药品在效期内</Checkbox>
            <Input placeholder="CDS 拦截/五对未过时 override 理由" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            <Input placeholder="本人电子签名" value={signature} onChange={(e) => setSignature(e.target.value)} />
            {canExecute
              ? <Button type="primary" block icon={<SafetyCertificateOutlined />} onClick={onSubmit}>核对并给药</Button>
              : <Alert type="warning" showIcon message="无 med_admin:execute 权限，给药按钮已隐藏" />}
          </Space>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="本次五对结果" size="small">
          {lastChecks
            ? lastChecks.map((c) => (
                <Tag key={c.key} color={c.ok ? 'green' : 'red'} style={{ marginBottom: 8 }}>
                  {c.label}{c.ok ? '✓' : '✗'}
                </Tag>
              ))
            : <Typography.Text type="secondary">执行给药后此处展示五对绿勾/红叉</Typography.Text>}
        </Card>

        {/* v5.0试点扩展（M197护士药师工作流）：今日待执行医嘱（扫码成功后置"已执行"） */}
        <Card size="small" title="今日待执行医嘱（DEMO mock）" style={{ marginTop: 16 }}>
          <Table
            rowKey="key"
            size="small"
            pagination={false}
            dataSource={todoOrders}
            columns={[
              { title: '医嘱内容', dataIndex: 'content', key: 'content' },
              { title: '执行时间', dataIndex: 'execTime', key: 'execTime', width: 100 },
              {
                title: '状态', dataIndex: 'status', key: 'status', width: 90,
                render: (v: MockTodoOrder['status']) => (
                  <Tag color={v === '已执行' ? 'green' : v === '执行中' ? 'blue' : 'orange'}>{v}</Tag>
                ),
              },
            ]}
          />
        </Card>
      </Col>

      {/* v5.0试点扩展（M197护士药师工作流）：模拟扫码 → 80% 成功 / 20% 患者不匹配（三查七对） */}
      <Modal
        open={scanOpen}
        title="扫码核对（三查七对）"
        onCancel={() => { setScanOpen(false); setScanPhase('idle'); }}
        onOk={() => {
          if (scanPhase === 'success') {
            setScanOpen(false);
            setScanPhase('idle');
            message.success('腕带与患者一致，已回填就诊/腕带/药名/剂量信息');
          } else if (scanPhase === 'mismatch') {
            setScanPhase('idle');
            message.warning('已重置，请重新扫码');
          }
        }}
        okText="确认"
        cancelText="取消"
        width={560}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert type="info" showIcon message="请用 PDA 扫描患者腕带与给药条码（DEMO mock 80% 命中）" />
          {scanPhase === 'idle' && (
            <Button type="primary" block onClick={onMockScan} icon={<ScanOutlined />}>
              模拟扫码核对
            </Button>
          )}
          {scanPhase === 'scanning' && (
            <Typography.Text type="secondary">扫码中，请稍候…</Typography.Text>
          )}
          {scanPhase === 'success' && (
            <Alert
              type="success"
              showIcon
              message={`扫码核对成功：患者${SCAN_MOCK_ORDER.patientName}，床号 ${SCAN_MOCK_ORDER.bed}，医嘱：${SCAN_MOCK_ORDER.content}`}
              description={
                <Space direction="vertical" size={2}>
                  <Typography.Text>患者：{SCAN_MOCK_PATIENT.name} ｜ {SCAN_MOCK_PATIENT.age} 岁 ｜ 住院号 {SCAN_MOCK_PATIENT.patientId}</Typography.Text>
                  <Space wrap>
                    {['床号一致 ✓', '姓名一致 ✓', '住院号一致 ✓', '药名一致 ✓', '剂量一致 ✓'].map((t) => (
                      <Tag key={t} color="green">{t}</Tag>
                    ))}
                  </Space>
                </Space>
              }
            />
          )}
          {scanPhase === 'mismatch' && (
            <Alert
              type="error"
              showIcon
              message="患者信息不匹配，请重新核对"
              description="腕带读取的患者/床号/医嘱与给药单不一致，已阻断执行流程。"
            />
          )}
        </Space>
      </Modal>
    </Row>
  );
}

/* ------------------------------------------------------------------ */
/* 给药记录                                                            */
/* ------------------------------------------------------------------ */
function RecordsTab() {
  const { records, loadingRecords, loadRecords } = useMedAdminStore();
  useEffect(() => { run(loadRecords()); }, [loadRecords]);

  const columns = [
    { title: '时间', dataIndex: 'occurredAt', key: 'occurredAt', render: (v: string) => new Date(v).toLocaleString() },
    { title: '药名', dataIndex: 'medName', key: 'medName' },
    { title: '剂量', dataIndex: 'dose', key: 'dose' },
    { title: '高危', dataIndex: 'highRisk', key: 'highRisk', render: (v: boolean) => (v ? <Tag color="red">高危</Tag> : <Tag>普通</Tag>) },
    { title: '五对', key: 'checks', render: (_: unknown, r: MedAdministration) => (
      <Space size={4} wrap>
        {(['checkPatient', 'checkMed', 'checkDose', 'checkTime', 'checkExpire'] as const).map((k) => (
          <Tag key={k} color={r[k] ? 'green' : 'red'}>{k.replace('check', '')}</Tag>
        ))}
      </Space>
    ) },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={medStatusColor(v)}>{medStatusLabel(v)}</Tag> },
    { title: '差错', dataIndex: 'errorType', key: 'errorType', render: (v: string | null) => <Tag color={v && v !== 'none' ? 'red' : 'default'}>{medErrorLabel(v)}</Tag> },
  ];
  return <Table rowKey="id" loading={loadingRecords} dataSource={records} columns={columns} size="small" pagination={{ pageSize: 8 }} />;
}

/* ------------------------------------------------------------------ */
/* 差错指标                                                            */
/* ------------------------------------------------------------------ */
function MetricsTab() {
  const { metrics, loadMetrics } = useMedAdminStore();
  useEffect(() => { run(loadMetrics()); }, [loadMetrics]);
  if (!metrics) return <Spin />;
  const { numerator, denominator } = metrics.metrics.fractions.medErrorRate;
  return (
    <Card title="NQI_MED_ERROR 给药差错率" size="small">
      <Typography.Paragraph>
        给药总例次(given)：<b>{denominator}</b>；差错例数：<b>{numerator}</b>；
        差错率：<Tag color="red">{metrics.metrics.medErrorRate}%</Tag>
      </Typography.Paragraph>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */
export default function MedAdminPage() {
  const { dbUp, loadingHealth, checkHealth, error } = useMedAdminStore();

  useEffect(() => { run(checkHealth()); }, [checkHealth]);

  if (loadingHealth) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;

  if (dbUp !== true) {
    return (
      <Watermark content={watermarkText}>
        <Alert type="error" showIcon icon={<AlertOutlined />}
          message="BFF / 数据库不可用"
          description="给药三查七对工作站已停止渲染业务数据，请检查后端与 PostgreSQL 连接后刷新。" />
      </Watermark>
    );
  }

  return (
    <Watermark content={watermarkText}>
      <Layout style={{ padding: 16, background: '#f0f2f5' }}>
        <Content>
          <Typography.Title level={4}>给药三查七对闭环（MAR）</Typography.Title>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
          <Tabs
            items={[
              { key: 'exec', label: '给药核对屏', children: <ExecuteTab /> },
              { key: 'records', label: '给药记录', children: <RecordsTab /> },
              { key: 'metrics', label: '差错指标', children: <MetricsTab /> },
            ]}
          />
        </Content>
      </Layout>
    </Watermark>
  );
}
