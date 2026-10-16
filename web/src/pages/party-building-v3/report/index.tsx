/**
 * 健澜科技 jlmedaios - 党建 V3 页（M245-A）
 *
 * 党委党总支党支部换届三会一课/发展党员教育积分党费流动党员/理论学习主题教育意识形态/八项规定廉洁行医/纪检四种形态/党建+业务。深海蓝 VI。
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
  organization: { committee: number; branch: number; partyMembers: number };
  development: { newMembers: number; activists: number; points: number };
  ideology: { study: number; themeEducation: number };
  discipline: { fourForms: number; integrity: number };
  suggestions: string[];
}

export default function PartyBuildingV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/party-building-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>党建 V3</Title>
        <Paragraph type="secondary">党委·党总支·党支部换届·三会一课 / 发展党员·教育积分·党费·流动党员 / 理论学习·主题教育·意识形态 / 八项规定·廉洁行医 / 纪检四种形态 / 党建+业务</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="党支部" value={data.organization.branch} /></Card></Col>
              <Col span={6}><Card><Statistic title="党员" value={data.organization.partyMembers} /></Card></Col>
              <Col span={6}><Card><Statistic title="新发展" value={data.development.newMembers} /></Card></Col>
              <Col span={6}><Card><Statistic title="理论学习(次)" value={data.ideology.study} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>党建明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "activists", name: "入党积极分子", value: data.development.activists },
                  { key: "points", name: "党员积分", value: data.development.points },
                  { key: "themeEducation", name: "主题教育", value: data.ideology.themeEducation },
                  { key: "fourForms", name: "四种形态", value: data.discipline.fourForms },
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
