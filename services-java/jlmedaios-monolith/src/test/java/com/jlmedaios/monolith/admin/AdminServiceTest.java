/*
 * 健澜科技 jlmedaios - 医务行政 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin;

import com.jlmedaios.monolith.admin.entity.MedicalStaff;
import com.jlmedaios.monolith.admin.service.AdminService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医务行政 Service 测试。
 */
@SpringBootTest
public class AdminServiceTest {

    @Autowired
    private AdminService adminService;

    @Test
    void testAdd() {
        MedicalStaff staff = adminService.add("张医生", "INTERNAL", "主治医师",
                "医师", "LIC001");
        assertNotNull(staff.getId());
        assertEquals("ACTIVE", staff.getStatus());
    }

    @Test
    void testChangeTitle() {
        MedicalStaff staff = adminService.add("李医生", "SURGERY", "住院医师",
                "医师", "LIC002");
        Optional<MedicalStaff> updated = adminService.changeTitle(staff.getId(), "主治医师");
        assertTrue(updated.isPresent());
        assertEquals("主治医师", updated.get().getTitle());
    }

    @Test
    void testListByDept() {
        List<MedicalStaff> list = adminService.listByDept("INTERNAL");
        assertNotNull(list);
        assertTrue(list.size() >= 0);
    }
}
