"""
健澜科技 jlmedaios AI 服务配置模块。

合规红线：
- AI 接口统一走本地 vLLM: http://vllm:8000/v1
- 禁止任何境外大模型 API 调用（OpenAI / Claude / Gemini / Cohere）
"""

# 本地 vLLM 接口地址
LOCAL_VLLM_URL = "http://vllm:8000/v1"

# 禁止使用的境外大模型 endpoint 列表
FORBIDDEN_ENDPOINTS = [
    "https://api.openai.com",
    "https://api.anthropic.com",
    "https://generativelanguage.googleapis.com",
    "https://api.cohere.com",
]


def is_forbidden(url: str) -> bool:
    """
    检查 URL 是否属于禁止的境外大模型 endpoint。

    合规红线：禁止任何境外大模型 endpoint。

    Args:
        url: 待检查的 URL

    Returns:
        bool: 如果属于禁止列表返回 True，否则 False
    """
    for forbidden in FORBIDDEN_ENDPOINTS:
        if url.startswith(forbidden):
            return True
    return False
