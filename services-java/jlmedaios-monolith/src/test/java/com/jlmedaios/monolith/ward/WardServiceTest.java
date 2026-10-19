/*
 * 健澜科技 jlmedaios - 住院床位 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ward;

import com.jlmedaios.monolith.ward.entity.Bed;
import com.jlmedaios.monolith.ward.service.WardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 住院床位 Service 测试。
 */
@SpringBootTest
class WardServiceTest {

    @Autowired
    private WardService wardService;

    @Test
    void testListBeds() {
        List<Bed> beds = wardService.listBeds();
        // data.sql 已插入 5 张床位
        assertTrue(beds.size() >= 5);
    }

    @Test
    void testAdmit() {
        Optional<Bed> bed = wardService.admit("W01-01", 100L);
        assertTrue(bed.isPresent());
        assertEquals("OCCUPIED", bed.get().getStatus());
        assertEquals(100L, bed.get().getPatientId());
    }

    @Test
    void testDischarge() {
        // 先入院
        wardService.admit("W01-02", 200L);
        // 再出院
        Optional<Bed> bed = wardService.discharge("W01-02");
        assertTrue(bed.isPresent());
        assertEquals("AVAILABLE", bed.get().getStatus());
        assertEquals(null, bed.get().getPatientId());
    }
}
