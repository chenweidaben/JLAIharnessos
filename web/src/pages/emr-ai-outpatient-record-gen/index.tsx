/**
 * 健澜科技 jlmedaios - 病历AI门诊病历智能生成前端页（M558-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI门诊病历智能生成（病历ID/科室/患者姓名/主诉/诊断/自动生成病历/接诊医生）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiOutpatientRecordGen {
  recordId: string;
  dept: string;
}

interface GenResult {
  record: string;
  doctor: string;
}

interface GenReport {
  record: string;
  doctor: string;
}

export default function EmrAiOutpatientRecordGenPage() {
  const [base, setBase] = useState<AiOutpatientRecordGen | null>(null);
  const [patientName, setPatientName] = useState("王五");
  const [symptom, setSymptom] = useState("咳嗽3天");
  const [diagnosis, setDiagnosis] = useState("急性支气管炎");
  const [result, setResult] = useState<GenResult | null>(null);
  const [report, setReport] = useState<GenReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-outpatient-record-gen", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 门诊病历智能生成基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doGen = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-outpatient-record-gen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ patientName, symptom, diagnosis }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("门诊病历生成完成");
      } else {
        message.error("门诊病历生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI门诊病历智能生成</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="生成输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>患者姓名：</Text>
            <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} style={{ width: 120 }} />
            <Text strong>主诉：</Text>
            <Input value={symptom} onChange={(e) => setSymptom(e.target.value)} style={{ width: 180 }} />
            <Text strong>诊断：</Text>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 200 }} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doGen}>
              生成门诊病历
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="生成结果">
            <Row gutter={24}>
              <Col span={16}>
                <Text strong style={{ fontSize: 14 }}>自动生成病历：</Text>
                <Card type="inner" size="small" style={{ marginTop: 8, background: "#fff" }}>
                  <Text style={{ fontSize: 14, lineHeight: 1.8 }}>{report.record}</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: 14 }}>接诊医生：</Text>
                <Card type="inner" size="small" style={{ marginTop: 8, background: "#fff" }}>
                  <Tag color="geekblue" style={{ fontSize: 14 }}>{report.doctor}</Tag>
                </Card>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
