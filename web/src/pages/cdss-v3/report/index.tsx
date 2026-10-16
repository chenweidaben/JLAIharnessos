/**
 * 健澜科技 jlmedaios - CDSS V3 页（M238-A）
 *
 * 症状→疾病鉴别/概率排序/用药适应证禁忌相互作用剂量/检查治疗指南推荐/临床路径变异/危急值预警。深海蓝 VI。
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
  differential: { cases: number; top3: number };
  drug: { indication: number; interaction: number; dosage: number };
  guideline: { recommendation: number; pathwayVariation: number };
  critical: { alert: number };
  adoption: { rate: number; a_b_test: boolean };
  suggestions: string[];
}

export default function CDSSV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/cdss-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>CDSS 临床决策支持 V3</Title>
        <Paragraph type="secondary">症状→疾病鉴别·概率排序 / 用药适应证·禁忌·相互作用·剂量 / 检查治疗指南推荐·临床路径变异 / 危急值预警</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="鉴别病例" value={data.differential.cases} /></Card></Col>
              <Col span={6}><Card><Statistic title="用药推荐" value={data.drug.indication} /></Card></Col>
              <Col span={6}><Card><Statistic title="指南推荐" value={data.guideline.recommendation} /></Card></Col>
              <Col span={6}><Card><Statistic title="采纳率 (%)" value={data.adoption.rate} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>CDSS 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "interaction", name: "相互作用提醒", value: data.drug.interaction },
                  { key: "variation", name: "路径变异", value: data.guideline.pathwayVariation },
                  { key: "critical", name: "危急值预警", value: data.critical.alert },
                  { key: "ab", name: "A/B 测试", value: data.adoption.a_b_test ? "已开展" : "未开展" },
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
