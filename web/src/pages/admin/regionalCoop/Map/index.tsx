/**
 * 健澜科技 jlmedaios - M143-D 区域医疗资源地图页（互联网医院与远程医疗）
 *
 * 落实「检验结果互认 / 影像资料共享 / 专家号源共享 / 双向转诊通道」四项协同：
 *   - 顶部深海蓝横幅 + 资源概览卡：已登记医院数 / 开放床位 / 开通协同能力项；
 *   - 转诊建议查询：输入病种关键词 + 所在区域 + 最低等级，实时推荐承接医院；
 *   - 协同医院表格：名称 / 等级 / 所在区域 / 重点专科 / 协同能力标签 / 床位 / 联络；
 *   - 登记新医院弹窗：POST /api/v1/regional/hospitals；
 *   - 跨院共享 patient_id 一律脱敏展示（P0****23），原始 EMPPI 不出院。
 * 视觉：深海蓝 VI（#0a2540 -> #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Form, Input, Layout, Modal, Row, Select, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF regionalCoopAggregator 输出对齐 */
type HospitalLevel = '三级甲等' | '三级乙等' | '二级甲等' | '二级乙等' | '一级';
type RegionalService = '检验结果互认' | '影像资料共享' | '专家号源共享' | '双向转诊通道';

interface Hospital {
  id: string;
  name: string;
  level: HospitalLevel;
  services: RegionalService[];
  specialties: string[];
  capacity: number;
  contact: string;
  region: string;
  createdAt: string;
}

/** 深海蓝 VI 色板 */
const VI = { deep: '#0a2540', mid: '#123a5e', accent: '#1e6fbf', bg: '#f5f7fa' };

const SERVICE_OPTIONS: RegionalService[] = ['检验结果互认', '影像资料共享', '专家号源共享', '双向转诊通道'];
const LEVEL_OPTIONS: HospitalLevel[] = ['三级甲等', '三级乙等', '二级甲等', '二级乙等', '一级'];

const LEVEL_COLOR: Record<HospitalLevel, string> = {
  三级甲等: 'red', 三级乙等: 'volcano', 二级甲等: 'blue', 二级乙等: 'cyan', 一级: 'default',
};

const SERVICE_COLOR: Record<RegionalService, string> = {
  检验结果互认: 'green', 影像资料共享: 'geekblue', 专家号源共享: 'gold', 双向转诊通道: 'purple',
};

