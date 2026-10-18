/**
 * 健澜科技 jlmedaios - 病历结构化数据对比前端页（M532-D，V14，EMR 深化四模块，M532 收官）
 *
 * 深海蓝VI：病历结构化数据对比（A科室/B科室/A科室结构化率/B科室结构化率/差值/领先科室）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface StructCompare {
  deptA: string;
  deptB: string;
}

interface CompareResult {
  diff: number;
  betterDept: string;
}

interface CompareReport {
  diff: number;
  betterDept: string;
}

export default function EmrStructComparePage() {
  const [compare, setCompare] = useState<StructCompare | null>(null);
  const [deptARate, setDeptARate] = useState(92.0);
  const [deptBRate, setDeptBRate] = useState(78.0);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [report, setReport] = useState<CompareReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompare = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-struct-compare", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setCompare(data?.data ?? null);
        }
      } catch {
        message.error("加载对比基础数据失败");
      }
    };
    void fetchCompare();
  }, []);

  const doCompare = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-struct-compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ deptARate, deptBRate }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("对比完成");
      } else {
        message.error("对比失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历结构化数据对比</Title>
        {compare && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>A科室：</Text><Text style={{ marginRight: 24 }}>{compare.deptA}</Text>
              <Text strong>B科室：</Text><Text>{compare.deptB}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>A科室结构化率(%)：</Text>
              <Input
                type="number"
                value={deptARate}
                onChange={(e) => setDeptARate(Number(e.target.value))}
                style={{ width: 160, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>B科室结构化率(%)：</Text>
              <Input
                type="number"
                value={deptBRate}
                onChange={(e) => setDeptBRate(Number(e.target.value))}
                style={{ width: 160, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCompare}>
            执行对比
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="对比结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="差值(%)" value={report.diff} precision={1} />
              <div>
                <Text strong>领先科室：</Text>
                <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{report.betterDept}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
