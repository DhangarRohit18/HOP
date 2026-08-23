# Tool Architecture Specification - Categories, Schemas & Execution Constraints

## 1. Tool Architectural Framework

Tools represent the **exclusive interface** through which AI Agents interact with the NEXUS Core, Digital Twin, operational database, and external enterprise systems. 

### Mandatory Tool Properties
1. **Explicit Schemas**: Input and output structures must be enforced via Pydantic schemas.
2. **Permission Scoping**: Every tool call evaluates RBAC / Autonomy Level permissions before execution.
3. **Audit Logging**: Every invocation (caller, inputs, outputs, timestamp, duration) is recorded in immutable audit storage.
4. **Deterministic Core**: Calculations, queries, state mutations, and simulations invoked by tools must execute 100% deterministically.

```
┌─────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  AI Agent   ├───────►│  Tool Gateway    ├───────►│ Deterministic    │
│ (Reasoning) │        │  - Schema Check  │        │ Core Engine /    │
└─────────────┘        │  - Permission    │        │ External API     │
                       │  - Audit Log     │        └──────────────────┘
                       └──────────────────┘
```

---

## 2. Tool Category Specifications (5 Categories)

---

### Category A: READ TOOLS
*Fetch current or historical operational state without side effects.*

#### 1. `get_inventory`
- **Description**: Returns current stock levels, reserved quantities, and location for a given component.
- **Permission**: `READ_OPERATIONAL_DATA`
- **Input Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "component_id": { "type": "string" },
    "facility_id": { "type": "string" }
  },
  "required": ["component_id"]
}
```
- **Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "component_id": { "type": "string" },
    "quantity_on_hand": { "type": "integer" },
    "quantity_reserved": { "type": "integer" },
    "quantity_available": { "type": "integer" },
    "unit_of_measure": { "type": "string" }
  }
}
```

#### Other Read Tools in Category:
- `get_supplier(supplier_id)`: Fetches vendor profile, contact details, and certifications.
- `get_purchase_order(po_id)`: Fetches PO line items, scheduled delivery, and payment terms.
- `get_tracking(shipment_id)`: Fetches real-time GPS and carrier status updates for freight.
- `get_production_schedule(plant_id)`: Fetches scheduled production runs and line allocations.
- `get_customer_orders(order_ids)`: Fetches customer order deadlines, penalty clauses, and SLAs.
- `get_supplier_history(supplier_id)`: Fetches historical delivery lead times and quality defect rates.

---

### Category B: ANALYSIS TOOLS
*Execute deterministic calculations, graph propagations, and analytical algorithms.*

#### 1. `calculate_time_to_failure`
- **Description**: Deterministically projects hours remaining until component inventory depletion halts production.
- **Permission**: `EXECUTE_ANALYSIS`
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "production_order_id": { "type": "string" },
    "component_id": { "type": "string" },
    "current_inventory": { "type": "integer" },
    "burn_rate_per_hour": { "type": "number" }
  },
  "required": ["production_order_id", "component_id", "current_inventory", "burn_rate_per_hour"]
}
```
- **Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "time_to_failure_hours": { "type": "number" },
    "depletion_timestamp": { "type": "string", "format": "date-time" },
    "production_line_halted": { "type": "boolean" }
  }
}
```

#### Other Analysis Tools in Category:
- `calculate_inventory_coverage(facility_id)`: Calculates days of supply remaining across all active SKUs.
- `calculate_impact(disruption_id)`: Traverses dependency graph to calculate total customer financial exposure.
- `analyze_supplier_risk(supplier_id)`: Computes multi-factor risk score (geopolitical, financial, operational).

---

### Category C: COMMUNICATION TOOLS
*Send external inquiries, RFQs, or operator notifications subject to approval.*

#### 1. `request_rfq`
- **Description**: Generates and dispatches a formal Request for Quotation to an alternative supplier.
- **Permission**: `DISPATCH_COMMUNICATION`
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "supplier_id": { "type": "string" },
    "component_id": { "type": "string" },
    "quantity_required": { "type": "integer" },
    "target_delivery_date": { "type": "string", "format": "date-time" }
  },
  "required": ["supplier_id", "component_id", "quantity_required"]
}
```
- **Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "rfq_id": { "type": "string" },
    "dispatch_status": { "type": "string" },
    "sent_timestamp": { "type": "string", "format": "date-time" }
  }
}
```

#### Other Communication Tools in Category:
- `send_supplier_message(supplier_id, content)`: Dispatches status update or clarification request to vendor portal.

---

### Category D: EXECUTION TOOLS
*Perform operational state mutations in enterprise systems (ERP, WMS, MES).*

#### 1. `create_purchase_order`
- **Description**: Creates a new binding purchase order in the connected ERP system.
- **Permission**: `MUTATE_ERP_STATE` (Autonomy Level 3 or Approved)
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "supplier_id": { "type": "string" },
    "component_id": { "type": "string" },
    "quantity": { "type": "integer" },
    "unit_price_usd": { "type": "number" },
    "freight_terms": { "type": "string" }
  },
  "required": ["supplier_id", "component_id", "quantity", "unit_price_usd"]
}
```
- **Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "purchase_order_id": { "type": "string" },
    "erp_confirmation_code": { "type": "string" },
    "status": { "type": "string" }
  }
}
```

#### Other Execution Tools in Category:
- `update_erp(entity_id, updates)`: Updates line-item status, delivery dates, or freight modes in ERP.
- `update_production_schedule(plant_id, schedule_matrix)`: Modifies MES job sequences and assembly assignments.

---

### Category E: VERIFICATION TOOLS
*Audit post-execution reality to confirm recovery goal achievement.*

#### 1. `verify_supplier_confirmation`
- **Description**: Checks whether an expedited supplier has formally acknowledged an issued purchase order.
- **Permission**: `READ_OPERATIONAL_DATA`
- **Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "purchase_order_id": { "type": "string" }
  },
  "required": ["purchase_order_id"]
}
```
- **Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "acknowledged": { "type": "boolean" },
    "confirmed_delivery_date": { "type": "string", "format": "date-time" },
    "variance_hours": { "type": "number" }
  }
}
```

#### Other Verification Tools in Category:
- `verify_shipment(shipment_id)`: Verifies carrier pickup scan against promised dispatch timestamp.
- `verify_inventory(facility_id, component_id)`: Verifies physical receiving dock scan matches expected replenishment quantity.
- `verify_recovery(incident_id)`: Checks overall plant operational health to confirm disruption resolution.
