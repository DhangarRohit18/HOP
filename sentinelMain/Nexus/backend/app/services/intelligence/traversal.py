import heapq
from typing import List, Set, Dict, Optional, Tuple
from app.services.intelligence.graph import OperationalGraph, OperationalNode

MAX_DEPTH = 15
MAX_CRITICAL_PATH_DEPTH = 15
MAX_CRITICAL_PATHS = 100


def traverse_downstream(
    graph: OperationalGraph,
    start_node_id: str,
    max_depth: int = MAX_DEPTH,
) -> Tuple[List[str], List[List[str]]]:
    """
    Executes a deterministic downstream BFS starting from start_node_id.
    Returns (visited_node_ids, causal_paths).
    Neighbor nodes are sorted alphabetically by node_id.
    """
    if start_node_id not in graph.nodes:
        return [], []

    visited: Set[str] = {start_node_id}
    ordered_nodes: List[str] = [start_node_id]
    paths: List[List[str]] = [[start_node_id]]

    # Queue element: (current_node_id, depth, current_path)
    queue: List[Tuple[str, int, List[str]]] = [(start_node_id, 0, [start_node_id])]

    while queue:
        curr_id, depth, path = queue.pop(0)

        if depth >= max_depth:
            continue

        neighbors = graph.get_outgoing_neighbors(curr_id)
        # Guarantees deterministic neighbor order
        sorted_neighbors = sorted(neighbors)

        for nxt_id in sorted_neighbors:
            if nxt_id not in visited:
                visited.add(nxt_id)
                ordered_nodes.append(nxt_id)
                new_path = path + [nxt_id]
                paths.append(new_path)
                queue.append((nxt_id, depth + 1, new_path))

    return ordered_nodes, paths


def traverse_upstream(
    graph: OperationalGraph,
    start_node_id: str,
    max_depth: int = MAX_DEPTH,
) -> Tuple[List[str], List[List[str]]]:
    """
    Executes a deterministic reverse/upstream BFS starting from start_node_id.
    Returns (visited_node_ids, causal_paths).
    Neighbor nodes are sorted alphabetically by node_id.
    """
    if start_node_id not in graph.nodes:
        return [], []

    visited: Set[str] = {start_node_id}
    ordered_nodes: List[str] = [start_node_id]
    paths: List[List[str]] = [[start_node_id]]

    queue: List[Tuple[str, int, List[str]]] = [(start_node_id, 0, [start_node_id])]

    while queue:
        curr_id, depth, path = queue.pop(0)

        if depth >= max_depth:
            continue

        neighbors = graph.get_incoming_neighbors(curr_id)
        sorted_neighbors = sorted(neighbors)

        for prev_id in sorted_neighbors:
            if prev_id not in visited:
                visited.add(prev_id)
                ordered_nodes.append(prev_id)
                new_path = [prev_id] + path
                paths.append(new_path)
                queue.append((prev_id, depth + 1, new_path))

    return ordered_nodes, paths


def find_shortest_causal_path(
    graph: OperationalGraph,
    source_node_id: str,
    target_node_id: str,
) -> Optional[List[str]]:
    """
    Dijkstra's algorithm finding shortest lead-time causal path from source to target.
    Deterministic tie-breaking by node_id.
    """
    if source_node_id not in graph.nodes or target_node_id not in graph.nodes:
        return None

    # Priority queue item: (cumulative_lead_time, current_node_id, path)
    pq: List[Tuple[float, str, List[str]]] = [(0.0, source_node_id, [source_node_id])]
    visited: Dict[str, float] = {source_node_id: 0.0}

    while pq:
        dist, curr_id, path = heapq.heappop(pq)

        if curr_id == target_node_id:
            return path

        if dist > visited.get(curr_id, float("inf")):
            continue

        neighbors = sorted(graph.get_outgoing_neighbors(curr_id))
        for nxt_id in neighbors:
            edge = graph.get_edge(curr_id, nxt_id)
            lead_time = float(edge.lead_time_hours) if edge else 0.0
            new_dist = dist + lead_time

            if new_dist < visited.get(nxt_id, float("inf")):
                visited[nxt_id] = new_dist
                heapq.heappush(pq, (new_dist, nxt_id, path + [nxt_id]))

    return None


def find_critical_paths(
    graph: OperationalGraph,
    source_node_id: str,
    max_depth: int = MAX_CRITICAL_PATH_DEPTH,
    max_paths: int = MAX_CRITICAL_PATHS,
) -> List[List[str]]:
    """
    DFS discovering high-criticality paths connecting source to target nodes.
    Safety limits enforced:
    - MAX_CRITICAL_PATH_DEPTH = 15
    - MAX_CRITICAL_PATHS = 100
    - Deterministic neighbor sorting
    - Cycle protection via current_path_nodes
    """
    if source_node_id not in graph.nodes:
        return []

    results: List[List[str]] = []

    def dfs(curr_id: str, depth: int, current_path: List[str], path_nodes: Set[str]):
        if len(results) >= max_paths:
            return

        if depth >= max_depth:
            results.append(list(current_path))
            return

        neighbors = sorted(graph.get_outgoing_neighbors(curr_id))
        has_critical_neighbor = False

        for nxt_id in neighbors:
            edge = graph.get_edge(curr_id, nxt_id)
            if edge and edge.criticality in ["HIGH", "CRITICAL"]:
                if nxt_id not in path_nodes:
                    has_critical_neighbor = True
                    dfs(
                        nxt_id,
                        depth + 1,
                        current_path + [nxt_id],
                        path_nodes | {nxt_id},
                    )

        if not has_critical_neighbor and len(current_path) > 1:
            results.append(list(current_path))

    dfs(source_node_id, 0, [source_node_id], {source_node_id})
    return results[:max_paths]
