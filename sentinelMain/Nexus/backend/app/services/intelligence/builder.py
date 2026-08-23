import json
import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import get_redis_client
from app.models.core import Entity, Resource, Dependency
from app.models.manufacturing import (
    Supplier, Component, Warehouse, InventoryPosition, PurchaseOrder,
    Shipment, ProductionOrder, CustomerOrder
)
from app.services.validation.registry import PRIMITIVE_REGISTRY
from scripts.seed.run_seed import compute_dataset_checksum
from app.services.intelligence.graph import OperationalGraph, OperationalNode, OperationalEdge

logger = logging.getLogger(__name__)

CACHE_KEY_PREFIX = "graph:v1:manufacturing"


async def fetch_dataset_checksum(session: AsyncSession) -> str:
    """Computes a deterministic checksum based on counts of primary records in the database."""
    num_suppliers = (await session.execute(select(Supplier.id))).scalars().all()
    num_components = (await session.execute(select(Component.id))).scalars().all()
    num_warehouses = (await session.execute(select(Warehouse.id))).scalars().all()
    num_inv = (await session.execute(select(InventoryPosition.id))).scalars().all()
    num_po = (await session.execute(select(PurchaseOrder.id))).scalars().all()
    num_shp = (await session.execute(select(Shipment.id))).scalars().all()
    num_prd = (await session.execute(select(ProductionOrder.id))).scalars().all()
    num_so = (await session.execute(select(CustomerOrder.id))).scalars().all()
    num_deps = (await session.execute(select(Dependency.id))).scalars().all()
    num_entities = (await session.execute(select(Entity.id))).scalars().all()
    num_resources = (await session.execute(select(Resource.id))).scalars().all()

    counts = {
        "suppliers": len(num_suppliers),
        "components": len(num_components),
        "warehouses": len(num_warehouses),
        "inventory_positions": len(num_inv),
        "purchase_orders": len(num_po),
        "shipments": len(num_shp),
        "production_orders": len(num_prd),
        "customer_orders": len(num_so),
        "core_entities": len(num_entities),
        "core_resources": len(num_resources),
        "core_dependencies": len(num_deps),
    }
    return compute_dataset_checksum(counts)


