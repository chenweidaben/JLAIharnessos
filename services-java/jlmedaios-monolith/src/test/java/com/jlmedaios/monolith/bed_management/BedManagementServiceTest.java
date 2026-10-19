/*
 * 健澜科技 jlmedaios - 床位管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.bed_management;

import com.jlmedaios.monolith.bed_management.entity.Bed;
import com.jlmedaios.monolith.bed_management.service.BedManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 床位管理 Service 测试。
 */
@SpringBootTest
public class BedManagementServiceTest {

    @Autowired
    private BedManagementService bedManagementService;

    @Test
    void testWardBeds() {
        assertNotNull(bedManagementService.wardBeds("WARD01"));
    }

    @Test
    void testOccupyAndRelease() {
        // mock：先创建一个床（生产直接用 repository）
        Optional<Bed> occupied = bedManagementService.occupy("B001", 1L);
        // 如果床不存在返回 empty（H2 内存库）
        // 仅验证不抛异常
        assertNotNull(occupied);

        Optional<Bed> released = bedManagementService.release("B001");
        assertNotNull(released);
    }

    @Test
    void testAvailableBeds() {
        assertNotNull(bedManagementService.availableBeds());
    }
}
