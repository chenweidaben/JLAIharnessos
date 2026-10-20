/*
 * 健澜科技 jlmedaios - 药房 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pharmacy.service;

import com.jlmedaios.monolith.pharmacy.entity.DrugStock;
import com.jlmedaios.monolith.pharmacy.repository.DrugStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 药房 Service。
 */
@Service
@RequiredArgsConstructor
public class PharmacyService {

    private final DrugStockRepository drugStockRepository;

    /**
     * 查询全部药品。
     *
     * @return 药品列表
     */
    public List<DrugStock> listDrugs() {
        return drugStockRepository.findAll();
    }

    /**
     * 发药核对（mock，只返回药品信息）。
     *
     * @param drugCode 药品编码
     * @return 药品信息
     */
    public DrugStock dispense(String drugCode) {
        // P5 性能优化：直接调用 Repository 派生查询
        return drugStockRepository.findByDrugCode(drugCode);
    }
}
