/*
 * 健澜科技 jlmedaios - 床位管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.bed_management.service;

import com.jlmedaios.monolith.bed_management.entity.Bed;
import com.jlmedaios.monolith.bed_management.repository.BedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 床位管理 Service。
 *
 * <p>床位主数据，状态实时变更</p>
 */
@Service
@RequiredArgsConstructor
public class BedManagementService {

    private final BedRepository bedRepository;

    /**
     * 病区床位列表。
     *
     * @param wardCode 病区编码
     * @return 床位列表
     */
    public List<Bed> wardBeds(String wardCode) {
        return bedRepository.findByWardCode(wardCode);
    }

    /**
     * 占用床位。
     *
     * @param bedNo     床号
     * @param patientId 患者 ID
     * @return 已更新的床位
     */
    public Optional<Bed> occupy(String bedNo, Long patientId) {
        // mock：按床号查找（生产用 findByBedNo）
        List<Bed> beds = bedRepository.findAll();
        Optional<Bed> opt = beds.stream().filter(b -> bedNo.equals(b.getBedNo())).findFirst();
        if (opt.isPresent()) {
            Bed bed = opt.get();
            bed.setStatus("OCCUPIED");
            bed.setPatientId(patientId);
            bed.setAdmissionTime(LocalDateTime.now());
            bedRepository.save(bed);
        }
        return opt;
    }

    /**
     * 释放床位。
     *
     * @param bedNo 床号
     * @return 已更新的床位
     */
    public Optional<Bed> release(String bedNo) {
        List<Bed> beds = bedRepository.findAll();
        Optional<Bed> opt = beds.stream().filter(b -> bedNo.equals(b.getBedNo())).findFirst();
        if (opt.isPresent()) {
            Bed bed = opt.get();
            bed.setStatus("CLEANING");
            bed.setPatientId(null);
            bed.setAdmissionTime(null);
            bedRepository.save(bed);
        }
        return opt;
    }

    /**
     * 全院可用床位查询。
     *
     * @return 可用床位列表
     */
    public List<Bed> availableBeds() {
        return bedRepository.findByStatus("AVAILABLE");
    }
}
