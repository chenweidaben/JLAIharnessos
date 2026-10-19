/*
 * 健澜科技 jlmedaios - 血库管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_bank.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.blood_bank.entity.BloodInventory;
import com.jlmedaios.monolith.blood_bank.entity.BloodTransfusionOrder;
import com.jlmedaios.monolith.blood_bank.service.BloodBankService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 血库管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/blood-bank")
public class BloodBankController {

    private final BloodBankService bloodBankService;

    /**
     * 库存列表。
     *
     * @return Result<List<BloodInventory>>
     */
    @GetMapping("/inventory")
    public Result<List<BloodInventory>> inventory() {
        return Result.ok(bloodBankService.inventory());
    }

    /**
     * 输血申请。
     *
     * @param body {patientId, bloodTypeRequired, volumeML, indication}
     * @return Result<BloodTransfusionOrder>
     */
    @PostMapping("/order")
    public Result<BloodTransfusionOrder> order(@RequestBody Map<String, Object> body) {
        BloodTransfusionOrder order = bloodBankService.order(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("bloodTypeRequired")),
                Integer.valueOf(String.valueOf(body.get("volumeML"))),
                String.valueOf(body.get("indication"))
        );
        return Result.ok(order);
    }

    /**
     * 发血。
     *
     * @param id 输血申请 ID
     * @return Result<BloodTransfusionOrder>
     */
    @PutMapping("/{id}/issue")
    public Result<BloodTransfusionOrder> issue(@PathVariable Long id) {
        return bloodBankService.issue(id)
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 7 天内过期血液预警。
     *
     * @return Result<List<BloodInventory>>
     */
    @GetMapping("/expiring")
    public Result<List<BloodInventory>> expiringSoon() {
        return Result.ok(bloodBankService.expiringSoon());
    }
}
