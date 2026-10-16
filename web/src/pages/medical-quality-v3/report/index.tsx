/**
 * 健澜科技 jlmedaios - 医疗质量 V3 页（M241-B）
 *
 * 国家医疗质量指标/单病种质控/临床路径入径完成变异率/急性心梗脑卒中肺炎围术期/抗菌药合理用药点评。深海蓝 VI。
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
  national: { indicators: number; reach: number };
  single: { ami: number; stroke: number; pneumonia: number; periOp: number };
  pathway: { enrolled: number; completion: number };
  antimicrobial: { reviewed: number; irrational: number };
  suggestions: string[];
}

export default function MedicalQualityV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/medical-quality-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>医疗质量 V3</Title>
        <Paragraph type="secondary">国家医疗质量指标 / 单病种质控 / 临床路径入径完成·变异率 / 急性心梗·脑卒中·肺炎·围术期 / 抗菌药合理用药点评</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国家指标" value={data.national.indicators} /></Card></Col>
              <Col span={6}><Card><Statistic title="路径入径" value={data.pathway.enrolled} /></Card></Col>
              <Col span={6}><Card><Statistic title="抗菌药点评" value={data.antimicrobial.reviewed} /></Card></Col>
              <Col span={6}><Card><Statistic title="围术期" value={data.single.periOp} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>质量明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "ami", name: "急性心梗", value: data.single.ami },
                  { key: "stroke", name: "脑卒中", value: data.single.stroke },
                  { key: "pneumonia", name: "肺炎", value: data.single.pneumonia },
                  { key: "irrational", name: "不合理用药", value: data.antimicrobial.irrational },
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
