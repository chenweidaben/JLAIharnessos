/*
 * 健澜科技 jlmedaios - 电子病历 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emr;

import com.jlmedaios.monolith.emr.entity.EmrDocument;
import com.jlmedaios.monolith.emr.service.EmrService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 电子病历 Service 测试。
 */
@SpringBootTest
public class EmrServiceTest {

    @Autowired
    private EmrService emrService;

    @Test
    void testCreate() {
        EmrDocument doc = emrService.create(1L, "门诊", "INTERNAL", "D001",
                "2型糖尿病", "入院记录", "患者血糖控制不佳", "hash_prev_001");
        assertNotNull(doc.getId());
        assertNotNull(doc.getAppendHash());
        assertEquals("UNSIGNED", doc.getSignStatus());
    }

    @Test
    void testSign() {
        EmrDocument doc = emrService.create(2L, "住院", "SURGERY", "D002",
                "急性阑尾炎", "首次病程", "拟行腹腔镜手术", "hash_prev_002");
        Optional<EmrDocument> signed = emrService.sign(doc.getId(), "CA-张医生");
        assertTrue(signed.isPresent());
        assertEquals("SIGNED", signed.get().getSignStatus());
        assertEquals("CA-张医生", signed.get().getSignBy());
    }

    @Test
    void testVerify() {
        EmrDocument doc = emrService.create(3L, "住院", "INTERNAL", "D003",
                "高血压", "日常病程", "血压稳定", "hash_prev_003");
        Map<String, Object> result = emrService.verify(doc.getId());
        assertTrue((Boolean) result.get("valid"));
        assertNotNull(result.get("currentHash"));
    }
}
