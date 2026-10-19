/*
 * 健澜科技 jlmedaios - 医疗废物管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_waste.service;

import com.jlmedaios.monolith.medical_waste.entity.WasteRecord;
import com.jlmedaios.monolith.medical_waste.repository.WasteRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 医疗废物管理 Service。
 *
 * <p>append-only: 医疗废物记录不可修改；对接医疗废物集中处置中心，转运联单可追溯</p>
 */
@Service
@RequiredArgsConstructor
public class MedicalWasteService {

    private final WasteRecordRepository wasteRecordRepository;

    /**
     * 创建废物记录。
     *
     * @param recordNo          记录编号
     * @param wasteType           废物类型
     * @param weightKg            重量（kg）
     * @param generateDepartment  产生科室
     * @return 已持久化的废物记录
     */
    public WasteRecord createRecord(String recordNo, String wasteType, BigDecimal weightKg,
                                     String generateDepartment) {
        WasteRecord record = WasteRecord.builder()
                .recordNo(recordNo)
                .wasteType(wasteType)
                .weightKg(weightKg)
                .generateDepartment(generateDepartment)
                .build();
        return wasteRecordRepository.save(record);
    }

    /**
     * 转运（status=TRANSPORTED + collectionDate）。
     *
     * @param recordId        记录 ID
     * @param transportCompany 转运公司
     * @param disposalLocation  处置地点
     * @return 已更新的废物记录
     */
    public Optional<WasteRecord> transport(Long recordId, String transportCompany,
                                            String disposalLocation) {
        Optional<WasteRecord> opt = wasteRecordRepository.findById(recordId);
        if (opt.isPresent()) {
            WasteRecord record = opt.get();
            record.setStatus("TRANSPORTED");
            record.setCollectionDate(LocalDate.now());
            record.setTransportCompany(transportCompany);
            record.setDisposalLocation(disposalLocation);
            wasteRecordRepository.save(record);
        }
        return opt;
    }

    /**
     * 废物统计。
     *
     * @return 统计结果
     */
    public Map<String, Object> stats() {
        Map<String, Object> result = new HashMap<>();
        result.put("by_waste_type", wasteRecordRepository.findByWasteType("感染性").size()
                + wasteRecordRepository.findByWasteType("损伤性").size());
        result.put("by_department", wasteRecordRepository.findAll().stream()
                .map(WasteRecord::getGenerateDepartment).distinct().count());
        result.put("by_month", wasteRecordRepository.findAll().stream()
                .map(WasteRecord::getGenerateDate).distinct().count());
        return result;
    }
}
