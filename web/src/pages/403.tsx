/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 403 无权限页
 */
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function Forbidden() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="权限不足"
      subTitle="抱歉，您没有访问此页面的权限。请联系管理员分配权限，或切换其他账号登录。"
      extra={
        <>
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={() => navigate('/login')}>
            重新登录
          </Button>
        </>
      }
    />
  );
}
