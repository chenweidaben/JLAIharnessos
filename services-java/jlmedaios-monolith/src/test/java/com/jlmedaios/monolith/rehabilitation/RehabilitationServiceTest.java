/*
 * 健澜科技 jlmedaios - 康复 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation;

import com.jlmedaios.monolith.rehabilitation.entity.RehabOrder;
import com.jlmedaios.monolith.rehabilitation.entity.RehabProgress;
import com.jlmedaios.monolith.rehabilitation.service.RehabilitationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 康复 Service 测试。
 */
@SpringBootTest
public class RehabilitationServiceTest {

    @Autowired
    private RehabilitationService rehabilitationService;

    @Test
    void testCreateOrder() {
        RehabOrder order = rehabilitationService.createOrder(
                "REHAB-2026-001", "P001", "物理治疗", "脑卒中后康复",
                LocalDate.now(), LocalDate.now().plusDays(30));
        assertNotNull(order.getId());
        assertEquals("IN_PROGRESS", order.getStatus());
    }

    @Test
    void testRecordProgress() {
        rehabilitationService.createOrder(
                "REHAB-2026-002", "P002", "作业治疗", "手功能康复",
                LocalDate.now(), LocalDate.now().plusDays(20));
        RehabProgress progress = rehabilitationService.recordProgress(
                "REHAB-2026-002", "T001", "患者手部活动度提升", "部分达标");
        assertNotNull(progress.getId());
        assertEquals("部分达标", progress.getGoalAchievement());
    }

    @Test
    void testActiveOrders() {
        List<RehabOrder> list = rehabilitationService.activeOrders();
        assertNotNull(list);
    }
}
