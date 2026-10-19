/*
 * 健澜科技 jlmedaios - 区块链存证 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blockchain_evidence;

import com.jlmedaios.monolith.blockchain_evidence.entity.BlockchainRecord;
import com.jlmedaios.monolith.blockchain_evidence.service.BlockchainEvidenceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 区块链存证 Service 测试。
 */
@SpringBootTest
public class BlockchainEvidenceServiceTest {

    @Autowired
    private BlockchainEvidenceService blockchainEvidenceService;

    @Test
    void testAnchorData() {
        BlockchainRecord record = blockchainEvidenceService.anchorData(
                "病历", "MR202610001", "a3f5e8d2c1b0");
        assertNotNull(record.getId());
        assertEquals("CONFIRMED", record.getStatus());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testVerifyData() {
        blockchainEvidenceService.anchorData("处方", "RX202610001", "b4c6f9e3d2a1");
        Map<String, Object> result = blockchainEvidenceService.verifyData("RX202610001");
        assertNotNull(result);
        assertTrue((Boolean) result.get("exists"));
    }

    @Test
    void testRecordList() {
        List<BlockchainRecord> list = blockchainEvidenceService.recordList();
        assertNotNull(list);
    }
}
