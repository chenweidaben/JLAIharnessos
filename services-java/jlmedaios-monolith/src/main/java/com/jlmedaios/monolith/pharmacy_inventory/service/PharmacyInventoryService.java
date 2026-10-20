/*
 * 健澜科技 jlmedaios - 药房库存管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy_inventory.service;

import com.jlmedaios.monolith.pharmacy_inventory.entity.DrugInventory;
import com.jlmedaios.monolith.pharmacy_inventory.repository.DrugInventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 药房库存管理 Service。
 *
 * <p>药品库存主数据，消耗记录 append-only</p>
 */
@Service
@RequiredArgsConstructor
public class PharmacyInventoryService {

    private final DrugInventoryRepository drugInventoryRepository;

    /**
     * 药品库存列表。
     *
     * @return 药品列表
     */
    public List<DrugInventory> inventory() {
        return drugInventoryRepository.findAll();
    }

    /**
     * 药品入库。
     *
     * @param drugCode       药品编码
     * @param drugName       药品名称
     * @param spec           规格
     * @param manufacturer   生产厂家
     * @param batchNumber    批号
     * @param expiryDate     有效期
     * @param stockQuantity  入库数量
     * @param safetyPrice    安全库存价
     * @param safetyStock    安全库存量
     * @param location       库位
     * @return 已持久化的药品库存
     */
    public DrugInventory restock(String drugCode, String drugName, String spec,
                                  String manufacturer, String batchNumber, LocalDate expiryDate,
                                  Integer stockQuantity, BigDecimal safetyPrice,
                                  Integer safetyStock, String location) {
        DrugInventory drug = DrugInventory.builder()
                .drugCode(drugCode)
                .drugName(drugName)
                .spec(spec)
                .manufacturer(manufacturer)
                .batchNumber(batchNumber)
                .expiryDate(expiryDate)
                .stockQuantity(stockQuantity)
                .safetyPrice(safetyPrice)
                .safetyStock(safetyStock)
                .location(location)
                .build();
        return drugInventoryRepository.save(drug);
    }

    /**
     * 低库存预警（<safetyStock）。
     *
     * @return 低库存药品列表
     */
    public List<DrugInventory> lowStock() {
        // P5 性能优化：直接调用 Repository 派生查询
        return drugInventoryRepository.findByStockQuantityLessThan(100);
    }

    /**
     * 近效期预警（90 天内）。
     *
     * @return 近效期药品列表
     */
    public List<DrugInventory> expiringSoon() {
        return drugInventoryRepository.findByExpiryDateBefore(LocalDate.now().plusDays(90));
    }
}
