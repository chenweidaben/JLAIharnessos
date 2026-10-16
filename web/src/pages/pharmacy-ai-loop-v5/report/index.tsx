/**
 * 健澜科技 jlmedaios - AI 药事全流程闭环 V5 页（M258-D）
 *
 * AI前置审核相互作用剂量特殊人群合理用药/PIVAS智能摆药核对发药用药交代/服药提醒依从性不良反应监测血药浓度疗效跟踪/TDM疗程结束药物重整停药评估/处方合格率ADR上报率抗菌DDD不合理处方拦截/审核拦截准确依从性提升ADR早发现闭环率。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  preReview: { aiReview: number; interaction: number; dose: number; specialPop: number; rationalUse: number };
  pivas: { smartDispense: number; check: number; handover: number; counseling: number };
  medication: { medReminder: number; adherence: number; adrMonitor: number; tdm: number; efficacyTrack: number };
  stop: { discontinue: number; adjust: number; tdmFollow: number; courseEnd: number; medReconciliation: number; stopEval: number };
  quality: { rxPass: number; adrReport: number; antibioticDdd: number; unreasonableIntercept: number };
  aiMetrics: { reviewAccuracy: number; adherenceImprove: number; adrEarly: number; loopRate: number };
  suggestions: string[];
}

export default function PharmacyAILoopV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/pharmacy-ai-loop-v5/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI 药事全流程闭环 V5</Title>
        <Paragraph type="secondary">AI 前置审核·相互作用·剂量·特殊人群·合理用药 / PIVAS 智能摆药·核对·发药·用药交代 / 服药提醒·依从性·ADR 监测·TDM·疗效跟踪 / 停药调整·TDM 随访·疗程结束·药物重整·停药评估 / 处方合格率·ADR 上报率·抗菌 DDD·不合理拦截 / 审核拦截准确·依从性提升·ADR 早发现·闭环率</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="处方合格率" value={`${data.quality.rxPass}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="不合理拦截" value={`${data.quality.unreasonableIntercept}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="依从性提升" value={`${data.aiMetrics.adherenceImprove}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="闭环率" value={`${data.aiMetrics.loopRate}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>药事明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "aiReview", name: "AI 前置审核", value: `${data.preReview.aiReview}%` },
                  { key: "check", name: "PIVAS 核对", value: `${data.pivas.check}%` },
                  { key: "adr", name: "ADR 监测", value: `${data.medication.adrMonitor}%` },
                  { key: "reconciliation", name: "药物重整", value: `${data.stop.medReconciliation}%` },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
