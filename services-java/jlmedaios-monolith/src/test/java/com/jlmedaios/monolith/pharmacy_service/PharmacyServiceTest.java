/*
 * 健澜科技 jlmedaios - 药学服务 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy_service;

import com.jlmedaios.monolith.pharmacy_service.entity.PharmacyConsult;
import com.jlmedaios.monolith.pharmacy_service.service.PharmacyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 药学服务 Service 测试。
 */
@SpringBootTest
public class PharmacyServiceTest {

    @Autowired
    private PharmacyService pharmacyService;

    @Test
    void testCreate() {
        PharmacyConsult consult = pharmacyService.create(1L, "华法林",
                "用药咨询", "华法林与阿司匹林能同服吗？");
        assertNotNull(consult.getId());
        assertEquals("用药咨询", consult.getConsultType());
    }

    @Test
    void testListByPatient() {
        pharmacyService.create(2L, "二甲双胍", "不良反应", "服药后腹泻");
        List<PharmacyConsult> list = pharmacyService.listByPatient(2L);
        assertNotNull(list);
        assertTrue(list.size() >= 1);
    }

    @Test
    void testPendingList() {
        pharmacyService.create(3L, "奥美拉唑", "药物重整", "PPI 影响地高辛吸收");
        List<PharmacyConsult> pending = pharmacyService.pendingList();
        assertNotNull(pending);
        assertTrue(pending.size() >= 1);
    }
}
