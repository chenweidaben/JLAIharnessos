"""
健澜科技 jlmedaios AI 服务 - vLLM 客户端骨架。

# 所有 AI 推理统一走本地 vLLM，禁止境外大模型 endpoint

合规红线：
- 统一走 LOCAL_VLLM_URL（http://vllm:8000/v1）
- 禁止 OpenAI / Claude / Gemini / Cohere 任何境外 endpoint
- 超时自动降级 mock，不阻塞业务流程
"""

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import LOCAL_VLLM_URL, is_forbidden

router = APIRouter()


class ChatRequest(BaseModel):
    """LLM 聊天请求体。"""
    messages: list[dict]
    temperature: float = 0.3
    max_tokens: int = 1024


# vLLM 客户端单例
_client = None
_vllm_online = False


def _get_client() -> httpx.Client:
    """获取 httpx 客户端单例。"""
    global _client
    if _client is None:
        _client = httpx.Client(
            base_url=LOCAL_VLLM_URL,
            timeout=8.0,
            headers={"Content-Type": "application/json"}
        )
    return _client


def check_vllm_health() -> bool:
    """
    启动时检测 vLLM 是否在线。

    Returns:
        bool: vLLM 是否在线
    """
    global _vllm_online
    try:
        resp = _get_client().get("/models", timeout=2.0)
        if resp.status_code == 200:
            data = resp.json()
            model_name = data.get("data", [{}])[0].get("id", "unknown")
            print(f"[vLLM] online, model: {model_name}")
            _vllm_online = True
            return True
    except Exception as e:
        print(f"[vLLM] offline: {e}")
    _vllm_online = False
    return False


def chat(messages: list[dict], temperature: float = 0.3, max_tokens: int = 1024) -> str:
    """
    调用 vLLM 聊天接口，超时自动降级 mock。

    Args:
        messages: 消息列表 [{"role": "user", "content": "..."}]
        temperature: 温度参数
        max_tokens: 最大生成 token 数

    Returns:
        str: LLM 回复文本，或降级 mock 文本
    """
    # 合规红线：禁止境外 endpoint
    if is_forbidden(LOCAL_VLLM_URL):
        return "vLLM endpoint 被禁止，降级 mock"

    if not _vllm_online:
        return "vLLM 不可用，降级 mock"

    try:
        resp = _get_client().post(
            "/chat/completions",
            json={
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            },
            timeout=8.0
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        else:
            return f"vLLM 返回异常 {resp.status_code}，降级 mock"
    except httpx.TimeoutException:
        return "vLLM 超时（8s），降级 mock"
    except Exception as e:
        return f"vLLM 调用失败：{e}，降级 mock"
