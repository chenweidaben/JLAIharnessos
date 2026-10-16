/**
 * 健澜科技 jlmedaios - 人才队伍 V3 页（M242-B）
 *
 * 院士长江杰青领军人才/科主任学科带头人后备任期考核/青苗中青年/PICC专科护士/技师/管理EMBA/九宫格盘点。深海蓝 VI。
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
  leaders: { academician: number; yangtze: number; distinguished: number };
  backup: { director: number; academic: number };
  young: number;
  specialty: { nurse: number; tech: number; emba: number };
  suggestions: string[];
}

export default function TalentV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/talent-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>人才队伍 V3</Title>
        <Paragraph type="secondary">院士·长江·杰青领军人才 / 科主任·学科带头人后备任期考核 / 青苗中青年 / PICC 专科护士·技师·管理 EMBA / 九宫格盘点</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="院士" value={data.leaders.academician} /></Card></Col>
              <Col span={6}><Card><Statistic title="长江" value={data.leaders.yangtze} /></Card></Col>
              <Col span={6}><Card><Statistic title="杰青" value={data.leaders.distinguished} /></Card></Col>
              <Col span={6}><Card><Statistic title="青苗" value={data.young} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>人才明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "director", name: "科主任后备", value: data.backup.director },
                  { key: "academic", name: "学科带头人后备", value: data.backup.academic },
                  { key: "nurse", name: "专科护士", value: data.specialty.nurse },
                  { key: "emba", name: "管理 EMBA", value: data.specialty.emba },
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
