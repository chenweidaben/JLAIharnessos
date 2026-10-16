/**
 * 健澜科技 jlmedaios - 多渠道服务整合 V5 页（M270-C）
 *
 * 线上渠道（小程序/App/公众号/网页/AI客服/视频）/线下渠道（窗口/自助机/导诊台/电话/现场/移动服务）/呼叫中心（预约/咨询/投诉/随访/满意度/工单/AI语音）/AI客服（智能问答/意图识别/转人工/知识库/7x24/多轮对话）/渠道协同（用户识别/会话接续/订单同步/跨渠道一致）/服务工单（受理/派单/处理/回访/闭环/SLA/督办）/多渠道指标（线上占比/自助率/AI解决率/等待时长/满意度）/渠道运营（流量/转化/留存/偏好/新渠道/成本）。深海蓝 VI。
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
  online: { miniProgram: number; app: number; officialAccount: number; web: number; aiCS: number; video: number };
  offline: { window: number; selfService: number; messDesk: number; phone: number; onSite: number; mobileService: number };
  callCenter: { appointment: number; consultation: number; complaint: number; followup: number; satisfaction: number; ticket: number; aiVoice: number };
  aiCS: { smartQA: number; intentRecognition: number; humanHandoff: number; knowledgeBase: number; multiTurn: number };
  collaboration: { userIdentification: number; sessionContinuation: number; orderSync: number; crossChannel: number };
  ticket: { intake: number; dispatch: number; processing: number; returnVisit: number; closedLoop: number; sla: number; supervision: number };
  metrics: { onlineRatio: number; selfServiceRate: number; aiResolutionRate: number; waitTime: number; satisfaction: number };
  ops: { traffic: number; conversion: number; retention: number; preference: number; newChannel: number; cost: number };
  suggestions: string[];
}

export default function OmnichannelV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/omnichannel-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>多渠道服务整合 V5</Title>
        <Paragraph type="secondary">线上渠道·小程序·App·公众号·网页·AI客服·视频 / 线下渠道·窗口·自助机·导诊台·电话·现场·移动服务 / 呼叫中心·预约·咨询·投诉·随访·满意度·工单·AI语音</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="线上占比" value={`${data.metrics.onlineRatio}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="自助率" value={`${data.metrics.selfServiceRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="AI解决率" value={`${data.metrics.aiResolutionRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="等待时长" value={`${data.metrics.waitTime}s`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>渠道明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "mp", name: "小程序", value: `${data.online.miniProgram}%` },
                  { key: "self", name: "自助机", value: `${data.offline.selfService}%` },
                  { key: "ai", name: "AI客服", value: `${data.aiCS.smartQA}%` },
                  { key: "ticket", name: "工单闭环", value: `${data.ticket.closedLoop}%` },
                ]}
                columns={[
                  { title: "渠道", dataIndex: "name", key: "name" },
                  { title: "使用率", dataIndex: "value", key: "value" },
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
