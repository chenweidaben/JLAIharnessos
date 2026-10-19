/*
 * 健澜科技 jlmedaios - 医嘱 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.orders;

import com.jlmedaios.monolith.orders.entity.Orders;
import com.jlmedaios.monolith.orders.service.OrdersService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 医嘱 Service 测试。
 */
@SpringBootTest
class OrdersServiceTest {

    @Autowired
    private OrdersService ordersService;

    @Test
    void testCreate() {
        Orders order = Orders.builder()
                .patientId(1L)
                .orderType("MEDICATION")
                .content("阿莫西林 0.5g 每日三次")
                .doctorName("测试医生")
                .build();
        Orders saved = ordersService.create(order);
        assertTrue(saved.getId() > 0);
        assertEquals("PENDING", saved.getStatus());
    }

    @Test
    void testExecute() {
        Orders order = Orders.builder()
                .patientId(2L)
                .orderType("EXAM")
                .content("血常规检查")
                .doctorName("测试医生")
                .build();
        Orders saved = ordersService.create(order);
        Optional<Orders> executed = ordersService.execute(saved.getId());
        assertTrue(executed.isPresent());
        assertEquals("EXECUTED", executed.get().getStatus());
    }
}
