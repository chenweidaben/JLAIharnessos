/**
 * 健澜科技 jlmedaios - 学科建设 V3 页（M242-A）
 *
 * 国家/省级临床重点专科申报建设验收/胸痛卒中创伤危重孕产妇新生儿专病中心/MDT多学科门诊/大学科群医工交叉/亚专科。深海蓝 VI。
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
  keySpecialty: { national: number; provincial: number };
  centers: { chest: number; stroke: number; trauma: number; maternity: number };
  mdt: { clinics: number; teams: number };
  clusters: number;
  subspecialties: number;
  suggestions: string[];
}

export default function DisciplineV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/discipline-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>学科建设 V3</Title>
        <Paragraph type="secondary">国家·省级临床重点专科 / 胸痛·卒中·创伤·危重孕产妇·新生儿专病中心 / MDT 多学科门诊 / 大学科群·医工交叉 / 亚专科</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国家级重点专科" value={data.keySpecialty.national} /></Card></Col>
              <Col span={6}><Card><Statistic title="省级重点专科" value={data.keySpecialty.provincial} /></Card></Col>
              <Col span={6}><Card><Statistic title="MDT 门诊" value={data.mdt.clinics} /></Card></Col>
              <Col span={6}><Card><Statistic title="亚专科" value={data.subspecialties} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>学科明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "chest", name: "胸痛中心", value: data.centers.chest },
                  { key: "stroke", name: "卒中中心", value: data.centers.stroke },
                  { key: "trauma", name: "创伤中心", value: data.centers.trauma },
                  { key: "clusters", name: "大学科群", value: data.clusters },
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
