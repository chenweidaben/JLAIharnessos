/**
 * 健澜科技 jlmedaios - 移动护理我的任务（M16-A）
 * 跨患者聚合待办：列出有待办任务的在院患者，点击进入床旁工作台执行。
 * 数据来自床旁看板（/m/bed-board）真实待办计数，无假数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Card, Tag, Spin, Empty } from 'antd';
import { useMobileNursingStore } from '@/store/mobileNursingStore';

export default function MobileTasks() {
  const { patients, loadingBoard, loadBoard, dbUp } = useMobileNursingStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (dbUp) void loadBoard();
  }, [dbUp, loadBoard]);

  const pending = patients.filter((p) => p.pendingTaskCount > 0);

  return (
    <Spin spinning={loadingBoard}>
      {pending.length === 0 ? (
        <Empty description="暂无待办任务" />
      ) : (
        <List
          dataSource={pending}
          renderItem={(p) => (
            <List.Item key={p.visitId}>
              <Card
                data-testid={`m-task-row-${p.visitId}`}
                size="small"
                style={{ width: '100%' }}
                onClick={() => navigate(`/m/bed/${p.visitId}`)}
                hoverable
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    {p.bedNo}床 · {p.patientName}
                  </span>
                  <Tag color="orange">待办 {p.pendingTaskCount}</Tag>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </Spin>
  );
}
