/*
 * 健澜科技 jlmedaios - 药房 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.pharmacy.service;

import com.jlmedaios.his.pharmacy.entity.DispenseRecord;
import com.jlmedaios.his.pharmacy.entity.DrugStock;
import com.jlmedaios.his.pharmacy.repository.DispenseRecordRepository;
import com.jlmedaios.his.pharmacy.repository.DrugStockRepository;
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
    private final DispenseRecordRepository dispenseRecordRepository;

    /**
     * 查询全部药品库存。
     *
     * @return 药品库存列表
     */
    public List<DrugStock> listDrugs() {
        return drugStockRepository.findAll();
    }

    /**
     * 发药核对，创建发药记录。
     *
     * @param orderId  医嘱 ID
     * @param drugCode 药品编码
     * @param operator 操作员
     * @return 已持久化的发药记录
     */
    public DispenseRecord dispense(Long orderId, String drugCode, String operator) {
        DispenseRecord record = DispenseRecord.builder()
                .orderId(orderId)
                .drugCode(drugCode)
                .operator(operator)
                .build();
        return dispenseRecordRepository.save(record);
    }

    /**
     * 查询库存列表（同 listDrugs，语义化别名）。
     *
     * @return 药品库存列表
     */
    public List<DrugStock> stock() {
        return drugStockRepository.findAll();
    }
}
