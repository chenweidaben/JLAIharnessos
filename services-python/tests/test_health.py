"""
健澜科技 jlmedaios AI 服务 - 健康检查测试。
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_up():
    """测试健康检查接口返回 up 状态。"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "up"
