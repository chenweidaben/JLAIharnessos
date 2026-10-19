/*
 * 健澜科技 jlmedaios - 药品管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.drug_management.entity.Drug;
import com.jlmedaios.monolith.drug_management.entity.DrugPurchase;
import com.jlmedaios.monolith.drug_management.service.DrugManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 药品管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/drug")
public class DrugManagementController {

    private final DrugManagementService drugManagementService;

    /**
     * 药品目录列表。
     *
     * @return Result<List<Drug>>
     */
    @GetMapping("/list")
    public Result<List<Drug>> drugList() {
        return Result.ok(drugManagementService.drugList());
    }

    /**
     * 创建采购单。
     *
     * @param body {purchaseNo, drugCode, quantity, unitPrice, supplier}
     * @return Result<DrugPurchase>
     */
    @PostMapping("/purchase")
    public Result<DrugPurchase> createPurchase(@RequestBody Map<String, Object> body) {
        DrugPurchase purchase = drugManagementService.createPurchase(
                String.valueOf(body.get("purchaseNo")),
                String.valueOf(body.get("drugCode")),
                Integer.parseInt(String.valueOf(body.get("quantity"))),
                new BigDecimal(String.valueOf(body.get("unitPrice"))),
                String.valueOf(body.get("supplier"))
        );
        return Result.ok(purchase);
    }

    /**
     * 入库。
     *
     * @param id 采购单 ID
     * @return Result<DrugPurchase>
     */
    @PutMapping("/purchase/{id}/inbound")
    public Result<DrugPurchase> inbound(@PathVariable Long id) {
        return drugManagementService.inbound(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 低库存预警。
     *
     * @return Result<List<Drug>>
     */
    @GetMapping("/low-stock")
    public Result<List<Drug>> lowStock() {
        return Result.ok(drugManagementService.lowStock());
    }
}
