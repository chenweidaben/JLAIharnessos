/**
 * 健澜科技 jlmedaios - 护士屏康复/疼痛汇总卡片（M53-A）
 * 疗效 poor/fair 标红；NRS>=7 或爆发痛>=3 标红。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Card, Col, Row, Statistic, Tag } from 'antd';
import { useEvalSummaryStore } from '@/store/evalSummaryStore';

export function RehabPainEvalCards({ visitId }: { visitId: string }) {
  const { data, loading, error, checkHealth, load } = useEvalSummaryStore();
  useEffect(() => { void checkHealth().then(() => load(visitId)); }, [checkHealth, load, visitId]);

  if (error) return <Alert type="error" showIcon message={error} />;
  if (!data) return <Card loading={loading} />;

  const rt = data.summary.rehabTreatment;
  const pc = data.summary.painClinic;
  const cg = data.summary.cga;
  const nc = data.summary.nutritionConsult;
  const sb = data.summary.stopbang;
  const sc = data.summary.surgical;

  const surgicalExtra = sc.failed
    ? <Tag color="red">核查未通过需整改</Tag>
    : sc.status === 'passed'
      ? <Tag color="green">三阶段通过</Tag>
      : sc.status === 'in_progress'
        ? <Tag color="orange">核查进行中</Tag>
        : <Tag>未核查</Tag>;
  const stageTag = (label: string, done: boolean) => (
    <Tag color={done ? 'green' : 'default'} style={{ marginBottom: 8 }}>
      {label}{done ? ' 通过' : ' 未完成'}
    </Tag>
  );

  return (
    <>
      <Row gutter={16}>
        <Col span={8}>
          <Card
            title="康复治疗"
            extra={rt.poorEfficacy ? <Tag color="red">疗效不佳需复评</Tag> : <Tag color="green">有效</Tag>}
            loading={loading}
          >
            <Statistic title="最新方式" value={rt.modality ?? '—'} />
            <Statistic title="疗效" value={rt.efficacy ?? '—'} />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title="疼痛门诊"
            extra={pc.severeNrs ? <Tag color="red">重度需升级镇痛</Tag> : <Tag color="green">可控</Tag>}
            loading={loading}
          >
            <Statistic title="当前 NRS" value={pc.currentNrs ?? '—'} />
            <Statistic title="爆发痛次数" value={pc.breakthroughCount} />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            title="老年综合评估"
            extra={cg.highRisk ? <Tag color="red">高危需多学科干预</Tag> : <Tag color="green">{cg.riskLevel === 'unknown' ? '未评估' : '低中危'}</Tag>}
            loading={loading}
          >
            <Statistic title="ADL" value={cg.adlScore ?? '—'} />
            <Statistic title="MMSE" value={cg.mmseScore ?? '—'} />
            <Statistic title="风险分级" value={cg.riskLevel === 'unknown' ? '—' : cg.riskLevel} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card
            title="营养会诊"
            extra={nc.highPlan ? <Tag color="red">高能量方案</Tag> : <Tag color="green">{nc.planTier === 'unknown' ? '未会诊' : '常规'}</Tag>}
            loading={loading}
          >
            <Statistic title="每日能量" value={nc.caloriesPerDay ?? '—'} />
            <Statistic title="随访状态" value={nc.status === 'unknown' ? '—' : nc.status} />
            {nc.followupOverdue ? <Tag color="orange">随访到期</Tag> : null}
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title="睡眠筛查 STOP-BANG"
            extra={sb.highRisk ? <Tag color="red">OSA 高危需睡眠监测</Tag> : <Tag color="green">{sb.riskLevel === 'unknown' ? '未筛查' : '低风险'}</Tag>}
            loading={loading}
          >
            <Statistic title="总分" value={sb.score ?? '—'} suffix="/8" />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="手术安全核查（WHO）" extra={surgicalExtra} loading={loading}>
            {stageTag('Sign-in 麻醉前', sc.signinComplete)}
            {stageTag('Time-out 切皮前', sc.timeoutComplete)}
            {stageTag('Sign-out 离室前', sc.signoutComplete)}
          </Card>
        </Col>
      </Row>
    </>
  );
}
