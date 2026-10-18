/**
 * 健澜科技 jlmedaios - NLP 病历实体识别前端页（M490-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历正文 TextArea + 实体标注结果（疾病红/症状橙/药物蓝 Tag）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface NlpEntityResult {
  entities: string[];
}

interface NlpEntityReport {
  entityCount: number;
}

const diseaseEntities = ["糖尿病", "高血压", "冠心病", "肺炎", "胃炎"];
const symptomEntities = ["头痛", "发热", "咳嗽", "腹痛", "恶心"];

const entityTagColor = (entity: string): string => {
  if (diseaseEntities.includes(entity)) return "red";
  if (symptomEntities.includes(entity)) return "orange";
  return "blue";
};

export default function EmrNlpEntityPage() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<NlpEntityResult | null>(null);
  const [report, setReport] = useState<NlpEntityReport | null>(null);

  const extract = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-entity", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("实体识别完成");
      }
    } catch {
      message.error("实体识别失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>NLP 病历实体识别</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="病历正文">
          <TextArea
            rows={6}
            placeholder="请输入病历正文（如：患者糖尿病病史5年，近期头痛，服用二甲双胍治疗）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={extract} style={{ background: VI.accent }}>
            识别实体
          </Button>
        </Card>
        {result && (
          <Card style={{ marginTop: 16 }}>
            <Text strong>识别结果（共 {report?.entityCount ?? 0} 个实体）：</Text>
            <br />
            {result.entities.map((e) => (
              <Tag key={e} color={entityTagColor(e)} style={{ marginBottom: 8 }}>
                {e}
              </Tag>
            ))}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
