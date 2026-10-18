/**
 * 健澜科技 jlmedaios - 模板审批流程前端页（M524-D，V14，EMR 深化四模块，M524 收官）
 *
 * 深海蓝VI：模板审批流程（模板名/提交人/紧急程度/审批状态/预计天数/SLA 提示）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Radio, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TemplateApproval {
  templateName: string;
  submitter: string;
}

interface ApprovalResult {
  status: string;
  estimatedDays: number;
}

interface ApprovalReport {
  status: string;
  sla: string;
}

export default function EmrTemplateApprovalPage() {
  const [approval, setApproval] = useState<TemplateApproval | null>(null);
  const [urgency, setUrgency] = useState<"常规" | "紧急">("常规");
  const [result, setResult] = useState<ApprovalResult | null>(null);
  const [report, setReport] = useState<ApprovalReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchApproval = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-approval", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setApproval(data?.data ?? null);
        }
      } catch {
        message.error("加载审批流程基础数据失败");
      }
    };
    void fetchApproval();
  }, []);

  const doSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ templateName: "入院记录模板v3.0", submitter: "张医生", urgency }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("提交审批完成");
      } else {
        message.error("提交审批失败");
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
        <Title level={3} style={{ color: VI.deep }}>模板审批流程</Title>
        {approval && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="审批流程基础数据">
            <div>
              <Text strong>模板名：</Text><Text style={{ marginRight: 24 }}>{approval.templateName}</Text>
              <Text strong>提交人：</Text><Text>{approval.submitter}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="审批提交">
          <div style={{ marginBottom: 16 }}>
            <Text strong>紧急程度：</Text>
            <Radio.Group
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as "常规" | "紧急")}
              style={{ marginLeft: 12 }}
            >
              <Radio.Button value="常规">常规</Radio.Button>
              <Radio.Button value="紧急">紧急</Radio.Button>
            </Radio.Group>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSubmit}>
            提交审批
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审批结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>审批状态：</Text>
                <Tag color="orange" style={{ marginLeft: 8, fontSize: 16 }}>{report.status}</Tag>
              </div>
              <Statistic title="预计天数" value={result.estimatedDays} suffix="天" />
              <div>
                <Text strong>SLA 提示：</Text>
                <Tag color={VI.accent} style={{ marginLeft: 8, fontSize: 16 }}>{report.sla}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
