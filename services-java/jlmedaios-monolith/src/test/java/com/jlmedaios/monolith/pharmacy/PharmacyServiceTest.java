/*
 * 健澜科技 jlmedaios - 药房 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy;

import com.jlmedaios.monolith.pharmacy.entity.DrugStock;
import com.jlmedaios.monolith.pharmacy.service.PharmacyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 药房 Service 测试。
 */
@SpringBootTest
class PharmacyServiceTest {

    @Autowired
    private PharmacyService pharmacyService;

    @Test
    void testListDrugs() {
        List<DrugStock> drugs = pharmacyService.listDrugs();
        // data.sql 已插入 3 条药品数据
        assertTrue(drugs.size() >= 3);
    }

    @Test
    void testDispense() {
        DrugStock drug = pharmacyService.dispense("D001");
        assertNotNull(drug);
        assertEquals("阿莫西林胶囊", drug.getDrugName());
    }
}
