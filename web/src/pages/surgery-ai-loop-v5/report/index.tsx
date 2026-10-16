/**
 * 健澜科技 jlmedaios - AI 手术全流程闭环 V5 页（M258-C）
 *
 * AI术前评估麻醉风险ERAS宣教手术排程优化器械准备/Time Out麻醉深度生命体征出血量估算影像导航/PACU疼痛管理早期活动并发症预警康复路径/SSI非计划二次手术手术时长安全核查执行率/风险预测准确排程优化SSI预警闭环率。深海蓝 VI。
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
  preOp: { aiAssess: number; anesthesiaRisk: number; erasEducation: number; scheduleOptimize: number; instrument: number };
  intraOp: { timeout: number; anesthesiaDepth: number; vitals: number; bloodLoss: number; imageNav: number };
  postOp: { pacu: number; pain: number; earlyMobility: number; complicationAlert: number; rehabPath: number };
  quality: { ssi: number; unplannedReoperation: number; duration: number; timeoutExecution: number };
  aiMetrics: { riskPrediction: number; scheduleOptimize: number; ssiAlert: number; loopRate: number };
  suggestions: string[];
}

export default function SurgeryAILoopV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/surgery-ai-loop-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>AI 手术全流程闭环 V5</Title>
        <Paragraph type="secondary">AI 术前评估·麻醉风险·ERAS 宣教·排程优化·器械准备 / Time Out·麻醉深度·生命体征·出血量·影像导航 / PACU·疼痛管理·早期活动·并发症预警·康复路径 / SSI·非计划二次手术·手术时长·安全核查执行率 / 风险预测·排程优化·SSI 预警·闭环率</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="SSI 率" value={`${data.quality.ssi}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="非计划二次手术" value={`${data.quality.unplannedReoperation}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="安全核查执行率" value={`${data.quality.timeoutExecution}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="闭环率" value={`${data.aiMetrics.loopRate}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>手术明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "aiAssess", name: "AI 术前评估", value: `${data.preOp.aiAssess}%` },
                  { key: "eras", name: "ERAS 宣教", value: `${data.preOp.erasEducation}%` },
                  { key: "pacu", name: "PACU 复苏", value: `${data.postOp.pacu}%` },
                  { key: "rehab", name: "康复路径", value: `${data.postOp.rehabPath}%` },
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
