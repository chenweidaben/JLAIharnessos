/**
 * 健澜科技 jlmedaios - 病历AI医嘱推荐前端页（M546-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI医嘱推荐（病历ID/科室/诊断/推荐医嘱列表/医嘱数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiOrderReco {
  recordId: string;
  dept: string;
}

interface OrderResult {
  orders: string[];
  count: number;
}

interface OrderReport {
  orders: string[];
  count: number;
}

export default function EmrAiOrderRecoPage() {
  const [base, setBase] = useState<AiOrderReco | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [report, setReport] = useState<OrderReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-order-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 医嘱推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doRecommend = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-order-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("医嘱推荐生成完成");
      } else {
        message.error("医嘱推荐生成失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历AI医嘱推荐</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="医嘱输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>诊断：</Text>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 300, marginLeft: 8 }} />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRecommend}>
            生成医嘱推荐
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="医嘱推荐结果">
            <Row gutter={24}>
              <Col span={16}>
                <List
                  size="small"
                  dataSource={report.orders}
                  renderItem={(item, index) => (
                    <List.Item>
                      <Tag color={index < 3 ? "green" : "default"} style={{ marginRight: 8 }}>
                        医嘱{index + 1}
                      </Tag>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </Col>
              <Col span={8}>
                <Statistic title="医嘱数" value={report.count} valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
