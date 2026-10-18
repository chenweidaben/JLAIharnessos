/**
 * 健澜科技 jlmedaios - 质控培训课程管理前端页（M503-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：培训课程管理列表（课程名/讲师/学时）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Course {
  name: string;
  lecturer: string;
  hours: number;
}

export default function EmrQcTrainingCoursePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [lecturer, setLecturer] = useState("");
  const [hours, setHours] = useState<number>(2);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-training-course", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setCourses(data?.data?.courses ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const addCourse = async () => {
    if (!name.trim()) {
      message.warning("请输入课程名");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-training-course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ name, lecturer, hours }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setCourses(data?.data?.courses ?? []);
        setName("");
        setLecturer("");
        setHours(2);
        message.success("添加成功");
      } else {
        message.error("添加失败");
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
        <Title level={3} style={{ color: VI.deep }}>培训课程管理</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="添加课程">
          <Form layout="inline">
            <Form.Item label="课程名">
              <Input placeholder="课程名" value={name} onChange={(e) => setName(e.target.value)} />
            </Form.Item>
            <Form.Item label="讲师">
              <Input placeholder="讲师" value={lecturer} onChange={(e) => setLecturer(e.target.value)} />
            </Form.Item>
            <Form.Item label="学时">
              <Input
                type="number"
                placeholder="学时"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value) || 0)}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={addCourse}>
                添加
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`课程列表（共 ${courses.length} 门）`}>
          <List
            dataSource={courses}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 200 }}>{item.name}</Text>
                <Tag color={VI.accent} style={{ width: 100 }}>{item.lecturer}</Tag>
                <Tag color="blue">{item.hours} 学时</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
