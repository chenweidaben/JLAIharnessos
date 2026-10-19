/**
 * 健澜科技 jlmedaios - 病历AI护理记录生成前端页（M557-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI护理记录生成（病历ID/科室/患者姓名/病区/生命体征/自动生成记录/记录人）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiNursingNoteGen {
  recordId: string;
  dept: string;
}

interface GenResult {
  note: string;
  recorder: string;
}

interface GenReport {
  note: string;
  recorder: string;
}

export default function EmrAiNursingNoteGenPage() {
  const [base, setBase] = useState<AiNursingNoteGen | null>(null);
  const [patientName, setPatientName] = useState("张三");
  const [ward, setWard] = useState("心内科");
  const [vitalSigns, setVitalSigns] = useState("T36.5℃ P78次/分 R18次/分 BP120/80mmHg");
  const [result, setResult] = useState<GenResult | null>(null);
  const [report, setReport] = useState<GenReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-nursing-note-gen", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 护理记录生成基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doGen = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-nursing-note-gen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ patientName, ward, vitalSigns }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("护理记录生成完成");
      } else {
        message.error("护理记录生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI护理记录生成</Title>
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
            <Text strong>病区：</Text>
            <Input value={ward} onChange={(e) => setWard(e.target.value)} style={{ width: 140 }} />
            <Text strong>生命体征：</Text>
            <Input value={vitalSigns} onChange={(e) => setVitalSigns(e.target.value)} style={{ width: 320 }} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doGen}>
              生成护理记录
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="生成结果">
            <Row gutter={24}>
              <Col span={16}>
                <Text strong style={{ fontSize: 14 }}>自动生成记录：</Text>
                <Card type="inner" size="small" style={{ marginTop: 8, background: "#fff" }}>
                  <Text style={{ fontSize: 14, lineHeight: 1.8 }}>{report.note}</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: 14 }}>记录人：</Text>
                <Card type="inner" size="small" style={{ marginTop: 8, background: "#fff" }}>
                  <Tag color="geekblue" style={{ fontSize: 14 }}>{report.recorder}</Tag>
                </Card>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
