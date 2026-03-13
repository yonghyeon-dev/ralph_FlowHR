"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Button,
  DataTable,
  Input,
  Select,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import { Modal } from "@/components/layout/Modal";

// ─── Types ──────────────────────────────────────────────────

interface ScheduledReport {
  id: string;
  name: string;
  schedule: string;
  format: string;
  recipients: string;
  lastSent: string;
  active: boolean;
}

interface FormData {
  name: string;
  schedule: string;
  format: string;
  recipients: string;
}

// ─── Constants ──────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  name: "",
  schedule: "",
  format: "Excel",
  recipients: "",
};

const FORMAT_OPTIONS = [
  { value: "Excel", label: "Excel" },
  { value: "PDF", label: "PDF" },
  { value: "PDF + Excel", label: "PDF + Excel" },
  { value: "CSV", label: "CSV" },
];

// ─── Helpers ────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ─── Component ──────────────────────────────────────────────

export default function ScheduledReportsPage() {
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduledReport | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/scheduled");
      if (res.ok) {
        const json = await res.json();
        setSchedules(json.schedules);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // ── Modal helpers ──

  function openCreateModal() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(item: ScheduledReport) {
    setEditingItem(item);
    setForm({
      name: item.name,
      schedule: item.schedule,
      format: item.format,
      recipients: item.recipients,
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  // ── CRUD actions ──

  async function handleSave() {
    if (!form.name || !form.schedule || !form.format || !form.recipients) {
      setError("모든 항목을 입력해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingItem) {
        const res = await fetch("/api/reports/scheduled", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...form }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "수정에 실패했습니다.");
          return;
        }
      } else {
        const res = await fetch("/api/reports/scheduled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "추가에 실패했습니다.");
          return;
        }
      }
      closeModal();
      await fetchSchedules();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: ScheduledReport) {
    await fetch("/api/reports/scheduled", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    await fetchSchedules();
  }

  async function handleDelete(item: ScheduledReport) {
    await fetch(`/api/reports/scheduled?id=${item.id}`, {
      method: "DELETE",
    });
    await fetchSchedules();
  }

  // ── Table columns ──

  const columns: Column<ScheduledReport>[] = [
    {
      key: "name",
      header: "보고서명",
      render: (row) => (
        <span className="font-semibold text-text-primary">{row.name}</span>
      ),
    },
    {
      key: "schedule",
      header: "스케줄",
    },
    {
      key: "format",
      header: "형식",
    },
    {
      key: "recipients",
      header: "수신자",
    },
    {
      key: "lastSent",
      header: "마지막 발송",
      render: (row) => formatDate(row.lastSent),
    },
    {
      key: "active",
      header: "상태",
      render: (row) =>
        row.active ? (
          <Badge variant="success">활성</Badge>
        ) : (
          <Badge variant="neutral">비활성</Badge>
        ),
    },
    {
      key: "actions",
      header: "액션",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-sp-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
          >
            편집
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(row);
            }}
          >
            {row.active ? "비활성화" : "활성화"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
          >
            삭제
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-sp-12">
        <span className="text-sm text-text-tertiary">불러오는 중...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-sp-6">
        <div className="mb-sp-2 text-sm text-text-secondary">
          <Link href="/admin/reports" className="hover:text-text-primary">
            리포트 센터
          </Link>
          {" > "}
          <span className="text-text-primary">예약 보고서</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              예약 보고서
            </h1>
            <p className="mt-sp-1 text-md text-text-secondary">
              정기 보고서 스케줄 관리
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            예약 추가
          </Button>
        </div>
      </div>

      {/* Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle>예약 보고서</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable<ScheduledReport>
            columns={columns}
            data={schedules}
            keyExtractor={(row) => row.id}
            emptyMessage="등록된 예약 보고서가 없습니다."
          />
        </CardBody>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingItem ? "예약 보고서 수정" : "예약 보고서 추가"}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeModal}>
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? "저장 중..."
                : editingItem
                  ? "수정"
                  : "추가"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-sp-4">
          {error && (
            <div className="rounded-md bg-status-danger-bg p-sp-3 text-sm text-status-danger">
              {error}
            </div>
          )}
          <div>
            <label className="mb-sp-1 block text-sm font-medium text-text-secondary">
              보고서명
            </label>
            <Input
              placeholder="예: 주간 근태 리포트"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-sp-1 block text-sm font-medium text-text-secondary">
              스케줄
            </label>
            <Input
              placeholder="예: 매주 월요일 09:00"
              value={form.schedule}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, schedule: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-sp-1 block text-sm font-medium text-text-secondary">
              형식
            </label>
            <Select
              options={FORMAT_OPTIONS}
              value={form.format}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, format: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-sp-1 block text-sm font-medium text-text-secondary">
              수신자
            </label>
            <Input
              placeholder="예: 인사팀 전체"
              value={form.recipients}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, recipients: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
