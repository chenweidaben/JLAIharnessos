/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 处方开具面板：药品搜索、剂量/频次/途径、过敏与相互作用审核、模板、电子签名提交。
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  List,
  Modal,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import type {
  DrugFrequency,
  DrugInfo,
  DrugRoute,
  PrescriptionLine,
  PrescriptionType,
} from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';
import { mockDrugCatalog, mockPrescriptionTemplates } from '@/mock/outpatientMock';
import { drugRouteLabel, frequencyLabel, prescriptionTypeLabel, severityColor } from './constants';

const FREQUENCY_OPTIONS = (Object.keys(frequencyLabel) as DrugFrequency[]).map((v) => ({
  value: v,
  label: `${v} (${frequencyLabel[v]})`,
}));
const ROUTE_OPTIONS = (Object.keys(drugRouteLabel) as DrugRoute[]).map((v) => ({
  value: v,
  label: drugRouteLabel[v],
}));

export const PrescriptionPanel: React.FC = () => {
  const prescriptions = useOutpatientStore((s) => s.prescriptions);
  const addPrescriptionLine = useOutpatientStore((s) => s.addPrescriptionLine);
  const removePrescriptionLine = useOutpatientStore((s) => s.removePrescriptionLine);
  const submitPrescription = useOutpatientStore((s) => s.submitPrescription);
  const currentPatient = useOutpatientStore((s) => s.currentPatient);

  const [type, setType] = useState<PrescriptionType>('western');
  const [kw, setKw] = useState('');
  const rxId = prescriptions[0]?.prescriptionId ?? 'RX-20260916-0001';
  const [sigModal, setSigModal] = useState(false);

  const rx = prescriptions.find((p) => p.prescriptionId === rxId) ?? prescriptions[0];

  const drugResults = useMemo(() => {
    const k = kw.trim().toLowerCase();
    if (!k) return mockDrugCatalog.slice(0, 8);
    return mockDrugCatalog
      .filter(
        (d) =>
          d.genericName.toLowerCase().includes(k) || d.pinyin.includes(k) || d.spec.includes(k),
      )
      .slice(0, 12);
  }, [kw]);

  const addDrug = (drug: DrugInfo) => {
    if (
      currentPatient?.allergies.some(
        (a) => drug.genericName.includes(a) || a.includes(drug.genericName.slice(0, 2)),
      )
    ) {
      message.error(`患者对相关药物过敏，禁止开具 ${drug.genericName}`);
      return;
    }
    const line: PrescriptionLine = {
      lineId: `L${Date.now()}`,
      drug,
      dose: 1,
      doseUnit: drug.spec.split('/')[0]?.match(/[\d.]+/)?.[0]
        ? (drug.spec.match(/[\d.]+(mg|g|ml|IU)/i)?.[1] ?? 'mg')
        : 'mg',
      frequency: 'tid',
      route: drug.dosageForm.includes('注射') ? 'ivgtt' : 'po',
      days: 7,
      quantity: 1,
      instruction: '遵医嘱',
      subtotal: drug.price,
    };
    addPrescriptionLine(rx.prescriptionId, line);
    message.success(`已添加 ${drug.genericName}`);
  };

  const updateLine = (lineId: string, patch: Partial<PrescriptionLine>) => {
    // 重新计算小计
    useOutpatientStore.setState((s) => ({
      prescriptions: s.prescriptions.map((p) => {
        if (p.prescriptionId !== rx.prescriptionId) return p;
        const lines = p.lines.map((l) => {
          if (l.lineId !== lineId) return l;
          const merged = { ...l, ...patch };
          merged.subtotal = Number(
            (merged.dose * merged.quantity * 0.1 + merged.drug.price).toFixed(2),
          );
          return merged;
        });
        return { ...p, lines, totalFee: lines.reduce((sum, l) => sum + l.subtotal, 0) };
      }),
    }));
  };

  const applyTemplate = (tplId: string) => {
    const tpl = mockPrescriptionTemplates.find((t) => t.templateId === tplId);
    if (!tpl) return;
    tpl.lines.forEach((tl) => {
      const drug = mockDrugCatalog.find((d) => d.drugId === tl.drugId);
      if (!drug) return;
      addPrescriptionLine(rx.prescriptionId, {
        lineId: `L${Date.now()}-${tl.drugId}`,
        drug,
        dose: tl.dose,
        doseUnit: tl.doseUnit,
        frequency: tl.frequency,
        route: tl.route,
        days: tl.days,
        quantity: 1,
        instruction: tl.instruction,
        subtotal: drug.price,
      });
    });
    message.success(`已套用处方模板：${tpl.name}`);
  };

  const columns = [
    {
      title: '药品',
      dataIndex: 'name',
      render: (_: unknown, l: PrescriptionLine) => (
        <div>
          <div className="font-medium text-sm">{l.drug.genericName}</div>
          <div className="text-xs text-ink-secondary">
            {l.drug.spec} · {l.drug.dosageForm} · {l.drug.manufacturer}
          </div>
          {(l.drug.highRisk || l.drug.antibiotics) && (
            <div>
              {l.drug.highRisk && (
                <Tag color="red" className="!mr-0 !text-[10px]">
                  高危药
                </Tag>
              )}
              {l.drug.antibiotics && (
                <Tag color="orange" className="!mr-0 !text-[10px]">
                  抗菌药
                </Tag>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '单次剂量',
      width: 110,
      render: (_: unknown, l: PrescriptionLine) => (
        <Space.Compact>
          <InputNumber
            size="small"
            value={l.dose}
            min={0}
            onChange={(v) => updateLine(l.lineId, { dose: v ?? 0 })}
          />
          <Select
            size="small"
            value={l.doseUnit}
            options={[
              { value: 'mg', label: 'mg' },
              { value: 'g', label: 'g' },
              { value: 'ml', label: 'ml' },
              { value: 'IU', label: 'IU' },
            ]}
            style={{ width: 70 }}
            onChange={(v) => updateLine(l.lineId, { doseUnit: v })}
          />
        </Space.Compact>
      ),
    },
    {
      title: '频次',
      width: 130,
      render: (_: unknown, l: PrescriptionLine) => (
        <Select
          size="small"
          value={l.frequency}
          options={FREQUENCY_OPTIONS}
          onChange={(v) => updateLine(l.lineId, { frequency: v })}
        />
      ),
    },
    {
      title: '途径',
      width: 110,
      render: (_: unknown, l: PrescriptionLine) => (
        <Select
          size="small"
          value={l.route}
          options={ROUTE_OPTIONS}
          onChange={(v) => updateLine(l.lineId, { route: v })}
        />
      ),
    },
    {
      title: '天数',
      width: 80,
      render: (_: unknown, l: PrescriptionLine) => (
        <InputNumber
          size="small"
          value={l.days}
          min={1}
          max={90}
          onChange={(v) => updateLine(l.lineId, { days: v ?? 1 })}
        />
      ),
    },
    {
      title: '数量',
      width: 80,
      render: (_: unknown, l: PrescriptionLine) => (
        <InputNumber
          size="small"
          value={l.quantity}
          min={1}
          onChange={(v) => updateLine(l.lineId, { quantity: v ?? 1 })}
        />
      ),
    },
    {
      title: '用法',
      render: (_: unknown, l: PrescriptionLine) => (
        <Input
          size="small"
          value={l.instruction}
          onChange={(e) => updateLine(l.lineId, { instruction: e.target.value })}
        />
      ),
    },
    {
      title: '小计',
      width: 90,
      render: (_: unknown, l: PrescriptionLine) => (
        <span className="font-medium">¥{l.subtotal.toFixed(2)}</span>
      ),
    },
    {
      title: '操作',
      width: 60,
      render: (_: unknown, l: PrescriptionLine) => (
        <Button
          size="small"
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removePrescriptionLine(rx.prescriptionId, l.lineId)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Segmented
          size="small"
          value={type}
          onChange={(v) => setType(v as PrescriptionType)}
          options={(Object.keys(prescriptionTypeLabel) as PrescriptionType[]).map((k) => ({
            value: k,
            label: prescriptionTypeLabel[k],
          }))}
        />
        <Select
          size="small"
          style={{ width: 200 }}
          placeholder="选择处方模板"
          onChange={applyTemplate}
          options={mockPrescriptionTemplates.map((t) => ({ value: t.templateId, label: t.name }))}
          suffixIcon={<ProfileOutlined />}
        />
      </div>

      {/* 过敏提醒 */}
      {currentPatient && currentPatient.allergies.length > 0 && (
        <Alert
          type="error"
          showIcon
          message={`患者过敏史：${currentPatient.allergies.join('、')}`}
          description="相关药品已在药品列表中自动拦截，处方审核将再次校验。"
        />
      )}

      {/* 药品搜索 */}
      <Card size="small" title={<span className="text-sm font-semibold">药品目录</span>}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索药品名 / 拼音首字母，如 asplcp / 阿司匹林"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          allowClear
        />
        <List
          size="small"
          className="mt-2"
          dataSource={drugResults}
          renderItem={(d) => (
            <List.Item
              actions={[
                <Button
                  key="add"
                  size="small"
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={() => addDrug(d)}
                />,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space size={4}>
                    <span className="font-medium text-sm">{d.genericName}</span>
                    {d.antibiotics && (
                      <Tag color="orange" className="!mr-0">
                        抗菌
                      </Tag>
                    )}
                    {d.highRisk && (
                      <Tag color="red" className="!mr-0">
                        高危
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <span className="text-xs text-ink-secondary">
                    {d.spec} · {d.dosageForm} · {d.manufacturer} · ¥{d.price} · 库存{d.stock}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 处方明细 */}
      <Card
        size="small"
        title={<span className="text-sm font-semibold">处方明细（{rx.lines.length}）</span>}
      >
        <Table
          rowKey="lineId"
          size="small"
          columns={columns as never}
          dataSource={rx.lines}
          pagination={false}
          scroll={{ x: 900 }}
        />
        <div className="mt-3 flex items-center justify-between">
          <Space>
            <Statistic
              title="药品费"
              value={rx.totalFee}
              precision={2}
              prefix="¥"
              valueStyle={{ fontSize: 18 }}
            />
            <Statistic
              title="总额"
              value={rx.totalFee}
              precision={2}
              prefix="¥"
              valueStyle={{ fontSize: 18, color: '#0A4D8C' }}
            />
          </Space>
          <Button
            type="primary"
            icon={<SafetyCertificateOutlined />}
            disabled={rx.lines.length === 0 || rx.signed}
            style={{ background: '#0A4D8C' }}
            onClick={() => setSigModal(true)}
          >
            {rx.signed ? '已电子签名' : '提交并签名'}
          </Button>
        </div>
      </Card>

      {/* 审核提醒 */}
      {rx.warnings.length > 0 && (
        <Card
          size="small"
          title={<span className="text-sm font-semibold">处方审核（{rx.warnings.length}）</span>}
        >
          <Space direction="vertical" className="w-full">
            {rx.warnings.map((w, idx) => (
              <Alert
                key={idx}
                type={w.level === 'danger' ? 'error' : w.level === 'warning' ? 'warning' : 'info'}
                showIcon
                message={
                  <span className="text-sm" style={{ color: severityColor[w.level] }}>
                    {w.title}
                  </span>
                }
                description={<span className="text-xs">{w.detail}</span>}
              />
            ))}
          </Space>
        </Card>
      )}

      {/* 电子签名弹窗 */}
      <Modal
        open={sigModal}
        title="电子签名 / CA 认证"
        onCancel={() => setSigModal(false)}
        onOk={() => {
          submitPrescription(rx.prescriptionId);
          setSigModal(false);
          message.success('处方已签名并提交药房');
        }}
        okText="确认签名提交"
        okButtonProps={{ icon: <SafetyCertificateOutlined /> }}
      >
        <p className="text-sm">
          本次处方共 <b>{rx.lines.length}</b> 种药品，总额 <b>¥{rx.totalFee.toFixed(2)}</b>。
        </p>
        {rx.warnings.some((w) => w.level === 'danger') && (
          <Alert
            type="error"
            showIcon
            className="mt-2"
            message="存在禁忌级提醒，签署前请务必复核！"
          />
        )}
        <p className="text-xs text-ink-secondary mt-2">
          签名即代表医师已审核处方内容，对处方的合法性、规范性负责（符合《处方管理办法》）。
        </p>
      </Modal>
    </div>
  );
};

export default PrescriptionPanel;
