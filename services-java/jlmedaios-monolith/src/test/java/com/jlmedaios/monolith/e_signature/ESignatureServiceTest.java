/*
 * 健澜科技 jlmedaios - 电子签名 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.e_signature;

import com.jlmedaios.monolith.e_signature.entity.DigitalSignature;
import com.jlmedaios.monolith.e_signature.service.ESignatureService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 电子签名 Service 测试。
 */
@SpringBootTest
public class ESignatureServiceTest {

    @Autowired
    private ESignatureService eSignatureService;

    @Test
    void testApply() {
        DigitalSignature sig = eSignatureService.apply(
                "SIG-2026-001", "病历签名", "MR-001", "D001", "hash_abc123");
        assertNotNull(sig.getId());
        assertEquals("hash_abc123", sig.getHashValue());
        assertNotNull(sig.getCertSerialNumber());
    }

    @Test
    void testVerify() {
        eSignatureService.apply("SIG-2026-002", "医嘱签名", "ORD-001", "D002", "hash_def456");
        Map<String, Object> result = eSignatureService.verify("ORD-001", "hash_def456", "sig_value");
        assertNotNull(result);
        assertTrue((Boolean) result.get("valid"));
    }

    @Test
    void testHistory() {
        eSignatureService.apply("SIG-2026-003", "报告签名", "RPT-001", "D003", "hash_ghi789");
        List<DigitalSignature> history = eSignatureService.history("RPT-001");
        assertNotNull(history);
    }
}
