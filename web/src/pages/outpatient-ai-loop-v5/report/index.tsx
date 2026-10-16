/**
 * 健澜科技 jlmedaios - AI 门诊全流程闭环 V5 页（M258-A）
 *
 * AI预问诊智能预约分时段资料准备到院提醒交通/智能分诊AI导诊医生站AI辅助诊间结算移动支付/报告解读AI用药指导复诊预约慢病随访满意度/候诊时长复诊率处方合理检查阳性投诉率/预问诊采纳率分诊准确率导诊解决率闭环完成率。深海蓝 VI。
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
  preConsult: { preTriage: number; smartBooking: number; timeSlot: number; prep: number; reminder: number; transport: number };
  inVisit: { smartTriage: number; aiGuide: number; doctorStation: number; settle: number; mobilePay: number };
  postConsult: { reportInterpret: number; medGuide: number; rebook: number; followup: number; satisfaction: number };
  quality: { waitTime: number; revisitRate: number; rxRational: number; examPositive: number; complaint: number };
  aiMetrics: { preconsultAdoption: number; triageAccuracy: number; guideResolution: number; loopComplete: number };
  suggestions: string[];
}

export default function OutpatientAILoopV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/outpatient-ai-loop-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>AI 门诊全流程闭环 V5</Title>
        <Paragraph type="secondary">AI 预问诊·智能预约·分时段·资料准备·到院提醒 / 智能分诊·AI 导诊·医生站·诊间结算·移动支付 / 报告解读·AI 用药指导·复诊预约·慢病随访 / 候诊时长·复诊率·处方合理·检查阳性 / 预问诊采纳率·分诊准确率·导诊解决率·闭环完成率</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="预问诊" value={data.preConsult.preTriage} /></Card></Col>
              <Col span={6}><Card><Statistic title="候诊时长" value={data.quality.waitTime} suffix="分钟" /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.postConsult.satisfaction}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="闭环完成率" value={`${data.aiMetrics.loopComplete}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>闭环明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "adoption", name: "预问诊采纳率", value: `${data.aiMetrics.preconsultAdoption}%` },
                  { key: "triage", name: "分诊准确率", value: `${data.aiMetrics.triageAccuracy}%` },
                  { key: "guide", name: "导诊解决率", value: `${data.aiMetrics.guideResolution}%` },
                  { key: "complaint", name: "投诉率", value: `${data.quality.complaint}%` },
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
