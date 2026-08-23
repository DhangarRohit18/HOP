# NEXUS Phase 2.2 Manufacturing Dataset Seed Generator

This package implements the deterministic synthetic manufacturing dataset generator for the **NEXUS Autonomous Disruption Control Platform**.

---

## 1. Overview & Purpose

The seed generator populates PostgreSQL with a realistic operational supply chain network consisting of **20 tables** (7 Core Primitives + 13 Manufacturing Adapter tables).

### Ground Truth Boundary Rule
The seed generator inserts **strictly ground-truth operational parameters** (inventory balances, daily demand rates, PO dates, committed lead times, SLA penalty rates). It **never** inserts derived simulation outcomes (stockout dates, coverage days, SLA breach penalties), leaving those metrics to be derived dynamically by future simulation engines.

---

## 2. Determinism Contract

- **Fixed Random Seed**: `SEED = 42`
- **Baseline Date**: `2026-08-01`
- **Deterministic Namespace UUIDs**: All primary keys are generated using `uuid.uuid5(NAMESPACE_NEXUS, f"{entity_type}:{business_code}")`.
- **Dataset Checksum**: Computed deterministically over `seed`, `namespace`, `baseline_date`, and `record_counts`. Runtime timestamps (`generated_at`) are explicitly excluded from checksum calculation.

---

## 3. Targeted Dataset Record Counts

| Entity / Table | Target Count |
| :--- | :---: |
| Suppliers | 12 |
| Components | 36 |
| Warehouses | 5 |
| Purchase Orders | 75 |
| Purchase Order Items | 150 |
| Shipments | 60 |
| Inventory Positions | 120 |
| Production Orders | 40 |
| Production Order Items | 160 |
| Customer Orders | 100 |
| Customer Order Items | 180 |
| Customer Order Production Allocations | 120 |
| Supplier Performance Records | 144 |
| Core Primitive Entities | 297 |
| Core Primitive Resources | 36 |
| Core Primitive Dependencies | 280 |

---

## 4. Execution Command

To execute the seed generator against the active PostgreSQL database:

```bash
cd backend
python -m scripts.seed.run_seed
```

Upon execution, the script:
1. Runs inside a single database transaction (`AsyncSession.begin()`).
2. Cleans existing database records.
3. Generates all core and adapter records.
4. Executes the 18-point data quality validation suite.
5. Commits the transaction.
6. Exports `dataset_manifest.json` with the deterministic dataset checksum.
