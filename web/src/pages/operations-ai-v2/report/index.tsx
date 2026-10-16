/**
 * 健澜科技 jlmedaios - 运营决策智能化 V2 页（M233-C）
 *
 * 门诊量住院量手术量预测/智能排班约束优化/床位手术间调度/成本预测/供应链SPD智能/What-if仿真。深海蓝 VI。
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
  forecast: { outpatient: number; inpatient: number; surgery: number; accuracy: number };
  scheduling: { optimized: number; utilization: number };
  dispatch: { beds: number; operatingRooms: number };
  cost: { predicted: number };
  spd: { smart: boolean };
  simulation: { whatIf: boolean };
  suggestions: string[];
}

export default function OperationsAIV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/operations-ai-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>运营决策智能化 V2</Title>
        <Paragraph type="secondary">门诊·住院·手术量预测 / 智能排班约束优化 / 床位·手术间调度 / 成本预测 / SPD 智能供应链 / What-if 仿真</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="预测门诊量" value={data.forecast.outpatient} /></Card></Col>
              <Col span={6}><Card><Statistic title="预测住院量" value={data.forecast.inpatient} /></Card></Col>
              <Col span={6}><Card><Statistic title="预测手术量" value={data.forecast.surgery} /></Card></Col>
              <Col span={6}><Card><Statistic title="预测准确率" value={`${data.forecast.accuracy}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>运营 AI 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "sched", name: "优化排班数", value: data.scheduling.optimized },
                  { key: "util", name: "资源利用率", value: `${data.scheduling.utilization}%` },
                  { key: "beds", name: "可调床位", value: data.dispatch.beds },
                  { key: "spd", name: "SPD 智能供应链", value: data.spd.smart ? "已启用" : "未启用" },
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
