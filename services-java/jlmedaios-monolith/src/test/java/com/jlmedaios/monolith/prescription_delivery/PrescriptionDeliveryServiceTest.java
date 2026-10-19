/*
 * 健澜科技 jlmedaios - 处方配送 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.prescription_delivery;

import com.jlmedaios.monolith.prescription_delivery.entity.PrescriptionDelivery;
import com.jlmedaios.monolith.prescription_delivery.service.PrescriptionDeliveryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 处方配送 Service 测试。
 */
@SpringBootTest
public class PrescriptionDeliveryServiceTest {

    @Autowired
    private PrescriptionDeliveryService prescriptionDeliveryService;

    @Test
    void testCreate() {
        PrescriptionDelivery delivery = prescriptionDeliveryService.create(
                "RX20261019001", 1L, "[{\"drug\":\"阿莫西林\",\"qty\":2}]",
                "张三", "13800138000", "杭州市西湖区", new BigDecimal("10.00")
        );
        assertNotNull(delivery.getId());
        assertEquals("PENDING", delivery.getStatus());
    }

    @Test
    void testDispatchAndSign() {
        PrescriptionDelivery delivery = prescriptionDeliveryService.create(
                "RX20261019002", 2L, "[{\"drug\":\"头孢呋辛\",\"qty\":1}]",
                "李四", "13900139000", "杭州市拱墅区", new BigDecimal("10.00")
        );
        Optional<PrescriptionDelivery> dispatched = prescriptionDeliveryService.dispatch(delivery.getId(), "SF1234567890");
        assertTrue(dispatched.isPresent());
        assertEquals("SHIPPED", dispatched.get().getStatus());
        assertNotNull(dispatched.get().getTrackingNo());

        Optional<PrescriptionDelivery> signed = prescriptionDeliveryService.sign(delivery.getId());
        assertTrue(signed.isPresent());
        assertEquals("SIGNED", signed.get().getStatus());
    }

    @Test
    void testPendingList() {
        prescriptionDeliveryService.create(
                "RX20261019003", 3L, "[]",
                "王五", "13700137000", "杭州市余杭区", new BigDecimal("10.00")
        );
        assertNotNull(prescriptionDeliveryService.pendingList());
    }
}
