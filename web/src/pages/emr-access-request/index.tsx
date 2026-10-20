/**
 * 健澜科技 jlmedaios - 病历调阅申请审批前端页（M534-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历调阅申请审批（病历ID/申请人/申请ID/审批决定/审批理由/审批结果/操作动作）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Select, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AccessRequest {
  recordId: string;
  applicant: string;
}

interface ApprovalResult {
  approved: boolean;
  action: string;
}

interface ApprovalReport {
  approved: boolean;
  action: string;
}

export default function EmrAccessRequestPage() {
  const [req, setReq] = useState<AccessRequest | null>(null);
  const [requestId, setRequestId] = useState("REQ001");
  const [decision, setDecision] = useState<"批准" | "拒绝">("批准");
  const [reason, setReason] = useState("科研需要");
  const [result, setResult] = useState<ApprovalResult | null>(null);
  const [report, setReport] = useState<ApprovalReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReq = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-access-request", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setReq(data?.data ?? null);
        }
      } catch {
        message.error("加载调阅申请基础数据失败");
      }
    };
    void fetchReq();
  }, []);

  const doApprove = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-access-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ requestId, decision, reason }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("审批完成");
      } else {
        message.error("审批失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历调阅申请审批</Title>
        {req && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{req.recordId}</Text>
              <Text strong>申请人：</Text><Text>{req.applicant}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="审批输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>申请ID：</Text>
              <Input value={requestId} onChange={(e) => setRequestId(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>审批决定：</Text>
              <Select
                value={decision}
                onChange={(v) => setDecision(v)}
                style={{ width: 120, marginLeft: 8 }}
                options={[
                  { value: "批准", label: "批准" },
                  { value: "拒绝", label: "拒绝" },
                ]}
              />
            </div>
            <div>
              <Text strong>审批理由：</Text>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doApprove}>
            执行审批
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审批结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>审批结果：</Text>
                <Tag color={report.approved ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.approved ? "已批准" : "已拒绝"}
                </Tag>
              </div>
              <div>
                <Text strong>操作动作：</Text>
                <Tag color="blue" style={{ marginLeft: 8, fontSize: 14 }}>{report.action}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
