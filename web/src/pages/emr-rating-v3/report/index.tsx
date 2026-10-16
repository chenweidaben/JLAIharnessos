/**
 * 健澜科技 jlmedaios - EMR 评级 V3 页（M231-C）
 *
 * EMR 6级全数据闭环/7级大数据AI辅助/8级完全智能化持续学习/闭环医嘱/CDSS/科研数据库/RWE。深海蓝 VI。
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
  level6: { closedLoop: boolean };
  level7: { aiAssisted: boolean; bigData: boolean };
  level8: { intelligent: boolean; selfLearning: boolean };
  closedLoop: { orders: number };
  cdss: { coverage: number };
  researchDB: { built: boolean };
  rwe: { enabled: boolean };
  evaluation: { score: number };
  suggestions: string[];
}

export default function EMRRatingV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/emr-rating-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>EMR 评级 V3</Title>
        <Paragraph type="secondary">6级全数据闭环 / 7级大数据AI辅助 / 8级完全智能化持续学习 / 闭环医嘱·CDSS·科研数据库·RWE</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="闭环医嘱数" value={data.closedLoop.orders} /></Card></Col>
              <Col span={6}><Card><Statistic title="CDSS 覆盖率" value={`${data.cdss.coverage}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="测评得分" value={data.evaluation.score} /></Card></Col>
              <Col span={6}><Card><Statistic title="RWE" value={data.rwe.enabled ? "已启用" : "未启用"} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>等级能力明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "l6", name: "6级 全数据闭环", value: data.level6.closedLoop ? "已达成" : "未达成" },
                  { key: "l7", name: "7级 大数据AI辅助", value: data.level7.aiAssisted ? "已达成" : "未达成" },
                  { key: "l8", name: "8级 完全智能化", value: data.level8.intelligent ? "已达成" : "未达成" },
                  { key: "research", name: "科研数据库", value: data.researchDB.built ? "已建成" : "未建成" },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "状态", dataIndex: "value", key: "value" },
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