async def build_operational_graph_from_db(session: AsyncSession) -> OperationalGraph:
    """
    Constructs the custom OperationalGraph directly from PostgreSQL Core primitives and Adapter records.
    """
    logger.info("Constructing OperationalGraph directly from PostgreSQL DB...")
    graph = OperationalGraph()

    # 1. Fetch Entities & create ENTITY nodes
    entities_res = await session.execute(select(Entity))
    entities = entities_res.scalars().all()
    for ent in entities:
        node_id = f"ENTITY:{ent.id}"
        node = OperationalNode(
            node_id=node_id,
            primitive_type="ENTITY",
            entity_id=ent.id,
            business_code=ent.entity_code,
            domain=ent.domain,
            status=ent.status,
            attributes=dict(ent.attributes) if ent.attributes else {},
        )
        graph.add_node(node)

    # 2. Fetch Resources & create RESOURCE nodes
    resources_res = await session.execute(select(Resource))
    resources = resources_res.scalars().all()
    for res in resources:
        node_id = f"RESOURCE:{res.id}"
        node = OperationalNode(
            node_id=node_id,
            primitive_type="RESOURCE",
            entity_id=res.id,
            business_code=res.resource_code,
            domain="manufacturing",
            status="ACTIVE",
            attributes={
                "capacity_total": str(res.capacity_total),
                "capacity_available": str(res.capacity_available),
                "unit_of_measure": res.unit_of_measure,
            },
        )
        graph.add_node(node)

    # 3. Attach Manufacturing Adapter metadata to corresponding nodes
    suppliers_res = await session.execute(select(Supplier))
    for supp in suppliers_res.scalars().all():
        node = graph.get_node(f"ENTITY:{supp.entity_id}")
        if node:
            node.business_code = supp.supplier_code
            node.attributes.update({
                "supplier_id": str(supp.id),
                "supplier_code": supp.supplier_code,
                "tier": supp.tier,
                "country": supp.country,
                "reliability_score": str(supp.reliability_score),
                "monthly_capacity_units": str(supp.monthly_capacity_units),
                "allocated_capacity_units": str(supp.allocated_capacity_units),
            })

    components_res = await session.execute(select(Component))
    for comp in components_res.scalars().all():
        node = graph.get_node(f"RESOURCE:{comp.resource_id}")
        if node:
            node.business_code = comp.part_number
            node.attributes.update({
                "component_id": str(comp.id),
                "part_number": comp.part_number,
                "category": comp.category,
                "unit_cost": str(comp.unit_cost),
                "lead_time_days": comp.lead_time_days,
                "is_single_sourced": comp.is_single_sourced,
            })

    warehouses_res = await session.execute(select(Warehouse))
    for wh in warehouses_res.scalars().all():
        node = graph.get_node(f"ENTITY:{wh.entity_id}")
        if node:
            node.business_code = wh.warehouse_code
            node.attributes.update({
                "warehouse_id": str(wh.id),
                "warehouse_code": wh.warehouse_code,
                "location": wh.location,
            })

    purchase_orders_res = await session.execute(select(PurchaseOrder))
    for po in purchase_orders_res.scalars().all():
        node = graph.get_node(f"ENTITY:{po.entity_id}")
        if node:
            node.business_code = po.po_number
            node.attributes.update({
                "po_id": str(po.id),
                "po_number": po.po_number,
                "supplier_id": str(po.supplier_id),
                "status": po.status,
                "order_date": str(po.order_date),
                "expected_delivery_date": str(po.expected_delivery_date),
            })

    shipments_res = await session.execute(select(Shipment))
    for shp in shipments_res.scalars().all():
        node = graph.get_node(f"ENTITY:{shp.entity_id}")
        if node:
            node.business_code = shp.tracking_number
            node.attributes.update({
                "shipment_id": str(shp.id),
                "tracking_number": shp.tracking_number,
                "purchase_order_id": str(shp.purchase_order_id),
                "destination_warehouse_id": str(shp.destination_warehouse_id),
                "carrier": shp.carrier,
                "estimated_arrival": shp.estimated_arrival.isoformat() if shp.estimated_arrival else None,
                "status": shp.status,
            })

    production_orders_res = await session.execute(select(ProductionOrder))
    for prd in production_orders_res.scalars().all():
        node = graph.get_node(f"ENTITY:{prd.entity_id}")
        if node:
            node.business_code = prd.production_order_number
            node.attributes.update({
                "production_order_id": str(prd.id),
                "production_order_number": prd.production_order_number,
                "warehouse_id": str(prd.warehouse_id),
                "production_line_code": prd.production_line_code,
                "product_code": prd.product_code,
                "start_date": str(prd.start_date),
                "target_completion_date": str(prd.target_completion_date),
                "quantity_to_produce": str(prd.quantity_to_produce),
            })

    customer_orders_res = await session.execute(select(CustomerOrder))
    for so in customer_orders_res.scalars().all():
        node = graph.get_node(f"ENTITY:{so.entity_id}")
        if node:
            node.business_code = so.order_number
            node.attributes.update({
                "customer_order_id": str(so.id),
                "order_number": so.order_number,
                "customer_name": so.customer_name,
                "order_date": str(so.order_date),
                "requested_delivery_date": str(so.requested_delivery_date),
            })

    # 4. Fetch Dependencies & create directed edges
    deps_res = await session.execute(select(Dependency))
    dependencies = deps_res.scalars().all()
    for dep in dependencies:
        source_key = f"{dep.source_type}:{dep.source_id}"
        target_key = f"{dep.target_type}:{dep.target_id}"

        # Ensure no DEPENDENCY endpoint exists
        if dep.source_type == "DEPENDENCY" or dep.target_type == "DEPENDENCY":
            continue

        edge = OperationalEdge(
            edge_id=dep.id,
            source_node_id=source_key,
            target_node_id=target_key,
            dependency_type=dep.dependency_type,
            criticality=dep.criticality,
            lead_time_hours=dep.lead_time_hours,
        )
        graph.add_edge(edge)

    return graph


async def get_or_build_operational_graph(session: AsyncSession) -> OperationalGraph:
    """
    Returns the cached OperationalGraph from Redis if present under current dataset checksum.
    Otherwise builds from PostgreSQL and caches in Redis. Fallback to direct DB build if Redis fails.
    """
    checksum = await fetch_dataset_checksum(session)
    cache_key = f"{CACHE_KEY_PREFIX}:{checksum}"

    try:
        redis = get_redis_client()
        cached_data = await redis.get(cache_key)
        if cached_data:
            logger.info(f"Redis Cache HIT for graph key '{cache_key}'")
            graph_dict = json.loads(cached_data)
            return OperationalGraph.from_dict(graph_dict)
    except Exception as e:
        logger.warning(f"Redis unavailable or cache error: {e}. Falling back to PostgreSQL DB build.")

    # Cache miss or Redis failure
    graph = await build_operational_graph_from_db(session)

    try:
        redis = get_redis_client()
        serialized = json.dumps(graph.to_dict())
        await redis.set(cache_key, serialized, ex=3600)  # 1 hour TTL
        logger.info(f"Cached OperationalGraph in Redis under key '{cache_key}'")
    except Exception as e:
        logger.warning(f"Failed to cache graph in Redis: {e}")

    return graph
