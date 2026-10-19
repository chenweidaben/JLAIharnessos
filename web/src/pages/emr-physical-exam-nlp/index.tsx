/**
 * 健澜科技 jlmedaios - 病历体格检查 NLP 提取前端页（M530-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历体格检查NLP提取（病历ID/科室/原始文本/体征列表/体征数/是否异常）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PhysicalExamNlp {
  recordId: string;
  dept: string;
}

interface NlpResult {
  vitalSigns: string[];
  hasAbnormal: boolean;
}

interface NlpReport {
  vitalSignCount: number;
  hasAbnormal: boolean;
}

const DEFAULT_TEXT = "体温36.5℃|血压偏高|心率80次/分";

export default function EmrPhysicalExamNlpPage() {
  const [nlp, setNlp] = useState<PhysicalExamNlp | null>(null);
  const [rawText, setRawText] = useState(DEFAULT_TEXT);
  const [result, setResult] = useState<NlpResult | null>(null);
  const [report, setReport] = useState<NlpReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNlp = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-physical-exam-nlp", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNlp(data?.data ?? null);
        }
      } catch {
        message.error("加载体格检查提取基础数据失败");
      }
    };
    void fetchNlp();
  }, []);

  const doExtract = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-physical-exam-nlp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ rawText }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("提取完成");
      } else {
        message.error("提取失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历体格检查NLP提取</Title>
        {nlp && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{nlp.recordId}</Text>
              <Text strong>科室：</Text><Text>{nlp.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="原始文本">
          <TextArea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={3}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doExtract}>
            执行提取
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="提取结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>体征列表：</Text>
              <List
                size="small"
                dataSource={result.vitalSigns}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color={item.includes("高") || item.includes("低") || item.includes("异常") ? "red" : "blue"} style={{ marginBottom: 4 }}>
                      {item}
                    </Tag>
                  </List.Item>
                )}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="体征数" value={report.vitalSignCount} />
              <div>
                <Text strong>是否异常：</Text>
                <Tag color={report.hasAbnormal ? "red" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.hasAbnormal ? "有异常" : "全部正常"}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
