/**
 * 健澜科技 jlmedaios - 环节质控前端页（M481-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：环节质控步骤（入院记录/首次病程/日常病程/出院记录各评分）+ 平均分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Progress, Row, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface StageItem {
  name: string;
  score: number;
}

interface StageResult {
  avgScore: number;
  passed: boolean;
}

export default function EmrStageQcPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StageItem[]>([]);
  const [result, setResult] = useState<StageResult>({ avgScore: 0, passed: false });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-stage-qc", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setItems(data?.items ?? []);
            setResult(data?.result ?? { avgScore: 0, passed: false });
          }
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>环节质控</Title>
        <Spin spinning={loading}>
          <Card title="各环节评分" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            <List
              dataSource={items}
              renderItem={(item: StageItem) => (
                <List.Item>
                  <Text strong style={{ width: 120 }}>{item.name}</Text>
                  <Progress percent={item.score} strokeColor={VI.accent} style={{ width: 300, marginRight: 16 }} />
                  <Text>{item.score} 分</Text>
                </List.Item>
              )}
            />
          </Card>
          <Card title="综合评价" headStyle={{ background: VI.mid, color: "#fff" }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>平均分：</Text>
                <Text style={{ color: VI.accent, fontSize: 28, marginLeft: 8 }}>{result.avgScore.toFixed(1)}</Text>
              </Col>
              <Col span={12}>
                <Text strong>是否通过：</Text>
                {result.passed ? (
                  <Tag color="green" style={{ fontSize: 14, padding: 8, marginLeft: 8 }}>√ 通过</Tag>
                ) : (
                  <Tag color="red" style={{ fontSize: 14, padding: 8, marginLeft: 8 }}>✗ 未通过</Tag>
                )}
              </Col>
            </Row>
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
