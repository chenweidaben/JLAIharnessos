/*
 * 健澜科技 jlmedaios - 药房库存管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy_inventory.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.pharmacy_inventory.entity.DrugInventory;
import com.jlmedaios.monolith.pharmacy_inventory.service.PharmacyInventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 药房库存管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pharmacy")
public class PharmacyInventoryController {

    private final PharmacyInventoryService pharmacyInventoryService;

    /**
     * 药品库存列表。
     *
     * @return Result<List<DrugInventory>>
     */
    @GetMapping("/inventory")
    public Result<List<DrugInventory>> inventory() {
        return Result.ok(pharmacyInventoryService.inventory());
    }

    /**
     * 药品入库。
     *
     * @param body {drugCode, drugName, spec, manufacturer, batchNumber, expiryDate, stockQuantity, safetyPrice, safetyStock, location}
     * @return Result<DrugInventory>
     */
    @PostMapping("/restock")
    public Result<DrugInventory> restock(@RequestBody Map<String, Object> body) {
        DrugInventory drug = pharmacyInventoryService.restock(
                String.valueOf(body.get("drugCode")),
                String.valueOf(body.get("drugName")),
                String.valueOf(body.get("spec")),
                String.valueOf(body.get("manufacturer")),
                String.valueOf(body.get("batchNumber")),
                LocalDate.parse(String.valueOf(body.get("expiryDate"))),
                Integer.valueOf(String.valueOf(body.get("stockQuantity"))),
                new BigDecimal(String.valueOf(body.get("safetyPrice"))),
                Integer.valueOf(String.valueOf(body.get("safetyStock"))),
                String.valueOf(body.get("location"))
        );
        return Result.ok(drug);
    }

    /**
     * 低库存预警。
     *
     * @return Result<List<DrugInventory>>
     */
    @GetMapping("/low-stock")
    public Result<List<DrugInventory>> lowStock() {
        return Result.ok(pharmacyInventoryService.lowStock());
    }

    /**
     * 近效期预警。
     *
     * @return Result<List<DrugInventory>>
     */
    @GetMapping("/expiring")
    public Result<List<DrugInventory>> expiringSoon() {
        return Result.ok(pharmacyInventoryService.expiringSoon());
    }
}