export default function RegionalCoopMapPage() {
  const [list, setList] = useState<Hospital[]>([]);
  const [suggestions, setSuggestions] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [queryForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/regional/hospitals');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setList([]);
        return;
      }
      setList((json.data as { list: Hospital[] }).list ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // ---- 资源概览（客户端聚合，与 aggregator buildRegionalResourceMap 口径一致） ----
  const stats = useMemo(() => {
    let beds = 0;
    let coopCount = 0;
    for (const h of list) {
      beds += h.capacity;
      coopCount += h.services.length;
    }
    return { total: list.length, beds, coopCount };
  }, [list]);

  const runReferralSuggest = async () => {
    const v = await queryForm.validateFields();
    const params = new URLSearchParams();
    if (v.condition) params.set('condition', v.condition);
    if (v.location) params.set('location', v.location);
    if (v.level) params.set('level', v.level);
    try {
      const resp = await fetch(`/api/v1/regional/referral-suggest?${params.toString()}`);
      const json = await resp.json();
      if (json.code === 0) setSuggestions((json.data as { list: Hospital[] }).list ?? []);
    } catch {
      setSuggestions([]);
    }
  };

  const columns: ColumnsType<Hospital> = [
    { title: '编号', dataIndex: 'id', width: 90 },
    { title: '医院名称', dataIndex: 'name', ellipsis: true },
    { title: '等级', dataIndex: 'level', width: 90, render: (l: HospitalLevel) => <Tag color={LEVEL_COLOR[l]}>{l}</Tag> },
    { title: '区域', dataIndex: 'region', width: 80, render: (r: string) => <Tag>{r}</Tag> },
    {
      title: '重点专科', dataIndex: 'specialties', width: 220,
      render: (sp: string[]) => sp.map((s) => <Tag key={s} color={VI.accent}>{s}</Tag>),
    },
    {
      title: '协同能力', dataIndex: 'services', width: 220,
      render: (sv: RegionalService[]) => sv.map((s) => <Tag key={s} color={SERVICE_COLOR[s]}>{s}</Tag>),
    },
    { title: '床位', dataIndex: 'capacity', width: 80, sorter: (a, b) => a.capacity - b.capacity },
    { title: '联络', dataIndex: 'contact', ellipsis: true },
  ];

  const submitCreate = async () => {
    const v = await createForm.validateFields();
    await fetch('/api/v1/regional/hospitals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: v.name, level: v.level, services: v.services,
        specialties: (v.specialties ?? '').split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean),
        capacity: Number(v.capacity ?? 0), contact: v.contact,
      }),
    });
    setCreateOpen(false); createForm.resetFields(); void load();
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>区域医疗资源地图</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              互联网医院与远程医疗 · 检验互认 / 影像共享 / 号源共享 / 双向转诊，跨院 patient_id 已脱敏（P0****23）
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" onClick={() => { createForm.resetFields(); setCreateOpen(true); }}>登记协同医院</Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" tip="正在加载区域资源…" /></div>}
        {!loading && error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />}

        {!loading && !error && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Card><Statistic title="已登记协同医院" value={stats.total} /></Card></Col>
              <Col span={8}><Card><Statistic title="区域开放床位" value={stats.beds} /></Card></Col>
              <Col span={8}><Card><Statistic title="协同能力开通项次" value={stats.coopCount} /></Card></Col>
            </Row>

            <Card style={{ marginBottom: 16 }} title="转诊建议（按病种 / 区域 / 最低等级推荐承接医院）">
              <Form form={queryForm} layout="inline" style={{ rowGap: 12 }}>
                <Form.Item name="condition" label="病种"><Input placeholder="如：急性胸痛 / 脑梗 / 新生儿" style={{ width: 200 }} /></Form.Item>
                <Form.Item name="location" label="所在区域"><Input placeholder="如：杭州" style={{ width: 100 }} /></Form.Item>
                <Form.Item name="level" label="最低等级">
                  <Select allowClear style={{ width: 120 }} options={LEVEL_OPTIONS.map((l) => ({ label: l, value: l }))} />
                </Form.Item>
                <Button type="primary" onClick={runReferralSuggest}>查询建议</Button>
              </Form>
              {suggestions.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {suggestions.map((h, i) => (
                    <div key={h.id} style={{ marginBottom: 6 }}>
                      <Tag color={i === 0 ? 'green' : 'default'}>#{i + 1}</Tag>
                      <strong>{h.name}</strong>
                      <Tag color={LEVEL_COLOR[h.level]} style={{ marginLeft: 8 }}>{h.level}</Tag>
                      <span style={{ color: 'rgba(0,0,0,0.55)', marginLeft: 8 }}>
                        {h.region} · {h.specialties.join(' / ')} · 床位 {h.capacity}
                      </span>
                    </div>
                  ))}
                  <Alert style={{ marginTop: 8 }} type="info" showIcon message="跨院共享提示：患者标识已脱敏为 P0****23，原始主索引不出院。" />
                </div>
              )}
            </Card>

            <Card title={`协同医院（共 ${list.length} 家）`}>
              <Table rowKey="id" columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="small" />
            </Card>
          </>
        )}
      </Content>

      <Modal open={createOpen} title="登记区域协同医院" onOk={submitCreate} onCancel={() => setCreateOpen(false)} okText="登记">
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="医院全称" rules={[{ required: true, message: '请输入医院全称' }]}>
            <Input placeholder="如：浙江大学医学院附属第一医院" />
          </Form.Item>
          <Form.Item name="level" label="医院等级" rules={[{ required: true, message: '请选择等级' }]}>
            <Select options={LEVEL_OPTIONS.map((l) => ({ label: l, value: l }))} placeholder="请选择" />
          </Form.Item>
          <Form.Item name="services" label="协同能力（可多选）" rules={[{ required: true, message: '至少选一项' }]}>
            <Select mode="multiple" options={SERVICE_OPTIONS.map((s) => ({ label: s, value: s }))} placeholder="检验互认/影像共享/号源共享/双向转诊" />
          </Form.Item>
          <Form.Item name="specialties" label="重点专科（逗号分隔）" rules={[{ required: true, message: '请输入重点专科' }]}>
            <Input placeholder="如：心血管内科, 肿瘤科, 儿科" />
          </Form.Item>
          <Form.Item name="capacity" label="开放床位数" rules={[{ required: true, message: '请输入床位' }]}>
            <Input type="number" min={0} placeholder="如：2500" />
          </Form.Item>
          <Form.Item name="contact" label="对外联络（对接人 + 电话）" rules={[{ required: true, message: '请输入联络方式' }]}>
            <Input placeholder="如：王主任 0571-88888888" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
