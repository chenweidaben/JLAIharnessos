/*
 * 健澜科技 jlmedaios - 输血 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.transfusion;

import com.jlmedaios.monolith.transfusion.entity.TransfusionRecord;
import com.jlmedaios.monolith.transfusion.service.TransfusionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 输血 Service 测试。
 */
@SpringBootTest
public class TransfusionServiceTest {

    @Autowired
    private TransfusionService transfusionService;

    @Test
    void testRequest() {
        TransfusionRecord record = transfusionService.request(1L, "A", "红细胞",
                400, "DONOR001");
        assertNotNull(record.getId());
        assertEquals("REQUESTED", record.getStatus());
    }

    @Test
    void testVerify() {
        TransfusionRecord record = transfusionService.request(2L, "O", "血浆",
                200, "DONOR002");
        Optional<TransfusionRecord> verified = transfusionService.verify(record.getId());
        assertTrue(verified.isPresent());
        assertEquals("VERIFIED", verified.get().getStatus());
        assertTrue(verified.get().getPreTestBloodType());
        assertTrue(verified.get().getPreTestCrossmatch());
        assertTrue(verified.get().getPreTestHbsAg());
    }

    @Test
    void testReaction() {
        TransfusionRecord record = transfusionService.request(3L, "B", "血小板",
                10, "DONOR003");
        Optional<TransfusionRecord> reacted = transfusionService.reaction(record.getId(),
                "轻度过敏");
        assertTrue(reacted.isPresent());
        assertEquals("REACTED", reacted.get().getStatus());
    }
}
