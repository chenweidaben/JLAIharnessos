/**
 * 健澜科技 jlmedaios - 病历质控满意度调查前端页（M469-D，V14，EMR 深化四模块，M469 收官）
 *
 * 深海蓝VI：问卷表单（科室+评分滑块）+ 满意度统计卡片。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Select, Spin, Statistic, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SatisfactionAggregated {
  dept: string;
  avgScore: number;
  count: number;
}

export default function EmrSatisfactionPage() {
  const [loading, setLoading] = useState(true);
  const [aggregated, setAggregated] = useState<SatisfactionAggregated[]>([]);
  const [dept, setDept] = useState("内科");
  const [score, setScore] = useState(90);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-satisfaction", {
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
        <Title level={3} style={{ color: VI.deep }}>病历质控满意度调查</Title>
        <Row gutter={16}>
          <Col span={10}>
            <Card title="提交问卷" headStyle={{ background: VI.mid, color: "#fff" }}>
              <Text strong>科室：</Text>
              <Select
                value={dept}
                onChange={setDept}
                style={{ width: "100%", marginTop: 8, marginBottom: 16 }}
                options={[
                  { value: "内科", label: "内科" },
                  { value: "外科", label: "外科" },
                  { value: "儿科", label: "儿科" },
                ]}
              />
              <Text strong>评分（0-100）：</Text>
              <InputNumber
                min={0}
                max={100}
                value={score}
                onChange={(v) => setScore(v ?? 0)}
                style={{ width: "100%", marginTop: 8 }}
              />
              <Button type="primary" style={{ marginTop: 16, background: VI.accent }}>
                提交问卷
              </Button>
            </Card>
          </Col>
          <Col span={14}>
            <Card title="满意度统计（按科室）" headStyle={{ background: VI.mid, color: "#fff" }}>
              <Spin spinning={loading}>
                <Row gutter={16}>
                  {aggregated.map((item) => (
                    <Col span={8} key={item.dept}>
                      <Card size="small">
                        <Tag color="blue">{item.dept}</Tag>
                        <Statistic title="平均分" value={item.avgScore} precision={1} />
                        <Text type="secondary">答卷数：{item.count}</Text>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Spin>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
