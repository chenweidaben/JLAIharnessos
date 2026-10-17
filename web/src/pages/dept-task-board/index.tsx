/**
 * 健澜科技 jlmedaios - 科室任务看板 V13 页（M308-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Board {
  dept: string;
  open: number;
  overdue: number;
  verifying: number;
  done: number;
  closedRate: number;
}

interface Task {
  taskId: string;
  title: string;
  dept: string;
  status: string;
}

interface Resp {
  board: Board[];
  ranking: Board[];
  deptTasks: Task[];
}

function statusTag(status: string): JSX.Element {
  if (status === "overdue") return <Tag color="red">overdue</Tag>;
  if (status === "open") return <Tag color="orange">open</Tag>;
  if (status === "verifying") return <Tag color="blue">verifying</Tag>;
  return <Tag color="green">done</Tag>;
}

export default function DeptTaskBoardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/dept-task-board?dept=cardio");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>科室任务看板</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="全院科室逾期排名（按逾期数 desc）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.ranking}
                renderItem={(it, idx) => (
                  <List.Item>
                    <span>#{idx + 1} {it.dept}</span>
                    <Tag color="red">逾期 {it.overdue}</Tag>
                    <Tag color="blue">闭环率 {it.closedRate}%</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="本科任务（逾期排最前）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.deptTasks}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.title} description={it.dept} />
                    {statusTag(it.status)}
                  </List.Item>
                )}
              />
            </Card>
            <Row gutter={16}>
              {data.board.map((b) => (
                <Col span={6} key={b.dept}>
                  <Card title={b.dept}>
                    <Statistic title="open" value={b.open} />
                    <Statistic title="overdue" value={b.overdue} />
                    <Statistic title="done" value={b.done} />
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
