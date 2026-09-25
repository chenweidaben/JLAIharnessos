/**
 * 健澜科技 jlmedaios - 入院登记表（M1-A，真实 BFF）
 *
 * 入院登记 → 分配床位（自动或指定），成功后打开患者摘要抽屉。
 * 严谨性：需 inpatient:admit 权限；操作者为真实登录医护；AI 不得直接发起。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Radio,
  Segmented,
  Select,
  Space,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useInpatientStore } from '@/store/inpatientStore';
import { useAuthStore } from '@/store/authStore';
import type {
  AdmissionSource,
  AdmissionType,
  AdmitPayload,
  InpatientCondition,
} from '@/types/inpatient';
import {
  admissionSourceMeta,
  admissionTypeMeta,
  conditionMeta,
} from './bedMeta';

interface FormValues {
  patientKind: 'existing' | 'new';
  mrn?: string;
  nameMasked?: string;
  gender?: '男' | '女' | '未知' | '未说明';
  birthDate?: dayjs.Dayjs;
  wardId: string;
  bedId?: string;
  diagnosis: string;
  condition: InpatientCondition;
  admissionType: AdmissionType;
  source: AdmissionSource;
}

export default function AdmissionForm() {
  const [form] = Form.useForm<FormValues>();
  const { bedMap, admit, acting, selectVisit } = useInpatientStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [patientKind, setPatientKind] = useState<'existing' | 'new'>('new');
  const [wardId, setWardId] = useState<string | undefined>();
  const [done, setDone] = useState<string | null>(null);

  const wards = bedMap?.wards ?? [];
  const freeBeds = useMemo(() => {
    if (!wardId || !bedMap) return [];
    return bedMap.wards.find((w) => w.id === wardId)?.beds.filter((b) => b.status === 'available') ?? [];
  }, [wardId, bedMap]);

  const canAdmit = hasPermission('inpatient:admit');

  const onFinish = async (v: FormValues) => {
    const payload: AdmitPayload = {
      wardId: v.wardId,
      bedId: v.bedId,
      diagnosis: v.diagnosis.trim(),
      condition: v.condition,
      admissionType: v.admissionType,
      source: v.source,
    };
    if (v.patientKind === 'existing') {
      payload.mrn = v.mrn?.trim();
    } else {
      payload.newPatient = {
        nameMasked: v.nameMasked?.trim() ?? '',
        gender: v.gender ?? '未知',
        birthDate: v.birthDate ? v.birthDate.format('YYYY-MM-DD') : null,
      };
    }
    const item = await admit(payload);
    setDone(`入院登记成功：${item.nameMasked}　${item.wardName} ${item.bedNo}床（就诊号 ${item.visitNo}）`);
    form.resetFields();
    setWardId(undefined);
    setPatientKind('new');
    void selectVisit(item.visitId);
  };

  if (!canAdmit) {
    return <Alert type="warning" showIcon message="您没有入院登记权限（inpatient:admit）" />;
  }

  return (
    <Card size="small" title={<span className="font-semibold text-jl-primary">入院登记</span>}>
      {done && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 12 }}
          message={done}
          closable
          onClose={() => setDone(null)}
        />
      )}
      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={{
          patientKind: 'new',
          gender: '男',
          condition: 'stable',
          admissionType: 'elective',
          source: 'outpatient',
        }}
        onFinish={(v) => void onFinish(v)}
        style={{ maxWidth: 760 }}
      >
        <Form.Item label="患者类型" name="patientKind">
          <Radio.Group
            onChange={(e) => setPatientKind(e.target.value as 'existing' | 'new')}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="new">新建患者</Radio.Button>
            <Radio.Button value="existing">既有患者（MRN）</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {patientKind === 'existing' ? (
          <Form.Item
            label="病案号 MRN"
            name="mrn"
            rules={[{ required: true, message: '请输入既有患者 MRN' }]}
          >
            <Input placeholder="如 PAT-INP-001" allowClear />
          </Form.Item>
        ) : (
          <Space wrap size={12} style={{ display: 'flex' }}>
            <Form.Item
              label="姓名（脱敏）"
              name="nameMasked"
              style={{ flex: 1, minWidth: 160 }}
              rules={[{ required: true, message: '请输入脱敏姓名，如 张*强' }]}
            >
              <Input placeholder="如 张*强" />
            </Form.Item>
            <Form.Item label="性别" name="gender" style={{ minWidth: 110 }}>
              <Select
                options={[
                  { value: '男', label: '男' },
                  { value: '女', label: '女' },
                  { value: '未知', label: '未知' },
                  { value: '未说明', label: '未说明' },
                ]}
              />
            </Form.Item>
            <Form.Item label="出生日期" name="birthDate" style={{ minWidth: 150 }}>
              <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
            </Form.Item>
          </Space>
        )}

        <Space wrap size={12} style={{ display: 'flex' }}>
          <Form.Item
            label="收治病区"
            name="wardId"
            style={{ minWidth: 240, flex: 1 }}
            rules={[{ required: true, message: '请选择收治病区' }]}
          >
            <Select
              placeholder="选择病区"
              onChange={(v) => {
                setWardId(v);
                form.setFieldValue('bedId', undefined);
              }}
              options={wards.map((w) => ({
                value: w.id,
                label: `${w.name}（${w.department} · 空闲${w.stats.available}）`,
              }))}
            />
          </Form.Item>
          <Form.Item label="指定床位" name="bedId" style={{ minWidth: 180 }}>
            <Select
              allowClear
              placeholder="留空=自动分配"
              options={freeBeds.map((b) => ({ value: b.id, label: `${b.bedNo}（${b.roomNo}房）` }))}
            />
          </Form.Item>
        </Space>

        <Form.Item
          label="入院诊断"
          name="diagnosis"
          rules={[{ required: true, message: '入院诊断不能为空' }]}
        >
          <Input.TextArea rows={2} placeholder="如 急性非ST段抬高型心肌梗死" />
        </Form.Item>

        <Space wrap size={20}>
          <Form.Item label="病情分级" name="condition" style={{ marginBottom: 8 }}>
            <Segmented
              options={(Object.keys(conditionMeta) as InpatientCondition[]).map((c) => ({
                value: c,
                label: conditionMeta[c].label,
              }))}
            />
          </Form.Item>
          <Form.Item label="入院方式" name="admissionType" style={{ marginBottom: 8 }}>
            <Segmented
              options={(Object.keys(admissionTypeMeta) as AdmissionType[]).map((t) => ({
                value: t,
                label: admissionTypeMeta[t],
              }))}
            />
          </Form.Item>
          <Form.Item label="入院来源" name="source" style={{ marginBottom: 8 }}>
            <Select
              style={{ width: 140 }}
              options={(Object.keys(admissionSourceMeta) as AdmissionSource[]).map((s) => ({
                value: s,
                label: admissionSourceMeta[s],
              }))}
            />
          </Form.Item>
        </Space>

        <Form.Item style={{ marginTop: 8 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              提交入院并分配床位
            </Button>
            <Tag color="blue">AI 仅辅助，入院事务需医师复核</Tag>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
