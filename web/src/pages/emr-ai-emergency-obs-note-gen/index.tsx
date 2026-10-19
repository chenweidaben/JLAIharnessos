/**
 * 健澜科技 jlmedaios - 病历AI急诊留观病历生成前端页（M560-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI急诊留观病历生成（病历ID/科室/患者姓名/留观小时数/病情/自动生成记录/接诊医生）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, InputNumber, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };
const { TextArea } = Input;

interface AiEmergencyObsNoteGen {
  recordId: string;
  dept: string;
}

interface NoteResult {
  note: string;
  doctor: string;
}

interface NoteReport {
  note: string;
  doctor: string;
}

export default function EmrAiEmergencyObsNoteGenPage() {
  const [base, setBase] = useState<AiEmergencyObsNoteGen | null>(null);
  const [patientName, setPatientName] = useState("王五");
  const [observationHours, setObservationHours] = useState(6);
  const [condition, setCondition] = useState("生命体征平稳");
  const [result, setResult] = useState<NoteResult | null>(null);
  const [report, setReport] = useState<NoteReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-emergency-obs-note-gen", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 急诊留观病历生成基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doGen = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-emergency-obs-note-gen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ patientName, observationHours, condition }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("急诊留观病历生成完成");
      } else {
        message.error("急诊留观病历生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI急诊留观病历生成</Title>
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
            <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} style={{ width: 160 }} />
            <Text strong>留观小时数：</Text>
            <InputNumber min={0} value={observationHours} onChange={(v) => setObservationHours(Number(v ?? 0))} />
            <Text strong>病情：</Text>
            <Input value={condition} onChange={(e) => setCondition(e.target.value)} style={{ width: 200 }} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doGen}>
              生成留观病历
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="生成结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>自动生成记录：</Text>
              <TextArea value={report.note} readOnly autoSize={{ minRows: 2 }} style={{ marginTop: 8, fontSize: 16 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>接诊医生：</Text>
              <Tag color="purple" style={{ marginLeft: 8, fontSize: 16 }}>{report.doctor}</Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
