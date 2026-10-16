/**
 * 健澜科技 jlmedaios - v4.0.0 里程碑页（M231-D）
 *
 * v1.0→v4.0历程/云原生微服务/AI原生/数据原生/业务中台/AI大脑2.0/MUSE五角色/数字孪生/自学习飞轮/v4.x路线图/部署运维/团队协作。深海蓝 VI。
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
  journey: { slices: number; tests: number; milestones: number };
  architecture: { cloudNative: boolean; aiNative: boolean; dataNative: boolean; platform: boolean };
  aiBrain: { version: string; museQuintet: boolean; digitalTwin: boolean; flywheel: boolean };
  roadmap: { phases: number };
  deployment: { k8s: boolean; observability: boolean };
  team: { collaboration: string };
  suggestions: string[];
}

export default function V4MilestonePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/v4-milestone/report");
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
        <Title level={3} style={{ color: VI.deep }}>v4.0.0 里程碑</Title>
        <Paragraph type="secondary">v1.0→v4.0 历程 / 云原生·AI原生·数据原生·业务中台 / AI大脑2.0·MUSE五角色·数字孪生·自学习飞轮 / v4.x 路线图</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="累计切片" value={data.journey.slices} /></Card></Col>
              <Col span={6}><Card><Statistic title="累计测试" value={data.journey.tests} /></Card></Col>
              <Col span={6}><Card><Statistic title="AI 大脑版本" value={data.aiBrain.version} /></Card></Col>
              <Col span={6}><Card><Statistic title="v4 路线图阶段" value={data.roadmap.phases} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>v4.0 架构与能力</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "cloud", name: "云原生微服务", value: data.architecture.cloudNative ? "已实现" : "未实现" },
                  { key: "ai", name: "AI 原生", value: data.architecture.aiNative ? "已实现" : "未实现" },
                  { key: "data", name: "数据原生", value: data.architecture.dataNative ? "已实现" : "未实现" },
                  { key: "muse", name: "MUSE 五角色", value: data.aiBrain.museQuintet ? "已上线" : "未上线" },
                  { key: "twin", name: "数字孪生", value: data.aiBrain.digitalTwin ? "已建成" : "未建成" },
                  { key: "flywheel", name: "自学习飞轮", value: data.aiBrain.flywheel ? "已运转" : "未运转" },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "状态", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>后续建议</Text>}>
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
