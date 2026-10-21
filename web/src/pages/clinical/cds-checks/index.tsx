/**
 * 健澜科技 jlmedaios - CDS 临床决策支持检查（M543，P0）
 *
 * 三甲流程：患者就诊 Select（searchVisits）→ 用药 Table + 检验 Table 静态演示上下文
 * → 「规则检查」按钮调 POST /cds/checks → alerts 按 level 着色（critical 红/warning 黄/info 蓝）
 * → references Collapse 折叠。权限码 cds:check。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useCdsChecksStore } from '@/store/cdsChecksStore';
import { searchVisits, type VisitOption } from '@/services/api/clinicalDict';
import {
  CDS_ALERT_LEVEL_META,
  CDS_CATEGORY_META,
  DRUG_LABEL,
  LAB_META,
  type CdsAlert,
  type CdsLabs,
} from '@/services/api/cdsChecks';

export default function CdsChecksPage() {
  usePageTitle('CDS 智能检查');
  const { hasPermission } = usePermission();
  const canCheck = hasPermission('cds:check');

  const {
    medications,
    labs,
    age,
    gender,
    alerts,
    checkedAt,
    ruleCount,
    acting,
    error,
    demo,
    lastResultDemo,
    loadContext,
    check,
  } = useCdsChecksStore();

  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);

  useEffect(() => {
    void loadVisits('');
  }, []);

  const loadVisits = async (keyword: string) => {
    setVisitsLoading(true);
    try {
      const res = await searchVisits(keyword);
      setVisitOptions(res.data);
    } catch {
      setVisitOptions([]);
    } finally {
      setVisitsLoading(false);
    }
  };

  const medColumns = useMemo(
    () => [
      {
        title: '药品',
        dataIndex: 'drugCode',
        render: (v: string) => (
          <span>{DRUG_LABEL[v.toLowerCase()] ?? v} <Tag>{v}</Tag></span>
        ),
      },
      { title: '剂量', dataIndex: 'dose', width: 90, render: (_: unknown, r: { dose: string; unit: string }) => `${r.dose} ${r.unit}` },
      { title: '频次', dataIndex: 'frequency', width: 140 },
    ],
    [],
  );

  const labRows = useMemo(
    () =>
      (Object.keys(LAB_META) as Array<keyof typeof LAB_META>)
        .filter((k) => {
          const v = labs[k as keyof CdsLabs];
          return typeof v === 'number';
        })
        .map((k) => ({
          key: k,
          label: LAB_META[k].label,
          value: labs[k as keyof CdsLabs] as number,
          unit: LAB_META[k].unit,
        })),
    [labs],
  );

  const doCheck = async () => {
    await check();
    if (lastResultDemo) {
      void message.warning('BFF 不可用，已按本地演示规则生成提示，未写入业务库');
    }
  };

  return (
    <PageContainer
      title="CDS 临床决策支持"
      description="用药 + 检验 + 人口学上下文 → 规则引擎输出 alerts（critical 阻断 / warning 警告 / info 提示）"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canCheck && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 cds:check 权限，无法执行规则检查" />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            showSearch
            style={{ width: 320 }}
            placeholder="输入姓名 / 科室 / 诊断搜索患者"
            loading={visitsLoading}
            value={selectedVisit?.visitId}
            options={visitOptions.map((v) => ({ value: v.visitId, label: `${v.name} · ${v.dept} · ${v.diagnosis}` }))}
            onSearch={() => loadVisits('')}
            onFocus={() => loadVisits('')}
            filterOption={false}
            onChange={(visitId) => {
              const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
              setSelectedVisit(opt);
              loadContext({ patientId: opt?.patientId, visitId });
            }}
          />
          <InputNumber addonAfter="岁" value={age} disabled />
          <Tag color={gender === 'male' ? 'blue' : 'pink'}>{gender === 'male' ? '男' : '女'}</Tag>
          <Button type="primary" loading={acting} disabled={!canCheck} onClick={() => void doCheck()}>
            规则检查
          </Button>
        </Space>
      </Card>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small" title="当前用药上下文">
          <Table
            rowKey={(r) => `${r.drugCode}-${r.frequency}`}
            dataSource={medications}
            columns={medColumns}
            size="small"
            pagination={false}
          />
        </Card>

        <Card size="small" title="检验值上下文">
          <Descriptions size="small" column={3} bordered>
            {labRows.map((r) => (
              <Descriptions.Item key={r.key} label={r.label}>
                {r.value} {r.unit}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>

        <Card
          size="small"
          title={
            <Space>
              <span>规则检查结果</span>
              {ruleCount != null && <Tag>规则总数 {ruleCount}</Tag>}
              {checkedAt && (
                <Typography.Text type="secondary">
                  {dayjs(checkedAt).format('YYYY-MM-DD HH:mm:ss')}
                </Typography.Text>
              )}
            </Space>
          }
        >
          {alerts.length === 0 && !acting && (
            <Alert type="info" showIcon message="尚未执行检查，或当前上下文未触发任何规则" />
          )}
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {alerts.map((a: CdsAlert, idx: number) => (
              <Alert
                key={`${a.message}-${idx}`}
                type={CDS_ALERT_LEVEL_META[a.level].antdType}
                showIcon
                message={
                  <Space>
                    <Tag color={a.level === 'critical' ? 'red' : a.level === 'warning' ? 'orange' : 'blue'}>
                      {CDS_ALERT_LEVEL_META[a.level].label}
                    </Tag>
                    <Tag>{CDS_CATEGORY_META[a.category]}</Tag>
                    <Typography.Text code>{a.message}</Typography.Text>
                  </Space>
                }
                description={
                  <>
                    <div>{a.suggestion}</div>
                    <Collapse
                      size="small"
                      ghost
                      items={[
                        {
                          key: 'ref',
                          label: `参考文献（${a.references.length}）`,
                          children: (
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                              {a.references.map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                          ),
                        },
                      ]}
                    />
                  </>
                }
              />
            ))}
          </Space>
        </Card>
      </Space>
    </PageContainer>
  );
}
