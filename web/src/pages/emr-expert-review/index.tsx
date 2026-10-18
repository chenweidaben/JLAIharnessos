/**
 * 健澜科技 jlmedaios - 病历质控专家在线评审前端页（M471-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：评审队列列表 + 打分表单（1-10 滑块 + 评语输入）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Slider, Spin, Statistic, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Aggregated {
  caseId: string;
  avgScore: number;
}

export default function EmrExpertReviewPage() {
  const [loading, setLoading] = useState(true);
  const [aggregated, setAggregated] = useState<Aggregated[]>([]);
  const [score, setScore] = useState(85);
  const [comment, setComment] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-expert-review", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setAggregated(data?.aggregated ?? []);
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
        <Title level={3} style={{ color: VI.deep }}>病历质控专家在线评审</Title>
        <Card title="评审队列（平均分）" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <Spin spinning={loading}>
            <List
              dataSource={aggregated}
              renderItem={(item: Aggregated) => (
                <List.Item>
                  <Tag color="blue">病例 {item.caseId}</Tag>
                  <Statistic title="平均分" value={item.avgScore} precision={1} style={{ marginLeft: 16 }} />
                </List.Item>
              )}
            />
          </Spin>
        </Card>
        <Card title="打分表单" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Text>评分（0-100）：</Text>
          <Slider min={0} max={100} value={score} onChange={(v) => setScore(v)} style={{ maxWidth: 400 }} />
          <Text strong>{score} 分</Text>
          <Input.TextArea
            rows={3}
            placeholder="请输入评审评语..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ marginTop: 16, maxWidth: 400 }}
          />
          <Button type="primary" style={{ marginTop: 16, background: VI.accent }}>
            提交评审
          </Button>
        </Card>
      </Content>
    </Layout>
  );
}
