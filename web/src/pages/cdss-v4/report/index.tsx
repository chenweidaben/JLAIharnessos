/**
 * 健澜科技 jlmedaios - CDSS V4 页（M248-A）
 *
 * 症状→疾病概率排序鉴别树/用药适应证禁忌相互作用剂量特殊人群/检查推荐指南/治疗推荐方案疗效调整/临床路径变异依从/危急值预警早期预警/采纳率准确率假阳假阴/知识库规则引擎可解释。深海蓝 VI。
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
  differential: { cases: number; topMatches: number };
  medication: { recommendations: number; interactions: number };
  testTreatment: { guideline: number; pathway: number };
  critical: { alerts: number; earlyWarning: number };
  quality: { adoption: number; accuracy: number };
  suggestions: string[];
}

export default function CDSSV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/cdss-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>CDSS V4</Title>
        <Paragraph type="secondary">症状→疾病概率排序·鉴别树 / 用药·适应证·禁忌·相互作用·剂量·特殊人群 / 检查推荐·指南 / 治疗推荐·方案·疗效调整 / 临床路径·变异·依从 / 危急值·早期预警 / 采纳率·准确率·假阳假阴 / 知识库·规则引擎·可解释</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="鉴别病例" value={data.differential.cases} /></Card></Col>
              <Col span={6}><Card><Statistic title="用药推荐" value={data.medication.recommendations} /></Card></Col>
              <Col span={6}><Card><Statistic title="采纳率" value={`${data.quality.adoption}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="准确率" value={`${data.quality.accuracy}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>CDSS 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "topMatches", name: "首诊匹配率", value: `${data.differential.topMatches}%` },
                  { key: "interactions", name: "相互作用", value: data.medication.interactions },
                  { key: "guideline", name: "指南推荐", value: data.testTreatment.guideline },
                  { key: "earlyWarning", name: "早期预警", value: data.critical.earlyWarning },
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
