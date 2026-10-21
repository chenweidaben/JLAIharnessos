/**
 * 健澜科技 jlmedaios - Barthel 指数 ADL 评估（M521-G，P0）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出信息 → 10 项 ADL 按 0/5/10/15 档 Radio
 * → 实时自动算总分 → 分级 Tag（≤20 重度 red / 21–40 中度 orange / 41–60 轻度 yellow / ≥61 自理 green）
 * → ≤40 自动 Alert「重度依赖，需专人照护并联动护理级别」；签名留痕。
 * 历史 antd Table + 详情 Modal；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：nursing:barthel（登记）/ nursing:view（查看历史）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useAuthStore } from '@/store/authStore';
import { useBarthelIndexFormStore } from '@/store/barthelIndexFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  BARTHEL_ITEMS,
  BARTHEL_LEVEL_COLOR,
  BARTHEL_LEVEL_LABEL,
  barthelLevelOf,
  barthelTotal,
  needsCare,
  type BarthelItemKey,
  type BarthelRecord,
  type BarthelSubmitInput,
} from '@/services/api/barthelIndexForm';

type FormValues = {
  visitId: string;
  assessedAt: Dayjs;
  signature: string;
} & Partial<Record<BarthelItemKey, number>>;

export default function BarthelIndexM521Page() {
  usePageTitle('Barthel 指数 ADL 评估');
  const { hasPermission } = usePermission();
  const canAssess = hasPermission('nursing:barthel');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = useBarthelIndexFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<BarthelRecord | null>(null);

  useEffect(() => {
    void load();
    void loadVisits('');
  }, [load]);

  const loadVisits = async (keyword: string) => {
    setVisitsLoading(true);
    const res = await searchVisits(keyword);
    setVisitOptions(res.data);
    setVisitsLoading(false);
  };

  const watched = Form.useWatch([], form) ?? {};
  const itemsWatched = useMemo(
    () => Object.fromEntries(BARTHEL_ITEMS.map((it) => [it.key, watched[it.key] ?? 0])) as Record<BarthelItemKey, number>,
    [watched],
  );
  const total = barthelTotal(itemsWatched);
  const level = barthelLevelOf(total);
  const needCare = needsCare(total);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    form.setFieldsValue({ signature: currentUser?.realName ?? '' });
  };

  const doSubmit = async (values: FormValues) => {
    const items = Object.fromEntries(
      BARTHEL_ITEMS.map((it) => [it.key, values[it.key] ?? 0]),
    ) as Record<BarthelItemKey, number>;
    const input: BarthelSubmitInput = {
      visitId: values.visitId,
      patientId: selectedVisit?.patientId,
      patientName: selectedVisit?.name,
      items,
      assessedAt: values.assessedAt.toISOString(),
      signature: values.signature.trim(),
      assessorName: currentUser?.realName ?? '当前用户',
    };
    try {
      const result = await submit(input);
      if (result.demo) {
        message.warning('BFF 不可用，本次 Barthel 评估已按本地演示记录留存，未写入业务库');
      } else {
        message.success(`Barthel 评估完成：总分 ${result.record.totalScore}（${BARTHEL_LEVEL_LABEL[result.record.level]}）`);
      }
      form.resetFields();
      setSelectedVisit(null);
      await load();
    } catch {
      // error 已写入 store
    }
  };

  const historyColumns = useMemo(
    () => [
      { title: '评估时间', dataIndex: 'assessedAt', ellipsis: true, render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: BarthelRecord) => v ?? r.visitId.slice(-6) },
      { title: '总分', dataIndex: 'totalScore', render: (v: number) => <b>{v}</b> },
      { title: '分级', dataIndex: 'level', render: (v: BarthelRecord['level']) => <Tag color={BARTHEL_LEVEL_COLOR[v]}>{BARTHEL_LEVEL_LABEL[v]}</Tag> },
      { title: '需照护', dataIndex: 'needsCare', render: (v: boolean) => (v ? <Tag color="red">联动护理级别</Tag> : <Tag color="green">自理</Tag>) },
      { title: '签名', dataIndex: 'signature', render: (v?: string) => v ?? '—' },
      {
        title: '操作',
        render: (_: unknown, r: BarthelRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="Barthel 指数 ADL 评估"
      description="10 项日常生活活动评分 · 自动分级（重度/中度/轻度/自理）· ≤40 联动护理级别"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建 Barthel 评估" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{ assessedAt: dayjs(), signature: currentUser?.realName ?? '' }}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="visitId" label="患者 / 就诊（远程搜索）" rules={[{ required: true, message: '请选择患者/就诊' }]}>
                <Select
                  showSearch
                  placeholder="输入姓名 / 科室 / 诊断搜索"
                  loading={visitsLoading}
                  options={visitOptions.map((v) => ({ value: v.visitId, label: `${v.name} · ${v.dept} · ${v.diagnosis}` }))}
                  onSearch={loadVisits}
                  onFocus={() => loadVisits('')}
                  onChange={onVisitChange}
                  filterOption={false}
                />
              </Form.Item>
            </Col>
            {selectedVisit && (
              <Col span={14}>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 30 }}
                  message={`${selectedVisit.name}（${selectedVisit.gender === 'male' ? '男' : '女'} · ${selectedVisit.age} 岁 · ${selectedVisit.bedNo}）`}
                  description={`诊断：${selectedVisit.diagnosis}`}
                />
              </Col>
            )}
          </Row>

          <Row gutter={[16, 0]}>
            {BARTHEL_ITEMS.map((it) => (
              <Col key={it.key} span={8}>
                <Form.Item
                  name={it.key}
                  label={`${it.label}（${it.options.join(' / ')}）`}
                  rules={[{ required: true, message: `请选择${it.label}评分` }]}
                >
                  <Select
                    options={it.options.map((opt) => ({ value: opt, label: `${opt} 分` }))}
                    placeholder={`${it.label}评分`}
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>

          <Alert
            type={needCare ? 'warning' : level === 'independent' ? 'success' : 'info'}
            showIcon
            style={{ marginBottom: 12 }}
            message={
              needCare
                ? `当前总分 ${total} 分：重度/中度依赖，需专人照护并联动护理级别`
                : level === 'independent'
                  ? `当前总分 ${total} 分：生活自理良好`
                  : `当前总分 ${total} 分：${BARTHEL_LEVEL_LABEL[level]}`
            }
          />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="assessedAt" label="评估日期" rules={[{ required: true, message: '请选择评估日期' }]}>
                <DatePicker format="YYYY-MM-DD" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="signature"
                label="评估护士电子签名"
                rules={[{ required: true, message: '请签署评估护士姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="评估护士本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canAssess}>提交 Barthel 评估</Button>
            {!canAssess && <Typography.Text type="secondary">当前账号缺少 nursing:barthel 权限，无法登记</Typography.Text>}
            <Tag color={BARTHEL_LEVEL_COLOR[level]}>实时总分 {total} · {BARTHEL_LEVEL_LABEL[level]}</Tag>
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`Barthel 评估记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 800 }}
          />
        </Spin>
      </Card>

      <Modal
        open={detailRecord != null}
        title="Barthel 评估详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · 总分：{detailRecord.totalScore}</div>
            <div>
              分级：<Tag color={BARTHEL_LEVEL_COLOR[detailRecord.level]}>{BARTHEL_LEVEL_LABEL[detailRecord.level]}</Tag>
            </div>
            <div>项目明细：{BARTHEL_ITEMS.map((it) => `${it.label} ${detailRecord.items[it.key] ?? 0}`).join(' · ')}</div>
            <div>评估护士：{detailRecord.assessorName ?? detailRecord.signature} · 时间：{dayjs(detailRecord.assessedAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
