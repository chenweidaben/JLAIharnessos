/*
 * 健澜科技 jlmedaios - 医嘱管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.orders_management;

import com.jlmedaios.monolith.orders_management.entity.Order;
import com.jlmedaios.monolith.orders_management.service.OrdersManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医嘱管理 Service 测试。
 */
@SpringBootTest
public class OrdersManagementServiceTest {

    @Autowired
    private OrdersManagementService service;

    @Test
    void testCreateNormal() {
        Order order = service.create("ORD-001", "P001", "长期医嘱",
                "生理盐水 100ml ivgtt qd", LocalDate.now(), LocalDate.now().plusDays(7), "D001");
        assertNotNull(order.getId());
        assertEquals("CREATED", order.getStatus());
    }

    @Test
    void testExecuteNotFound() {
        Optional<Order> result = service.execute(99999L);
        assertFalse(result.isPresent());
    }

    @Test
    void testPatientOrdersEmpty() {
        List<Order> list = service.patientOrders("不存在患者");
        assertNotNull(list);
        assertTrue(list.isEmpty());
    }
}
