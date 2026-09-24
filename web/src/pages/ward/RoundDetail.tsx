/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 查房详情 - /ward/round/:patientId
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Descriptions, Layout, Result, Spin, Tabs, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, HeartOutlined } from '@ant-design/icons';
import { useWardStore } from '@/store/wardStore';
// TODO(P2): 接入真实 API（医嘱模板 /medical/order_templates）后移除本地 mock
import { orderTemplates } from '@/mock/wardMock';
import type { RoundRecord as RoundRecordType } from '@/types/ward';
import RoundRecord from '@/components/ward/RoundRecord';
import OrderAdjustment from '@/components/ward/OrderAdjustment';
import AssessmentPanel from '@/components/ward/AssessmentPanel';
import { conditionMeta, nursingLevelMeta } from '@/components/ward/meta';
import { maskName } from '@/utils/desensitize';
import { formatDateTime } from '@/utils/format';

const { Header, Content } = Layout;

export default function RoundDetail() {
  const { patientId = '' } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const {
    roundList,
    currentRoundRecord,
    fetchRoundList,
    startRound,
    saveRoundRecord,
    submitOrder,
    stopOrder,
    finishRound,
    addAssessment,
  } = useWardStore();
  const [record, setRecord] = useState<RoundRecordType | null>(null);
  const [tab, setTab] = useState('record');

  const roundPatient = roundList.find((r) => r.patient.id === patientId) ?? null;
  // 订阅 store 中的稳定数组引用，再用 useMemo 过滤。
  // 不能直接 useStore(s => s.x.filter(...))：filter 每次返回新数组，
  // 在 useSyncExternalStore 下 snapshot 引用不稳定会触发无限重渲染。
  const allOrders = useWardStore((s) => s.allOrders);
  const allAssessments = useWardStore((s) => s.assessments);
  const orders = useMemo(
    () => allOrders.filter((o) => o.patientId === patientId),
    [allOrders, patientId],
  );
  const assessments = useMemo(
    () => allAssessments.filter((a) => a.patientId === patientId),
    [allAssessments, patientId],
  );

  useEffect(() => {
    void fetchRoundList();
    void startRound(patientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (currentRoundRecord) setRecord(currentRoundRecord);
  }, [currentRoundRecord]);

  if (!roundPatient) {
    return (
      <Layout className="min-h-screen bg-ink-bg">
        <Result
          status="404"
          title="未找到患者"
          subTitle="该患者不存在或已转出"
          extra={<Button onClick={() => navigate('/ward')}>返回病区</Button>}
        />
      </Layout>
    );
  }

  const p = roundPatient.patient;
  const nlm = nursingLevelMeta[p.nursingLevel];
  const cm = conditionMeta[p.condition];

  return (
    <Layout className="min-h-screen bg-ink-bg">
      <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/ward')} />
          <HeartOutlined className="text-2xl text-white" />
          <div>
            <Typography.Title level={4} className="!mb-0 !text-white">
              {roundPatient.bedNo}床 · {maskName(p.name)}
            </Typography.Title>
            <span className="text-xs text-white/70">
              {p.gender === 'male' ? '男' : '女'} · {p.age}岁 · 住院号 {p.inpatientNo} · 入院{' '}
              {formatDateTime(p.admitTime)}
            </span>
          </div>
        </div>
        <Button
          type="primary"
          ghost
          icon={<CheckCircleOutlined />}
          onClick={() => {
            void finishRound(patientId);
            navigate('/ward');
          }}
        >
          完成查房
        </Button>
      </Header>
      <Content className="p-4">
        {/* 患者信息条 */}
        <div className="mb-3 rounded-lg border border-ink-border bg-white p-3 shadow-card">
          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
            <Descriptions.Item label="主要诊断">{p.diagnosis}</Descriptions.Item>
            <Descriptions.Item label="护理等级">
              <Tag color={nlm.color}>{nlm.label}护理</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="病情">
              <Tag color={cm.color}>
                {cm.icon} {cm.label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="过敏史">
              {p.allergies.length > 0 ? <Tag color="red">{p.allergies.join('、')}</Tag> : '无'}
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Spin spinning={!record}>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'record',
                label: '查房记录',
                children: record && (
                  <RoundRecord
                    record={record}
                    onChange={setRecord}
                    onSubmit={(r) => void saveRoundRecord(r)}
                  />
                ),
              },
              {
                key: 'orders',
                label: '医嘱调整',
                children: (
                  <OrderAdjustment
                    orders={orders}
                    patientAllergy={p.allergies}
                    templates={orderTemplates}
                    onSubmit={(o) => void submitOrder(o)}
                    onStop={(id) => void stopOrder(id)}
                  />
                ),
              },
              {
                key: 'assess',
                label: '病情评估',
                children: (
                  <AssessmentPanel records={assessments} onAdd={(a) => void addAssessment(a)} />
                ),
              },
            ]}
          />
        </Spin>
      </Content>
    </Layout>
  );
}
