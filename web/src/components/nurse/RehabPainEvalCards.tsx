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

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Card
          title="康复治疗"
          extra={rt.poorEfficacy ? <Tag color="red">疗效不佳需复评</Tag> : <Tag color="green">有效</Tag>}
          loading={loading}
        >
          <Statistic title="最新方式" value={rt.modality ?? '—'} />
          <Statistic title="疗效" value={rt.efficacy ?? '—'} />
        </Card>
      </Col>
      <Col span={12}>
        <Card
          title="疼痛门诊"
          extra={pc.severeNrs ? <Tag color="red">重度需升级镇痛</Tag> : <Tag color="green">可控</Tag>}
          loading={loading}
        >
          <Statistic title="当前 NRS" value={pc.currentNrs ?? '—'} />
          <Statistic title="爆发痛次数" value={pc.breakthroughCount} />
        </Card>
      </Col>
    </Row>
  );
}
