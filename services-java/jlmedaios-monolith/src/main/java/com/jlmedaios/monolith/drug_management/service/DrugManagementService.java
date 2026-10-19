/*
 * 健澜科技 jlmedaios - 药品管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_management.service;

import com.jlmedaios.monolith.drug_management.entity.Drug;
import com.jlmedaios.monolith.drug_management.entity.DrugPurchase;
import com.jlmedaios.monolith.drug_management.repository.DrugPurchaseRepository;
import com.jlmedaios.monolith.drug_management.repository.DrugRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * 药品管理 Service。
 *
 * <p>与 pharmacy_inventory 模块互补，本模块管采购，pharmacy_inventory 管药房库存</p>
 */
@Service
@RequiredArgsConstructor
public class DrugManagementService {

    private final DrugRepository drugRepository;
    private final DrugPurchaseRepository drugPurchaseRepository;

    /**
     * 药品目录列表。
     *
     * @return 药品列表
     */
    public List<Drug> drugList() {
        return drugRepository.findAll();
    }

    /**
     * 创建采购单。
     *
     * @param purchaseNo 采购编号
     * @param drugCode    药品编码
     * @param quantity   数量
     * @param unitPrice  单价
     * @param supplier   供应商
     * @return 已持久化的采购单
     */
    public DrugPurchase createPurchase(String purchaseNo, String drugCode, int quantity,
                                      BigDecimal unitPrice, String supplier) {
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(quantity));
        DrugPurchase purchase = DrugPurchase.builder()
                .purchaseNo(purchaseNo)
                .drugCode(drugCode)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .totalAmount(totalAmount)
                .supplier(supplier)
                .build();
        return drugPurchaseRepository.save(purchase);
    }

    /**
     * 入库（status=INBOUND + 库存增加）。
     *
     * @param purchaseId 采购单 ID
     * @return 已更新的采购单
     */
    public Optional<DrugPurchase> inbound(Long purchaseId) {
        Optional<DrugPurchase> opt = drugPurchaseRepository.findById(purchaseId);
        if (opt.isPresent()) {
            DrugPurchase purchase = opt.get();
            purchase.setStatus("INBOUND");
            drugPurchaseRepository.save(purchase);
            // 库存增加（mock：实际生产应更新 Drug 表 stockQuantity）
        }
        return opt;
    }

    /**
     * 低库存预警。
     *
     * @return 低库存药品列表
     */
    public List<Drug> lowStock() {
        return drugRepository.findAll().stream()
                .filter(d -> d.getStockQuantity() < d.getStockWarningLevel())
                .toList();
    }
}
