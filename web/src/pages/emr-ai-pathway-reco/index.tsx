/**
 * 健澜科技 jlmedaios - 病历AI临床路径推荐前端页（M546-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI临床路径推荐（病历ID/科室/诊断/推荐路径/预计天数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiPathwayReco {
  recordId: string;
  dept: string;
}

interface PathwayResult {
  pathwayName: string;
  days: number;
}

interface PathwayReport {
  pathwayName: string;
  days: number;
}

export default function EmrAiPathwayRecoPage() {
  const [base, setBase] = useState<AiPathwayReco | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [result, setResult] = useState<PathwayResult | null>(null);
  const [report, setReport] = useState<PathwayReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-pathway-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 临床路径推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doRecommend = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-pathway-reco", {
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
        message.success("路径推荐生成完成");
      } else {
        message.error("路径推荐生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI临床路径推荐</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="路径推荐输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>诊断：</Text>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 300, marginLeft: 8 }} />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRecommend}>
            生成路径推荐
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="路径推荐结果">
            <Row gutter={24}>
              <Col span={16}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>推荐路径：</Text>
                  <Tag color={report.pathwayName.includes("心梗") ? "red" : "blue"} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.pathwayName}
                  </Tag>
                </div>
              </Col>
              <Col span={8}>
                <Statistic title="预计天数" value={report.days} suffix="天" valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
