/**
 * 健澜科技 jlmedaios - 病历既往史 NLP 提取前端页（M530-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历既往史NLP提取（病历ID/科室/原始文本/疾病列表/疾病数/是否有手术史）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PastHistoryNlp {
  recordId: string;
  dept: string;
}

interface NlpResult {
  diseaseList: string[];
  diseaseCount: string;
  hasSurgery: boolean;
}

interface NlpReport {
  diseaseCount: string;
  hasSurgery: boolean;
}

const DEFAULT_TEXT = "高血压；糖尿病；阑尾手术史";

export default function EmrPastHistoryNlpPage() {
  const [nlp, setNlp] = useState<PastHistoryNlp | null>(null);
  const [rawText, setRawText] = useState(DEFAULT_TEXT);
  const [result, setResult] = useState<NlpResult | null>(null);
  const [report, setReport] = useState<NlpReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNlp = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-past-history-nlp", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNlp(data?.data ?? null);
        }
      } catch {
        message.error("加载既往史提取基础数据失败");
      }
    };
    void fetchNlp();
  }, []);

  const doExtract = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-past-history-nlp", {
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
        <Title level={3} style={{ color: VI.deep }}>病历既往史NLP提取</Title>
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
              <Text strong>疾病列表：</Text>
              <List
                size="small"
                dataSource={result.diseaseList}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color={VI.accent} style={{ marginBottom: 4 }}>{item}</Tag>
                  </List.Item>
                )}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="疾病数" value={report.diseaseCount} />
              <div>
                <Text strong>是否有手术史：</Text>
                <Tag color={report.hasSurgery ? "orange" : "default"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.hasSurgery ? "有手术史" : "无手术史"}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
