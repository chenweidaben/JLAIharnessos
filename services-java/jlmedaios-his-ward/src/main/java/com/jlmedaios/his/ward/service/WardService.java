/*
 * 健澜科技 jlmedaios - 住院床位 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.ward.service;

import com.jlmedaios.his.ward.entity.Bed;
import com.jlmedaios.his.ward.repository.BedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 住院床位 Service。
 */
@Service
@RequiredArgsConstructor
public class WardService {

    private final BedRepository bedRepository;

    /**
     * 查询全部床位。
     *
     * @return 床位列表
     */
    public List<Bed> listBeds() {
        return bedRepository.findAll();
    }

    /**
     * 入住：找可用床位设为 OCCUPIED + patientId。
     *
     * @param bedCode   床位编码
     * @param patientId 患者 ID
     * @return 更新后的床位
     */
    public Optional<Bed> admit(String bedCode, Long patientId) {
        Optional<Bed> opt = bedRepository.findByBedCode(bedCode);
        opt.ifPresent(b -> {
            b.setStatus("OCCUPIED");
            b.setPatientId(patientId);
            bedRepository.save(b);
        });
        return opt;
    }

    /**
     * 出院：设回 AVAILABLE + patientId=null。
     *
     * @param bedCode 床位编码
     * @return 更新后的床位
     */
    public Optional<Bed> discharge(String bedCode) {
        Optional<Bed> opt = bedRepository.findByBedCode(bedCode);
        opt.ifPresent(b -> {
            b.setStatus("AVAILABLE");
            b.setPatientId(null);
            bedRepository.save(b);
        });
        return opt;
    }
}
