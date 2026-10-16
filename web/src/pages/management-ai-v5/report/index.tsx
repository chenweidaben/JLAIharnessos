/**
 * 健澜科技 jlmedaios - AI 管理决策助手 V5 页（M259-D）
 *
 * 门诊住院手术医技财务人力AI异常发现根因/床位手术间人力设备物资AI优化仿真模拟/财务风险医疗风险运营风险舆情风险合规风险/What-if政策模拟投资测算人事调整疫情应对/院长周报月报季报年报专题分析AI起草/议程纪要决议追踪待办提醒会前材料自动生成/决策采纳预警准确响应速度管理效率满意度。深海蓝 VI。
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
  insight: { outpatient: number; inpatient: number; surgery: number; lab: number; finance: number; hr: number; anomaly: number; rootCause: number };
  scheduling: { bed: number; or: number; staff: number; equipment: number; supplies: number; optimize: number; simulation: number };
  risk: { financial: number; medical: number; operational: number; publicOpinion: number; compliance: number };
  simulation: { whatif: number; policy: number; investment: number; hr: number; pandemic: number };
  report: { weekly: number; monthly: number; quarterly: number; yearly: number; special: number; draft: number };
  meeting: { agenda: number; minutes: number; resolution: number; tracking: number; todo: number; preMaterial: number };
  aiMetrics: { decisionAdoption: number; alertAccuracy: number; responseSpeed: number; efficiency: number; satisfaction: number };
  suggestions: string[];
}

export default function ManagementAIV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/management-ai-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>AI 管理决策助手 V5</Title>
        <Paragraph type="secondary">门诊·住院·手术·医技·财务·人力·AI 异常发现·根因 / 床位·手术间·人力·设备·物资·AI 优化·仿真模拟 / 财务·医疗·运营·舆情·合规风险 / What-if·政策模拟·投资测算·人事调整·疫情应对 / 院长周报·月报·季报·年报·专题·AI 起草 / 议程·纪要·决议追踪·待办提醒·会前材料</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="异常发现" value={data.insight.anomaly} /></Card></Col>
              <Col span={6}><Card><Statistic title="决策采纳率" value={`${data.aiMetrics.decisionAdoption}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="预警准确率" value={`${data.aiMetrics.alertAccuracy}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.aiMetrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>管理明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "bed", name: "床位优化", value: `${data.scheduling.bed}%` },
                  { key: "whatif", name: "What-if 模拟", value: data.simulation.whatif },
                  { key: "draft", name: "AI 报告起草", value: `${data.report.draft}%` },
                  { key: "todo", name: "待办提醒", value: data.meeting.todo },
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
