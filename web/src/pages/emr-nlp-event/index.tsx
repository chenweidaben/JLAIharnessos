/**
 * 健澜科技 jlmedaios - NLP 病历事件提取前端页（M490-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历正文 TextArea + 事件列表（入院蓝/手术红/用药绿/出院橙 Tag）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface NlpEventResult {
  events: string[];
}

interface NlpEventReport {
  eventCount: number;
}

const eventTagColor = (event: string): string => {
  if (event === "入院") return "blue";
  if (event === "手术") return "red";
  if (event === "用药") return "green";
  if (event === "出院") return "orange";
  return "default";
};

export default function EmrNlpEventPage() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<NlpEventResult | null>(null);
  const [report, setReport] = useState<NlpEventReport | null>(null);

  const extract = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-event", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("事件提取完成");
      }
    } catch {
      message.error("事件提取失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>NLP 病历事件提取</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="病历正文">
          <TextArea
            rows={6}
            placeholder="请输入病历正文（如：患者入院后行阑尾切除术，术后用药抗感染，出院时恢复良好）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={extract} style={{ background: VI.accent }}>
            提取事件
          </Button>
        </Card>
        {result && (
          <Card style={{ marginTop: 16 }}>
            <Text strong>识别结果（共 {report?.eventCount ?? 0} 个事件）：</Text>
            <br />
            {result.events.map((e) => (
              <Tag key={e} color={eventTagColor(e)} style={{ marginBottom: 8 }}>
                {e}
              </Tag>
            ))}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
