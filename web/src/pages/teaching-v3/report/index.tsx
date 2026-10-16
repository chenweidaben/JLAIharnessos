/**
 * 健澜科技 jlmedaios - 教学培训 V3 页（M242-D）
 *
 * 住培基地专业学员师资结业/博硕士点导师招生培养学位/I-II类继教学分/OSCE教学查房/岗前培训。深海蓝 VI。
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
  residency: { bases: number; students: number; faculty: number; graduated: number };
  graduate: { phd: number; master: number; supervisors: number };
  cme: { type1: number; type2: number; credits: number };
  orientation: number;
  suggestions: string[];
}

export default function TeachingV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/teaching-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>教学培训 V3</Title>
        <Paragraph type="secondary">住培基地·专业·学员·师资·结业 / 博硕士点·导师·招生·培养·学位 / I-II 类继教学分 / OSCE·教学查房 / 岗前培训</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="住培基地" value={data.residency.bases} /></Card></Col>
              <Col span={6}><Card><Statistic title="住培学员" value={data.residency.students} /></Card></Col>
              <Col span={6}><Card><Statistic title="博导" value={data.graduate.supervisors} /></Card></Col>
              <Col span={6}><Card><Statistic title="继教学分" value={data.cme.credits} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>教学明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "phd", name: "博士生", value: data.graduate.phd },
                  { key: "master", name: "硕士生", value: data.graduate.master },
                  { key: "type1", name: "I 类学分", value: data.cme.type1 },
                  { key: "orientation", name: "岗前培训", value: data.orientation },
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
