"""phase_2_1_database_foundation

Revision ID: 20260822_0001
Revises: 
Create Date: 2026-08-22 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '20260822_0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Core Primitives
    op.create_table(
        'entities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entity_code', sa.String(64), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('entity_type', sa.String(64), nullable=False),
        sa.Column('domain', sa.String(64), nullable=False, server_default='manufacturing'),
        sa.Column('status', sa.String(32), nullable=False, server_default='ACTIVE'),
        sa.Column('attributes', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_entities_type_domain', 'entities', ['entity_type', 'domain'])

    op.create_table(
        'resources',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resource_code', sa.String(64), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('resource_type', sa.String(64), nullable=False),
        sa.Column('capacity_total', sa.Numeric(14, 4), nullable=False),
        sa.Column('capacity_available', sa.Numeric(14, 4), nullable=False),
        sa.Column('unit_of_measure', sa.String(32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('capacity_total >= 0', name='chk_res_capacity_total_non_neg'),
        sa.CheckConstraint('capacity_available >= 0', name='chk_res_capacity_avail_non_neg'),
    )

    op.create_table(
        'events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('source_entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='SET NULL'), nullable=True),
        sa.Column('event_type', sa.String(64), nullable=False),
        sa.Column('severity', sa.String(32), nullable=False),
        sa.Column('confidence', sa.Numeric(3, 2), nullable=False, server_default='1.00'),
        sa.Column('payload', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ingested_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('confidence >= 0.00 AND confidence <= 1.00', name='chk_event_confidence_range'),
    )
    op.create_index('idx_events_type_occurred', 'events', ['event_type', 'occurred_at'])

    op.create_table(
        'constraints',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('target_entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('constraint_type', sa.String(64), nullable=False),
        sa.Column('operator', sa.String(16), nullable=False),
        sa.Column('threshold_value', sa.Text, nullable=False),
        sa.Column('is_hard_constraint', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    op.create_table(
        'actions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('target_entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('action_type', sa.String(64), nullable=False),
        sa.Column('parameters', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('estimated_cost', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('estimated_lead_time_hours', sa.Numeric(8, 2), nullable=False, server_default='0.00'),
        sa.Column('autonomy_level', sa.Integer, nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    op.create_table(
        'metrics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('target_entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('metric_name', sa.String(64), nullable=False),
        sa.Column('value', sa.Numeric(14, 4), nullable=False),
        sa.Column('unit', sa.String(32), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    op.create_table(
        'dependencies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('source_type', sa.String(32), nullable=False),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_type', sa.String(32), nullable=False),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dependency_type', sa.String(64), nullable=False),
        sa.Column('criticality', sa.String(32), nullable=False, server_default='MEDIUM'),
        sa.Column('lead_time_hours', sa.Numeric(8, 2), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('lead_time_hours >= 0', name='chk_dep_lead_time_non_neg'),
    )
    op.create_index('idx_dep_source', 'dependencies', ['source_type', 'source_id'])
    op.create_index('idx_dep_target', 'dependencies', ['target_type', 'target_id'])

    # 2. Manufacturing Adapter Tables
    op.create_table(
        'suppliers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('supplier_code', sa.String(64), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('tier', sa.String(32), nullable=False, server_default='TIER_1'),
        sa.Column('country', sa.String(3), nullable=False),
        sa.Column('reliability_score', sa.Numeric(3, 2), nullable=False, server_default='1.00'),
        sa.Column('monthly_capacity_units', sa.Numeric(14, 4), nullable=False, server_default='10000.0000'),
        sa.Column('allocated_capacity_units', sa.Numeric(14, 4), nullable=False, server_default='0.0000'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('reliability_score >= 0.00 AND reliability_score <= 1.00', name='chk_supp_reliability_range'),
        sa.CheckConstraint('monthly_capacity_units > 0', name='chk_supp_monthly_cap_pos'),
        sa.CheckConstraint('allocated_capacity_units >= 0', name='chk_supp_alloc_cap_non_neg'),
        sa.CheckConstraint('allocated_capacity_units <= monthly_capacity_units', name='chk_supplier_capacity_allocated'),
    )

    op.create_table(
        'components',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('resource_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('resources.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('part_number', sa.String(64), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('category', sa.String(64), nullable=False),
        sa.Column('unit_cost', sa.Numeric(12, 4), nullable=False),
        sa.Column('lead_time_days', sa.Integer, nullable=False),
        sa.Column('is_single_sourced', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('unit_cost >= 0', name='chk_comp_unit_cost_non_neg'),
        sa.CheckConstraint('lead_time_days >= 0', name='chk_comp_lead_time_non_neg'),
    )

    op.create_table(
        'warehouses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('warehouse_code', sa.String(64), nullable=False, unique=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('location', sa.String(255), nullable=False),
        sa.Column('total_capacity_sqm', sa.Numeric(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('total_capacity_sqm > 0', name='chk_wh_capacity_pos'),
    )

    op.create_table(
        'inventory_positions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('warehouse_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('warehouses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('component_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('components.id', ondelete='CASCADE'), nullable=False),
        sa.Column('quantity_on_hand', sa.Numeric(14, 4), nullable=False, server_default='0.0000'),
        sa.Column('quantity_reserved', sa.Numeric(14, 4), nullable=False, server_default='0.0000'),
        sa.Column('safety_stock_level', sa.Numeric(14, 4), nullable=False, server_default='0.0000'),
        sa.Column('reorder_point', sa.Numeric(14, 4), nullable=False, server_default='0.0000'),
        sa.Column('average_daily_demand', sa.Numeric(14, 4), nullable=False, server_default='0.0000'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('warehouse_id', 'component_id', name='uq_inventory_warehouse_component'),
        sa.CheckConstraint('quantity_on_hand >= 0', name='chk_inv_on_hand_non_neg'),
        sa.CheckConstraint('quantity_reserved >= 0', name='chk_inv_reserved_non_neg'),
        sa.CheckConstraint('safety_stock_level >= 0', name='chk_inv_safety_stock_non_neg'),
        sa.CheckConstraint('reorder_point >= 0', name='chk_inv_reorder_point_non_neg'),
        sa.CheckConstraint('average_daily_demand >= 0', name='chk_inv_demand_non_neg'),
        sa.CheckConstraint('quantity_reserved <= quantity_on_hand', name='chk_reserved_le_on_hand'),
    )
    op.create_index('idx_inv_pos_wh_comp', 'inventory_positions', ['warehouse_id', 'component_id'])

    op.create_table(
        'purchase_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('po_number', sa.String(64), nullable=False, unique=True),
        sa.Column('supplier_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('suppliers.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('status', sa.String(32), nullable=False, server_default='DRAFT'),
        sa.Column('order_date', sa.Date, nullable=False),
        sa.Column('expected_delivery_date', sa.Date, nullable=False),
        sa.Column('total_amount', sa.Numeric(14, 2), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('total_amount >= 0', name='chk_po_total_non_neg'),
        sa.CheckConstraint('expected_delivery_date >= order_date', name='chk_po_delivery_after_order'),
    )

    op.create_table(
        'purchase_order_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('purchase_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('purchase_orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('component_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('components.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('quantity_ordered', sa.Numeric(14, 4), nullable=False),
        sa.Column('quantity_received', sa.Numeric(14, 4), nullable=False, server_default='0.0000'),
        sa.Column('unit_price', sa.Numeric(12, 4), nullable=False),
        sa.CheckConstraint('quantity_ordered > 0', name='chk_po_item_qty_ordered_pos'),
        sa.CheckConstraint('quantity_received >= 0', name='chk_po_item_qty_received_non_neg'),
        sa.CheckConstraint('unit_price >= 0', name='chk_po_item_unit_price_non_neg'),
        sa.CheckConstraint('quantity_received <= quantity_ordered', name='chk_po_item_received_le_ordered'),
    )

    op.create_table(
        'shipments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('tracking_number', sa.String(64), nullable=False, unique=True),
        sa.Column('purchase_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('purchase_orders.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('destination_warehouse_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('warehouses.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('status', sa.String(32), nullable=False, server_default='SCHEDULED'),
        sa.Column('carrier', sa.String(128), nullable=False),
        sa.Column('estimated_arrival', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actual_arrival', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    op.create_table(
        'production_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('production_order_number', sa.String(64), nullable=False, unique=True),
        sa.Column('warehouse_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('warehouses.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('production_line_code', sa.String(64), nullable=False),
        sa.Column('product_code', sa.String(64), nullable=False),
        sa.Column('status', sa.String(32), nullable=False, server_default='PLANNED'),
        sa.Column('start_date', sa.Date, nullable=False),
        sa.Column('target_completion_date', sa.Date, nullable=False),
        sa.Column('quantity_to_produce', sa.Numeric(14, 4), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('quantity_to_produce > 0', name='chk_prod_qty_to_produce_pos'),
        sa.CheckConstraint('target_completion_date >= start_date', name='chk_prod_order_dates'),
    )
    op.create_index('idx_prod_order_line', 'production_orders', ['warehouse_id', 'production_line_code'])

    op.create_table(
        'production_order_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('production_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('production_orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('component_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('components.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('quantity_required', sa.Numeric(14, 4), nullable=False),
        sa.Column('quantity_issued', sa.Numeric(14, 4), nullable=False, server_default='0.0000'),
        sa.CheckConstraint('quantity_required > 0', name='chk_prod_item_qty_req_pos'),
        sa.CheckConstraint('quantity_issued >= 0', name='chk_prod_item_qty_issued_non_neg'),
    )

    op.create_table(
        'customer_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('entities.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('order_number', sa.String(64), nullable=False, unique=True),
        sa.Column('customer_name', sa.String(255), nullable=False),
        sa.Column('status', sa.String(32), nullable=False, server_default='RECEIVED'),
        sa.Column('order_date', sa.Date, nullable=False),
        sa.Column('requested_delivery_date', sa.Date, nullable=False),
        sa.Column('total_value', sa.Numeric(14, 2), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('total_value >= 0', name='chk_cust_order_value_non_neg'),
        sa.CheckConstraint('requested_delivery_date >= order_date', name='chk_cust_order_dates'),
    )

    op.create_table(
        'customer_order_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('customer_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('customer_orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_code', sa.String(64), nullable=False),
        sa.Column('quantity', sa.Numeric(14, 4), nullable=False),
        sa.Column('unit_price', sa.Numeric(12, 4), nullable=False),
        sa.CheckConstraint('quantity > 0', name='chk_cust_item_qty_pos'),
        sa.CheckConstraint('unit_price >= 0', name='chk_cust_item_unit_price_non_neg'),
    )

    op.create_table(
        'customer_order_production_allocations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('customer_order_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('customer_order_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('production_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('production_orders.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('allocated_quantity', sa.Numeric(14, 4), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('allocated_quantity > 0', name='chk_alloc_qty_pos'),
    )

    op.create_table(
        'supplier_performance',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('supplier_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('suppliers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('evaluation_date', sa.Date, nullable=False),
        sa.Column('on_time_delivery_rate', sa.Numeric(3, 2), nullable=False),
        sa.Column('quality_defect_rate', sa.Numeric(3, 2), nullable=False),
        sa.Column('response_lead_time_days', sa.Numeric(6, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint('on_time_delivery_rate >= 0.00 AND on_time_delivery_rate <= 1.00', name='chk_perf_ontime_range'),
        sa.CheckConstraint('quality_defect_rate >= 0.00 AND quality_defect_rate <= 1.00', name='chk_perf_defect_range'),
        sa.CheckConstraint('response_lead_time_days >= 0', name='chk_perf_lead_time_non_neg'),
    )
    op.create_index('idx_supp_perf_supp_date', 'supplier_performance', ['supplier_id', 'evaluation_date'])


def downgrade() -> None:
    # Manufacturing Adapter Tables Drop
    op.drop_table('supplier_performance', if_exists=True)
    op.drop_table('customer_order_production_allocations', if_exists=True)
    op.drop_table('customer_order_items', if_exists=True)
    op.drop_table('customer_orders', if_exists=True)
    op.drop_table('production_order_items', if_exists=True)
    op.drop_table('production_orders', if_exists=True)
    op.drop_table('shipments', if_exists=True)
    op.drop_table('purchase_order_items', if_exists=True)
    op.drop_table('purchase_orders', if_exists=True)
    op.drop_table('inventory_positions', if_exists=True)
    op.drop_table('warehouses', if_exists=True)
    op.drop_table('components', if_exists=True)
    op.drop_table('suppliers', if_exists=True)

    # Core Tables Drop
    op.drop_table('dependencies', if_exists=True)
    op.drop_table('metrics', if_exists=True)
    op.drop_table('actions', if_exists=True)
    op.drop_table('constraints', if_exists=True)
    op.drop_table('events', if_exists=True)
    op.drop_table('resources', if_exists=True)
    op.drop_table('entities', if_exists=True)

