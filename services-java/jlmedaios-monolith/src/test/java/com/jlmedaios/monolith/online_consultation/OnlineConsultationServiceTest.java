/*
 * 健澜科技 jlmedaios - 在线咨询 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.online_consultation;

import com.jlmedaios.monolith.online_consultation.entity.OnlineConsultation;
import com.jlmedaios.monolith.online_consultation.service.OnlineConsultationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 在线咨询 Service 测试。
 */
@SpringBootTest
public class OnlineConsultationServiceTest {

    @Autowired
    private OnlineConsultationService onlineConsultationService;

    @Test
    void testCreate() {
        OnlineConsultation consultation = onlineConsultationService.create(
                "OC20261019001", "P001", "CARD", "胸闷3天", new BigDecimal("20.00")
        );
        assertNotNull(consultation.getId());
        assertEquals("PENDING", consultation.getStatus());
    }

    @Test
    void testAcceptAndFinish() {
        OnlineConsultation consultation = onlineConsultationService.create(
                "OC20261019002", "P002", "RESP", "咳嗽发热", new BigDecimal("20.00")
        );
        Optional<OnlineConsultation> accepted = onlineConsultationService.accept(consultation.getId(), "DOC001");
        assertTrue(accepted.isPresent());
        assertEquals("IN_PROGRESS", accepted.get().getStatus());

        Optional<OnlineConsultation> finished = onlineConsultationService.finish(consultation.getId(), true);
        assertTrue(finished.isPresent());
        assertEquals("COMPLETED", finished.get().getStatus());
    }

    @Test
    void testPendingList() {
        onlineConsultationService.create(
                "OC20261019003", "P003", "GI", "腹痛", new BigDecimal("20.00")
        );
        assertNotNull(onlineConsultationService.pendingList());
    }
}
