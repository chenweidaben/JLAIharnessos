"""
健澜科技 jlmedaios PHI（Protected Health Information）脱敏模块。

合规红线：
- 所有入参必须先过此函数脱敏
- 身份证号、手机号、姓名等 PHI 字段必须脱敏后才能进入 NLP/AI 流程
"""

import re


def mask_phi(text: str) -> str:
    """
    对输入文本进行 PHI 脱敏。

    脱敏规则：
    1. 身份证号（18位）→ "***"
    2. 手机号（1[3-9]开头共11位）→ "***"
    3. 姓名（简单规则："患者张三"→"患者***"）

    合规红线：所有入参必须先过此函数脱敏。

    Args:
        text: 原始文本

    Returns:
        str: 脱敏后的文本
    """
    if not text:
        return text

    # 1. 身份证号（18位，最后一位可能是 X）
    text = re.sub(r'\d{17}[\dXx]', '***', text)

    # 2. 手机号（1[3-9]开头共11位）
    text = re.sub(r'1[3-9]\d{9}', '***', text)

    # 3. 姓名（简单规则："患者X" 或 "病人X" → "患者***"）
    text = re.sub(r'(患者|病人)[\u4e00-\u9fa5]{2,3}', r'\1***', text)

    return text
