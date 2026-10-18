/**
 * 健澜科技 jlmedaios - 病历AI诊断编码建议前端页（M544-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI诊断编码建议（病历ID/科室/诊断描述/ICD编码/置信度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDxCoding {
  recordId: string;
  dept: string;
}

interface CodingResult {
  icdCode: string;
  confidence: number;
}

interface CodingReport {
  icdCode: string;
  confidence: number;
}

export default function EmrAiDxCodingPage() {
  const [base, setBase] = useState<AiDxCoding | null>(null);
  const [diagnosis, setDiagnosis] = useState("社区获得性肺炎");
  const [result, setResult] = useState<CodingResult | null>(null);
  const [report, setReport] = useState<CodingReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-dx-coding", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 诊断编码基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doSuggest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-dx-coding", {
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
        message.success("编码建议生成完成");
      } else {
        message.error("编码建议生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI诊断编码建议</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="编码输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>诊断描述：</Text>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 300, marginLeft: 8 }} />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSuggest}>
            生成编码建议
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="编码建议结果">
            <Row gutter={24}>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>ICD编码：</Text>
                  <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 18, padding: "4px 12px" }}>
                    {report.icdCode}
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <Statistic title="置信度" value={report.confidence} precision={2} valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
