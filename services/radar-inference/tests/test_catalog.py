# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Catalog structure: 18 organs, 146 findings."""
from app.catalog import get_contract


def test_catalog_structure(client, auth_headers):
    r = client.get("/api/v1/radar/catalog", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()

    organs = body["organs"]
    assert len(organs) == 18, f"expected 18 organs, got {len(organs)}"

    total_findings = sum(len(o["findings"]) for o in organs)
    assert total_findings == 146, f"expected 146 findings, got {total_findings}"

    # fixed 18 organ keys
    expected_organs = [
        "主动脉", "十二指肠", "大肠", "小肠", "心脏", "肋骨", "肝", "肺", "肾",
        "肾上腺", "胃", "胆囊", "胰腺", "脾", "膀胱", "门静脉", "食管", "骶骨",
    ]
    assert [o["key"] for o in organs] == expected_organs

    # every finding brief has the required fields
    for organ in organs:
        for f in organ["findings"]:
            assert set(f.keys()) == {"key", "name_zh", "name_en"}
            assert f["key"]
            assert f["name_zh"]

    assert body["positive_threshold"] == 0.5
    assert isinstance(body["critical_findings"], list)
    assert len(body["critical_findings"]) > 0


def test_contract_counts_aligned():
    c = get_contract()
    assert c.organ_count == 18
    assert c.finding_count == 146
