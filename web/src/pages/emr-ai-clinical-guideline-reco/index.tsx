/**
 * 健澜科技 jlmedaios - 病历AI临床指南推荐前端页（M554-D，V14，EMR 深化四模块，M554 收官）
 *
 * 深海蓝VI：病历AI临床指南推荐（病历ID/科室/诊断/专科/推荐指南/版本）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiClinicalGuidelineReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  guidelineName: string;
  version: string;
}

interface RecoReport {
  guidelineName: string;
  version: string;
}

export default function EmrAiClinicalGuidelineRecoPage() {
  const [base, setBase] = useState<AiClinicalGuidelineReco | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [specialty, setSpecialty] = useState("心血管内科");
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-clinical-guideline-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 临床指南推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-clinical-guideline-reco", {
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
        message.success("临床指南推荐完成");
      } else {
        message.error("临床指南推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI临床指南推荐</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="推荐输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>诊断：</Text>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              style={{ width: 200 }}
              placeholder="如：急性心梗 / 上呼吸道感染"
            />
            <Text strong>专科：</Text>
            <Input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              style={{ width: 160 }}
            />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              推荐临床指南
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <Row gutter={24}>
              <Col span={18}>
                <Text strong style={{ fontSize: 16 }}>推荐指南：</Text>
                <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.guidelineName}
                </Tag>
              </Col>
              <Col span={6}>
                <Text strong style={{ fontSize: 16 }}>版本：</Text>
                <Tag color="purple" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.version}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
