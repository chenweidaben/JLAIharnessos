/**
 * 健澜科技 jlmedaios - 护士交接班记录（交班本/接班本模板化）（214）
 *
 * 交班本列表 + 新建：录入患者/护理计划/生命体征后自动生成摘要预览，
 * 护士修订确认后登记；接班本按时间倒序查看本班次交接记录。
 *
 * 健康门禁：db!=='up' 显式红 Alert，不渲染业务数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Form, Input, InputNumber, Layout, Row, Select,
  Space, Table, Tag, Typography,
} from 'antd';
import { usePermission } from '@/router/guards';
import { previewSummary, useNurseHandoffStore } from '@/store/nurseHandoffStore';
import { SHIFT_OPTIONS, type HandoffShift } from '@/types/nurseHandoff';

const { Header, Content } = Layout;
const { Title } = Typography;

const LEVELS = ['特级护理', '一级护理', '二级护理', '三级护理'];

export default function NurseHandoffPage() {
  const { dbUp, records, loading, acting, error, checkHealth, load, submit } = useNurseHandoffStore();
  usePermission();
  const [wardId, setWardId] = useState<string>('');
  const [shift, setShift] = useState<HandoffShift>('day');
  const [patientName, setPatientName] = useState('');
  const [bedNo, setBedNo] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [nursingLevel, setNursingLevel] = useState(LEVELS[1]);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [temperature, setTemperature] = useState<number | null>(null);
  const [pulse, setPulse] = useState<number | null>(null);
  const [bpS, setBpS] = useState<number | null>(null);
  const [bpD, setBpD] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [summary, setSummary] = useState('');

  useEffect(() => { void checkHealth(); }, [checkHealth]);
  useEffect(() => { if (dbUp) void load(wardId || undefined); }, [dbUp, wardId, load]);

  // 自动生成摘要预览（随表单字段实时重算）
  const autoPreview = useMemo(
    () => previewSummary(
      { patientName, bedNo, diagnosis, nursingLevel, riskLevel, planItems: [] },
      {
        temperature: temperature ?? undefined,
        pulse: pulse ?? undefined,
        bpSystolic: bpS ?? undefined,
        bpDiastolic: bpD ?? undefined,
        oxygenSaturation: spo2 ?? undefined,
      },
    ),
    [patientName, bedNo, diagnosis, nursingLevel, riskLevel, temperature, pulse, bpS, bpD, spo2],
  );
  const shownSummary = summary || autoPreview;

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>交接班记录</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}>
          <Alert type="error" showIcon message="数据库连接异常" description={error || 'db 未连接'} />
        </Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  const onSubmit = async () => {
    await submit({
      wardId: wardId || undefined,
      shift,
      summary: shownSummary,
      plan: { patientName, bedNo, diagnosis, nursingLevel, riskLevel },
    });
    setSummary('');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>交接班记录（交班本 / 接班本）</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card title="新建交班">
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={4}>
                <Form.Item label="班次">
                  <Select value={shift} onChange={setShift} options={SHIFT_OPTIONS} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="病区ID（可选）">
                  <Input value={wardId} onChange={(e) => setWardId(e.target.value)} placeholder="wardId" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="患者姓名">
                  <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="床号">
                  <Input value={bedNo} onChange={(e) => setBedNo(e.target.value)} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="护理级别">
                  <Select value={nursingLevel} onChange={setNursingLevel}
                    options={LEVELS.map((l) => ({ value: l, label: l }))} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="风险等级">
                  <Select value={riskLevel} onChange={setRiskLevel}
                    options={[
                      { value: 'low', label: '低危' },
                      { value: 'medium', label: '中危' },
                      { value: 'high', label: '高危' },
                    ]} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="主要诊断">
                  <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="如：肺部感染、冠心病术后" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={4}><Form.Item label="体温℃"><InputNumber value={temperature ?? undefined}
                onChange={(v) => setTemperature(v)} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={4}><Form.Item label="脉搏"><InputNumber value={pulse ?? undefined}
                onChange={(v) => setPulse(v)} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={4}><Form.Item label="收缩压"><InputNumber value={bpS ?? undefined}
                onChange={(v) => setBpS(v)} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={4}><Form.Item label="舒张压"><InputNumber value={bpD ?? undefined}
                onChange={(v) => setBpD(v)} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={4}><Form.Item label="SpO₂%"><InputNumber value={spo2 ?? undefined}
                onChange={(v) => setSpo2(v)} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Form.Item label="交班摘要（自动生成，可修订）">
              <Input.TextArea rows={7} value={shownSummary} onChange={(e) => setSummary(e.target.value)} />
            </Form.Item>
            <Space>
              <Button type="primary" loading={acting} onClick={onSubmit}>登记交班</Button>
              <Button onClick={() => { setSummary(''); }}>重置摘要</Button>
            </Space>
          </Form>
        </Card>

        <Card title="交班本列表" style={{ marginTop: 16 }}>
          <Table rowKey="id" loading={loading} dataSource={records} pagination={{ pageSize: 10 }}
            columns={[
              {
                title: '时间', dataIndex: 'createdAt',
                render: (v: string) => new Date(v).toLocaleString(),
              },
              {
                title: '班次', dataIndex: 'shift',
                render: (s: HandoffShift) => {
                  const opt = SHIFT_OPTIONS.find((o) => o.value === s);
                  return <Tag color={s === 'night' ? 'geekblue' : 'default'}>{opt?.label ?? s}</Tag>;
                },
              },
              { title: '摘要', dataIndex: 'summary', render: (s: string) => (
                <div style={{ whiteSpace: 'pre-wrap', maxWidth: 560 }}>{s}</div>
              ) },
              { title: '登记人', dataIndex: 'createdBy', render: (v: string | null) => v ? v.slice(0, 8) : '—' },
            ]} />
        </Card>
      </Content>
    </Layout>
  );
}
