/**
 * 健澜科技 jlmedaios - 病历AI知识推荐前端页（M543-D，V14，EMR 深化四模块，M543 收官）
 *
 * 深海蓝VI：病历AI知识推荐（病历ID/科室/诊断/专科/推荐文献列表/推荐数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiKnowledgeReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  recommendations: string[];
  count: number;
}

interface RecoReport {
  recommendations: string[];
  count: number;
}

export default function EmrAiKnowledgeRecoPage() {
  const [base, setBase] = useState<AiKnowledgeReco | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心肌梗死");
  const [specialty, setSpecialty] = useState("心内科");
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-knowledge-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 知识推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doRecommend = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-knowledge-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, specialty }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("推荐完成");
      } else {
        message.error("推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI知识推荐</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="推荐输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>诊断：</Text>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>专科：</Text>
              <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={{ width: 140, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRecommend}>
            生成推荐
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <Row gutter={24}>
              <Col span={16}>
                <List
                  size="small"
                  dataSource={report.recommendations}
                  renderItem={(item) => (
                    <List.Item>
                      <Tag color={item.includes("心梗") ? "red" : "blue"} style={{ marginRight: 8 }}>
                        推荐文献
                      </Tag>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </Col>
              <Col span={8}>
                <Statistic title="推荐数" value={report.count} valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
