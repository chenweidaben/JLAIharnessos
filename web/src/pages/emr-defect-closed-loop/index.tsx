/**
 * 健澜科技 jlmedaios - 病历缺陷闭环跟踪前端页（M527-D，V14，EMR 深化四模块，M527 收官）
 *
 * 深海蓝VI：病历缺陷闭环跟踪（缺陷ID/科室/提出日期/解决日期/状态/闭环天数/是否闭环/提示）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, DatePicker, Layout, Select, Statistic, Tag, Typography, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DefectClosedLoop {
  defectId: string;
  dept: string;
}

interface ClosedLoopResult {
  closedDays: number;
  isClosed: boolean;
}

interface ClosedLoopReport {
  closedDays: number;
  isClosed: boolean;
  hint: string;
}

const STATUS_OPTIONS = ["待整改", "整改中", "已闭环"];

export default function EmrDefectClosedLoopPage() {
  const [track, setTrack] = useState<DefectClosedLoop | null>(null);
  const [raisedDate, setRaisedDate] = useState<Dayjs | null>(dayjs("2026-10-10"));
  const [resolvedDate, setResolvedDate] = useState<Dayjs | null>(dayjs("2026-10-13"));
  const [status, setStatus] = useState("已闭环");
  const [result, setResult] = useState<ClosedLoopResult | null>(null);
  const [report, setReport] = useState<ClosedLoopReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-defect-closed-loop", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setTrack(data?.data ?? null);
        }
      } catch {
        message.error("加载闭环跟踪基础数据失败");
      }
    };
    void fetchTrack();
  }, []);

  const doTrack = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-defect-closed-loop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          defectId: "D030",
          raisedDate: raisedDate ? raisedDate.format("YYYY-MM-DD") : "",
          resolvedDate: resolvedDate ? resolvedDate.format("YYYY-MM-DD") : null,
          status,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("跟踪完成");
      } else {
        message.error("跟踪失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历缺陷闭环跟踪</Title>
        {track && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>缺陷ID：</Text><Text style={{ marginRight: 24 }}>{track.defectId}</Text>
              <Text strong>科室：</Text><Text>{track.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="跟踪条件">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <Text strong>提出日期：</Text>
              <DatePicker value={raisedDate} onChange={(d) => setRaisedDate(d)} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>解决日期：</Text>
              <DatePicker value={resolvedDate} onChange={(d) => setResolvedDate(d)} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>状态：</Text>
              <Select
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doTrack}>
              执行跟踪
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="跟踪结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="闭环天数" value={report.closedDays} suffix="天" />
              <div>
                <Text strong>是否闭环：</Text>
                <Tag color={report.isClosed ? "green" : "orange"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.isClosed ? "已闭环" : "未闭环"}
                </Tag>
              </div>
              <div>
                <Text strong>提示：</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>{report.hint}</Text>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
