# AI 区块链验真辅助：当前规则 mock，生产接 vLLM + 智能合约验证
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class BlockchainVerifyRequest(BaseModel):
    businessId: str
    claimedHash: str


@router.post("/ai/blockchain/verify")
async def blockchain_verify(req: BlockchainVerifyRequest):
    """
    AI 区块链验真辅助（mock）。
    生产环境接 vLLM + 智能合约验证，输出链上哈希/对比结果/区块高度/判定结论。
    """
    return {
        "businessId": req.businessId,
        "onChainHash": "a3f5e8d2...",
        "claimedHash": req.claimedHash,
        "match": True,
        "timestamp": "2026-10-19T10:30:00Z",
        "blockHeight": 123456,
        "verdict": "数据未被篡改"
    }
