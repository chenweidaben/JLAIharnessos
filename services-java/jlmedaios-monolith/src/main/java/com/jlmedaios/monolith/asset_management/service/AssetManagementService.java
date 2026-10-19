/*
 * 健澜科技 jlmedaios - 固定资产管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.asset_management.service;

import com.jlmedaios.monolith.asset_management.entity.FixedAsset;
import com.jlmedaios.monolith.asset_management.repository.FixedAssetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 固定资产管理 Service。
 */
@Service
@RequiredArgsConstructor
public class AssetManagementService {

    private final FixedAssetRepository fixedAssetRepository;

    /**
     * 资产清单。
     *
     * @return 资产列表
     */
    public List<FixedAsset> assetList() {
        return fixedAssetRepository.findAll();
    }

    /**
     * 资产转移。
     *
     * @param assetCode      资产编码
     * @param newDepartment  新科室
     * @param newLocation    新位置
     * @return 已更新的资产
     */
    public Optional<FixedAsset> transfer(String assetCode, String newDepartment, String newLocation) {
        Optional<FixedAsset> opt = fixedAssetRepository.findByAssetCode(assetCode);
        if (opt.isPresent()) {
            FixedAsset asset = opt.get();
            asset.setDepartment(newDepartment);
            asset.setLocation(newLocation);
            fixedAssetRepository.save(asset);
        }
        return opt;
    }

    /**
     * 资产报废（status=SCRAPPED）。
     *
     * @param assetCode 资产编码
     * @return 已更新的资产
     */
    public Optional<FixedAsset> scrap(String assetCode) {
        Optional<FixedAsset> opt = fixedAssetRepository.findByAssetCode(assetCode);
        if (opt.isPresent()) {
            FixedAsset asset = opt.get();
            asset.setStatus("SCRAPPED");
            fixedAssetRepository.save(asset);
        }
        return opt;
    }

    /**
     * 资产统计（mock）。
     *
     * @return 统计数据
     */
    public Map<String, Object> statistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("by_category", List.of(
                Map.of("category", "IT设备", "count", 50),
                Map.of("category", "办公设备", "count", 120)
        ));
        stats.put("by_department", List.of(
                Map.of("dept", "信息科", "count", 30),
                Map.of("dept", "财务科", "count", 15)
        ));
        return stats;
    }
}
