"""
健澜科技 jlmedaios AI 服务 - 鉴权中间件回归测试。

锁定 P0 修复：函数式中间件鉴权拒绝必须返回干净 401/429 JSON，
不得冒泡成 500（Starlette 的 ExceptionMiddleware 位于用户中间件内侧，
raise HTTPException 在其中不会被捕获）。
"""

from fastapi.testclient import TestClient

from app.main import app
from app.core.api_key_auth import API_KEYS

client = TestClient(app, raise_server_exceptions=False)


def test_ai_route_without_token_returns_401_not_500():
    """未带 Bearer Token 访问 /ai/* → 401 JSON（而非 500）。"""
    response = client.post("/ai/qc", json={})
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing Bearer Token"


def test_ai_route_with_invalid_token_returns_401_not_500():
    """无效 API Key → 401 JSON（而非 500）。"""
    response = client.post(
        "/ai/qc", json={}, headers={"Authorization": "Bearer not-a-real-key"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid API Key"


def test_non_ai_route_not_blocked():
    """非 /ai/* 路由（健康检查）不受 API Key 鉴权影响。"""
    response = client.get("/health")
    assert response.status_code == 200


def test_valid_key_passes_auth_layer():
    """白名单内 key 不应被鉴权拦截（业务 404/422 均可，唯独不能是 401）。"""
    key = next(iter(API_KEYS))
    response = client.post(
        "/ai/qc", json={}, headers={"Authorization": f"Bearer {key}"}
    )
    assert response.status_code != 401
