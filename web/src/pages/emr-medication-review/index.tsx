/**
 * 健澜科技 jlmedaios - 病历合理用药审查前端页（M537-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历合理用药审查（病历ID/科室/药品名/剂量/是否过敏/是否安全/警告列表）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface MedicationReview {
  recordId: string;
  dept: string;
}

interface ReviewResult {
  safe: boolean;
  warnings: string[];
}

interface ReviewReport {
  safe: boolean;
  warnings: string[];
}

export default function EmrMedicationReviewPage() {
  const [review, setReview] = useState<MedicationReview | null>(null);
  const [drugName, setDrugName] = useState("阿司匹林");
  const [dosage, setDosage] = useState(50);
  const [hasAllergy, setHasAllergy] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-medication-review", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setReview(data?.data ?? null);
        }
      } catch {
        message.error("加载用药审查基础数据失败");
      }
    };
    void fetchReview();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-medication-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ drugName, dosage, hasAllergy }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("审查完成");
      } else {
        message.error("审查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历合理用药审查</Title>
        {review && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{review.recordId}</Text>
              <Text strong>科室：</Text><Text>{review.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="审查输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>药品名：</Text>
              <Input value={drugName} onChange={(e) => setDrugName(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>剂量：</Text>
              <Input
                type="number"
                value={dosage}
                onChange={(e) => setDosage(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>是否过敏：</Text>
              <Switch checked={hasAllergy} onChange={setHasAllergy} style={{ marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCheck}>
            执行审查
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审查结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>是否安全：</Text>
              <Tag color={report.safe ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                {report.safe ? "安全" : "有警告"}
              </Tag>
            </div>
            <div>
              <Text strong>警告列表：</Text>
              <List
                size="small"
                dataSource={report.warnings}
                style={{ marginTop: 8 }}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color="red" style={{ marginBottom: 4 }}>{item}</Tag>
                  </List.Item>
                )}
              />
              {report.warnings.length === 0 && <Text style={{ color: "#999", marginTop: 8, display: "block" }}>无警告</Text>}
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
