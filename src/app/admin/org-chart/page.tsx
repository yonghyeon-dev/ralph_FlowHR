"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────

interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  manager: { id: string; name: string; position: string | null } | null;
  employeeCount: number;
  children: DepartmentNode[];
}

// ─── Helpers ────────────────────────────────────────────────

function getTotalCount(node: DepartmentNode): number {
  return node.employeeCount + node.children.reduce((sum, c) => sum + getTotalCount(c), 0);
}

// ─── Component ──────────────────────────────────────────────

export default function OrgChartPage() {
  const [tree, setTree] = useState<DepartmentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/departments/tree")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setTree(json.data);
          // Expand root nodes by default
          const rootIds = new Set<string>(json.data.map((n: DepartmentNode) => n.id));
          setExpandedIds(rootIds);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function expandAll() {
    const allIds = new Set<string>();
    function collect(nodes: DepartmentNode[]) {
      for (const n of nodes) {
        if (n.children.length > 0) allIds.add(n.id);
        collect(n.children);
      }
    }
    collect(tree);
    setExpandedIds(allIds);
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">조직도</h1>
          <p className="mt-sp-1 text-md text-text-secondary">
            부서별 트리 구조와 인원 현황을 확인합니다
          </p>
        </div>
        <div className="flex gap-sp-2">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-md border border-border bg-surface-primary px-sp-3 py-sp-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            전체 펼치기
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-md border border-border bg-surface-primary px-sp-3 py-sp-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            전체 접기
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="rounded-lg border border-border bg-surface-primary p-sp-6 shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-sp-12">
            <span className="text-sm text-text-tertiary">불러오는 중...</span>
          </div>
        ) : tree.length === 0 ? (
          <div className="flex items-center justify-center py-sp-12">
            <span className="text-sm text-text-tertiary">등록된 부서가 없습니다</span>
          </div>
        ) : (
          <div className="space-y-sp-1">
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tree Node ──────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  expandedIds,
  onToggle,
}: {
  node: DepartmentNode;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (_id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const totalCount = getTotalCount(node);

  return (
    <div>
      {/* Node row */}
      <div
        className="group flex items-center gap-sp-3 rounded-md px-sp-3 py-sp-2 transition-colors hover:bg-surface-secondary"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={[
            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs",
            hasChildren
              ? "text-text-secondary hover:bg-surface-tertiary cursor-pointer"
              : "text-transparent cursor-default",
          ].join(" ")}
        >
          {hasChildren ? (isExpanded ? "▼" : "▶") : "·"}
        </button>

        {/* Department icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-xs font-semibold text-brand-text">
          {node.name.slice(0, 2)}
        </div>

        {/* Department info */}
        <div className="flex min-w-0 flex-1 items-center gap-sp-3">
          <div className="min-w-0">
            <span className="font-medium text-text-primary">{node.name}</span>
            <span className="ml-sp-2 text-xs text-text-tertiary">{node.code}</span>
          </div>

          {/* Manager */}
          {node.manager && (
            <span className="shrink-0 text-xs text-text-secondary">
              {node.manager.name}
              {node.manager.position && (
                <span className="text-text-tertiary"> · {node.manager.position}</span>
              )}
            </span>
          )}
        </div>

        {/* Employee count badges */}
        <div className="flex shrink-0 items-center gap-sp-2">
          <Badge variant="info">{node.employeeCount}명</Badge>
          {hasChildren && totalCount !== node.employeeCount && (
            <span className="text-xs text-text-tertiary">
              (전체 {totalCount}명)
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
