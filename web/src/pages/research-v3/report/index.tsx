/**
 * 健澜科技 jlmedaios - 科研创新 V3 页（M242-C）
 *
 * 国自然科技部省自然横向立项/SCI中华专利获奖成果转化/重点实验室/GCP药物器械IIT多中心/伦理经费。深海蓝 VI。
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
  grants: { nsfc: number; most: number; provincial: number; horizontal: number };
  output: { sci: number; chinese: number; patents: number; awards: number };
  platform: { keyLab: number; gcp: number; iit: number };
  ethics: number;
  funding: number;
  suggestions: string[];
}

export default function ResearchV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/research-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>科研创新 V3</Title>
        <Paragraph type="secondary">国自然·科技部·省自然·横向立项 / SCI·中华·专利·获奖·成果转化 / 重点实验室·GCP·IIT 多中心 / 伦理·经费</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国自然" value={data.grants.nsfc} /></Card></Col>
              <Col span={6}><Card><Statistic title="SCI" value={data.output.sci} /></Card></Col>
              <Col span={6}><Card><Statistic title="专利" value={data.output.patents} /></Card></Col>
              <Col span={6}><Card><Statistic title="经费(万)" value={data.funding} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>科研明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "most", name: "科技部", value: data.grants.most },
                  { key: "provincial", name: "省自然", value: data.grants.provincial },
                  { key: "keyLab", name: "重点实验室", value: data.platform.keyLab },
                  { key: "iit", name: "IIT 项目", value: data.platform.iit },
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
