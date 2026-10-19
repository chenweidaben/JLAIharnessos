/*
 * 健澜科技 jlmedaios - 处方配送 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.prescription_delivery.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.prescription_delivery.entity.PrescriptionDelivery;
import com.jlmedaios.monolith.prescription_delivery.service.PrescriptionDeliveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 处方配送 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/prescription/delivery")
public class PrescriptionDeliveryController {

    private final PrescriptionDeliveryService prescriptionDeliveryService;

    /**
     * 创建配送。
     *
     * @param body {prescriptionNo, patientId, drugListJSON, recipientName, recipientPhone, address, deliveryFee}
     * @return Result<PrescriptionDelivery>
     */
    @PostMapping("/create")
    public Result<PrescriptionDelivery> create(@RequestBody Map<String, Object> body) {
        PrescriptionDelivery delivery = prescriptionDeliveryService.create(
                String.valueOf(body.get("prescriptionNo")),
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("drugListJSON")),
                String.valueOf(body.get("recipientName")),
                String.valueOf(body.get("recipientPhone")),
                String.valueOf(body.get("address")),
                new BigDecimal(String.valueOf(body.get("deliveryFee")))
        );
        return Result.ok(delivery);
    }

    /**
     * 配药完成发货。
     *
     * @param id   配送 ID
     * @param body {trackingNo}
     * @return Result<PrescriptionDelivery>
     */
    @PutMapping("/{id}/dispatch")
    public Result<PrescriptionDelivery> dispatch(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return prescriptionDeliveryService.dispatch(id, String.valueOf(body.get("trackingNo")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 签收。
     *
     * @param id 配送 ID
     * @return Result<PrescriptionDelivery>
     */
    @PutMapping("/{id}/sign")
    public Result<PrescriptionDelivery> sign(@PathVariable Long id) {
        return prescriptionDeliveryService.sign(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 待配药列表。
     *
     * @return Result<List<PrescriptionDelivery>>
     */
    @GetMapping("/pending")
    public Result<List<PrescriptionDelivery>> pendingList() {
        return Result.ok(prescriptionDeliveryService.pendingList());
    }
}
