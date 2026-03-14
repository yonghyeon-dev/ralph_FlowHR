"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Button,
  DataTable,
  QueueList,
  QueueItem,
} from "@/components/ui";
import type { Column, QueuePriority } from "@/components/ui";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface SignatureDoc {
  id: string;
  icon: string;
  title: string;
  sender: string;
  deadline: string;
  priority: QueuePriority;
  priorityLabel: string;
}

type DocCategory = "all" | "contract" | "certificate" | "notice" | "pledge" | "statement";

interface ArchivedDoc {
  id: string;
  name: string;
  type: string;
  typeBadge: "info" | "neutral" | "warning";
  sender: string;
  receivedAt: string;
  signStatus: "signed" | "not_required";
}

type ViewMode = "list" | "viewer";

/* ────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────── */

const PENDING_DOCS: SignatureDoc[] = [
  {
    id: "doc-1",
    icon: "\uD83D\uDCDD",
    title: "\uADFC\uB85C\uACC4\uC57D\uC11C (2026\uB144 \uAC31\uC2E0)",
    sender: "\uC778\uC0AC\uD300",
    deadline: "\uC624\uB298 (3/14)",
    priority: "critical",
    priorityLabel: "\uAE34\uAE09",
  },
  {
    id: "doc-2",
    icon: "\uD83D\uDCC4",
    title: "\uC5F0\uBD09 \uBCC0\uACBD \uD1B5\uC9C0\uC11C",
    sender: "\uC778\uC0AC\uD300",
    deadline: "3/15 (\uAE08)",
    priority: "high",
    priorityLabel: "\uB192\uC74C",
  },
  {
    id: "doc-3",
    icon: "\uD83D\uDD12",
    title: "NDA \uAC31\uC2E0",
    sender: "\uBC95\uBB34\uD300",
    deadline: "3/20 (\uBAA9)",
    priority: "medium",
    priorityLabel: "\uBCF4\uD1B5",
  },
];

const PRIORITY_BADGE_MAP: Record<QueuePriority, "danger" | "warning" | "info" | "neutral"> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

const CATEGORY_FILTERS: { value: DocCategory; label: string }[] = [
  { value: "all", label: "\uC804\uCCB4" },
  { value: "contract", label: "\uACC4\uC57D\uC11C" },
  { value: "certificate", label: "\uC99D\uBA85\uC11C" },
  { value: "notice", label: "\uD1B5\uC9C0\uC11C" },
  { value: "pledge", label: "\uC11C\uC57D\uC11C" },
  { value: "statement", label: "\uBA85\uC138\uC11C" },
];

const ARCHIVED_DOCS: ArchivedDoc[] = [
  {
    id: "arc-1",
    name: "\uADFC\uB85C\uACC4\uC57D\uC11C (2025\uB144)",
    type: "\uACC4\uC57D\uC11C",
    typeBadge: "info",
    sender: "\uC778\uC0AC\uD300",
    receivedAt: "2025-03-15",
    signStatus: "signed",
  },
  {
    id: "arc-2",
    name: "\uC5F0\uBD09 \uBCC0\uACBD \uD1B5\uC9C0\uC11C (2025)",
    type: "\uD1B5\uC9C0\uC11C",
    typeBadge: "neutral",
    sender: "\uC778\uC0AC\uD300",
    receivedAt: "2025-03-10",
    signStatus: "signed",
  },
  {
    id: "arc-3",
    name: "NDA (\uAE30\uBC00\uC720\uC9C0\uC11C\uC57D\uC11C)",
    type: "\uC11C\uC57D\uC11C",
    typeBadge: "warning",
    sender: "\uBC95\uBB34\uD300",
    receivedAt: "2025-01-05",
    signStatus: "signed",
  },
  {
    id: "arc-4",
    name: "\uC7AC\uC9C1\uC99D\uBA85\uC11C",
    type: "\uC99D\uBA85\uC11C",
    typeBadge: "info",
    sender: "\uC778\uC0AC\uD300",
    receivedAt: "2025-11-20",
    signStatus: "not_required",
  },
  {
    id: "arc-5",
    name: "\uAE09\uC5EC \uBA85\uC138\uC11C (2026-02)",
    type: "\uBA85\uC138\uC11C",
    typeBadge: "neutral",
    sender: "\uAE09\uC5EC\uD300",
    receivedAt: "2026-02-25",
    signStatus: "not_required",
  },
  {
    id: "arc-6",
    name: "\uAE09\uC5EC \uBA85\uC138\uC11C (2026-03)",
    type: "\uBA85\uC138\uC11C",
    typeBadge: "neutral",
    sender: "\uAE09\uC5EC\uD300",
    receivedAt: "2026-03-12",
    signStatus: "not_required",
  },
  {
    id: "arc-7",
    name: "\uAC1C\uC778\uC815\uBCF4 \uB3D9\uC758\uC11C (\uAC31\uC2E0)",
    type: "\uC11C\uC57D\uC11C",
    typeBadge: "warning",
    sender: "\uBCF4\uC548\uD300",
    receivedAt: "2025-06-01",
    signStatus: "signed",
  },
];

const CATEGORY_TYPE_MAP: Record<string, DocCategory> = {
  "\uACC4\uC57D\uC11C": "contract",
  "\uC99D\uBA85\uC11C": "certificate",
  "\uD1B5\uC9C0\uC11C": "notice",
  "\uC11C\uC57D\uC11C": "pledge",
  "\uBA85\uC138\uC11C": "statement",
};

/* ────────────────────────────────────────────
   Archive Table Columns
   ──────────────────────────────────────────── */

const ARCHIVE_COLUMNS: Column<ArchivedDoc>[] = [
  {
    key: "name",
    header: "\uBB38\uC11C\uBA85",
    render: (row) => <span className="font-semibold text-text-primary">{row.name}</span>,
  },
  {
    key: "type",
    header: "\uC720\uD615",
    render: (row) => <Badge variant={row.typeBadge}>{row.type}</Badge>,
  },
  { key: "sender", header: "\uBC1C\uC2E0" },
  { key: "receivedAt", header: "\uC218\uC2E0\uC77C" },
  {
    key: "signStatus",
    header: "\uC11C\uBA85 \uC0C1\uD0DC",
    render: (row) =>
      row.signStatus === "signed" ? (
        <Badge variant="success">{"\uC11C\uBA85 \uC644\uB8CC"}</Badge>
      ) : (
        <Badge variant="neutral">{"\uC11C\uBA85 \uBD88\uD544\uC694"}</Badge>
      ),
  },
  {
    key: "download",
    header: "\uB2E4\uC6B4\uB85C\uB4DC",
    align: "right" as const,
    render: () => (
      <Button variant="ghost" size="sm">
        {"\uD83D\uDCE5 PDF"}
      </Button>
    ),
  },
];

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */

export default function EmployeeDocumentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDoc, setSelectedDoc] = useState<SignatureDoc | null>(null);
  const [signed, setSigned] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<DocCategory>("all");

  const filteredArchive =
    categoryFilter === "all"
      ? ARCHIVED_DOCS
      : ARCHIVED_DOCS.filter((d) => CATEGORY_TYPE_MAP[d.type] === categoryFilter);

  function handleSign(doc: SignatureDoc) {
    setSelectedDoc(doc);
    setViewMode("viewer");
    setSigned(false);
    setSignatureDrawn(false);
  }

  function handleSignComplete() {
    setSigned(true);
    setViewMode("list");
    setSelectedDoc(null);
    setSignatureDrawn(false);
  }

  function handleBack() {
    setViewMode("list");
    setSelectedDoc(null);
    setSigned(false);
    setSignatureDrawn(false);
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-sp-6">
        <div className="text-sm text-text-tertiary mb-sp-1">
          {viewMode === "viewer" ? "\uD648 > \uBB38\uC11C \xB7 \uC11C\uBA85 > \uBB38\uC11C \uBDF0\uC5B4" : "\uD648 > \uBB38\uC11C \xB7 \uC11C\uBA85"}
        </div>
        <h1 className="text-xl font-bold text-text-primary">
          {viewMode === "viewer" ? "\uBB38\uC11C \uBDF0\uC5B4" : "\uBB38\uC11C \xB7 \uC11C\uBA85"}
        </h1>
        <p className="text-sm text-text-tertiary mt-sp-1">
          {viewMode === "viewer"
            ? "\uBB38\uC11C \uBBF8\uB9AC\uBCF4\uAE30 \uBC0F \uC804\uC790\uC11C\uBA85"
            : "\uC11C\uBA85 \uB300\uAE30 \uBB38\uC11C\uC640 \uBCF4\uAD00 \uBB38\uC11C\uB97C \uAD00\uB9AC\uD558\uC138\uC694"}
        </p>
      </div>

      {/* Signing success toast */}
      {signed && (
        <div className="mb-sp-6 p-sp-4 rounded-lg bg-status-success-soft border border-status-success text-sm text-status-success font-medium">
          {"\uC11C\uBA85\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4."}
        </div>
      )}

      {/* TE-402: Document Viewer */}
      {viewMode === "viewer" && selectedDoc && (
        <Card className="mb-sp-6">
          <CardHeader>
            <div>
              <CardTitle>{selectedDoc.title}</CardTitle>
              <div className="text-sm text-text-tertiary mt-sp-1">
                {selectedDoc.sender} {"\uBC1C\uC1A1"} {"\xB7"} 2026-03-10 {"\uC0DD\uC131"} {"\xB7"} PDF 2{"\uD398\uC774\uC9C0"}
              </div>
            </div>
            <div className="flex gap-sp-2">
              <Button variant="ghost" size="sm">
                {"\uB2E4\uC6B4\uB85C\uB4DC"}
              </Button>
              <Button variant="ghost" size="sm">
                {"\uC778\uC1C4"}
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {/* Document Preview Area */}
            <div className="bg-surface-secondary border border-border rounded-lg flex items-center justify-center mb-sp-5" style={{ minHeight: 360 }}>
              <div className="w-4/5 max-w-[520px] bg-white border border-border rounded-md p-sp-8 shadow-md">
                <div className="text-center mb-sp-6">
                  <div className="text-xl font-bold">{"\uADFC \uB85C \uACC4 \uC57D \uC11C"}</div>
                  <div className="text-sm text-text-tertiary mt-sp-4">2026{"\uB144"} {"\uAC31\uC2E0"}</div>
                </div>
                <div className="text-sm text-text-secondary leading-8">
                  <p>{"\uC81C1\uC870"} ({"\uACC4\uC57D\uAE30\uAC04"}) 2026{"\uB144"} 4{"\uC6D4"} 1{"\uC77C"} ~ 2027{"\uB144"} 3{"\uC6D4"} 31{"\uC77C"}</p>
                  <p>{"\uC81C2\uC870"} ({"\uADFC\uBB34\uC7A5\uC18C"}) {"\uC11C\uC6B8\uD2B9\uBCC4\uC2DC"} {"\uAC15\uB0A8\uAD6C"} {"\uD14C\uD5E4\uB780\uB85C"} 123</p>
                  <p>{"\uC81C3\uC870"} ({"\uC5C5\uBB34\uB0B4\uC6A9"}) Product Design Lead</p>
                  <p>{"\uC81C4\uC870"} ({"\uADFC\uB85C\uC2DC\uAC04"}) 09:00 ~ 18:00 ({"\uD734\uAC8C"} 12:00~13:00)</p>
                  <p className="text-text-tertiary">... ({"\uC774\uD558"} {"\uB0B4\uC6A9"} {"\uC0DD\uB7B5"}) ...</p>
                </div>
              </div>
            </div>

            {/* Signature Pad Area */}
            <div
              className="border-2 border-dashed border-brand rounded-lg p-sp-6 text-center"
              style={{ background: "var(--brand-soft, #eef2ff)" }}
            >
              <div className="text-2xl mb-sp-2">{"\u270D\uFE0F"}</div>
              <div className="font-semibold text-brand mb-sp-2">{"\uC11C\uBA85 \uC601\uC5ED"}</div>
              <div className="text-sm text-text-tertiary">{"\uD130\uCE58 \uB610\uB294 \uB9C8\uC6B0\uC2A4\uB85C \uC11C\uBA85\uD574 \uC8FC\uC138\uC694"}</div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSignatureDrawn(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSignatureDrawn(true);
                }}
                className="h-20 bg-white border border-border rounded-md mt-sp-4 flex items-center justify-center cursor-pointer hover:border-brand transition-colors"
              >
                {signatureDrawn ? (
                  <span className="text-lg text-brand font-semibold italic">{"\uBBFC\uC9C0\uC6B0"}</span>
                ) : (
                  <span className="text-sm text-text-tertiary">{"\uC5EC\uAE30\uC5D0 \uC11C\uBA85"}</span>
                )}
              </div>
              {signatureDrawn && (
                <button
                  onClick={() => setSignatureDrawn(false)}
                  className="text-xs text-text-tertiary mt-sp-2 underline hover:text-text-secondary"
                >
                  {"\uC11C\uBA85 \uC9C0\uC6B0\uAE30"}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-sp-3 mt-sp-4 pt-sp-4 border-t border-border-subtle">
              <Button
                variant="primary"
                size="lg"
                onClick={handleSignComplete}
                disabled={!signatureDrawn}
              >
                {"\uC11C\uBA85 \uC644\uB8CC"}
              </Button>
              <Button variant="danger" size="lg">
                {"\uAC70\uBD80"}
              </Button>
              <Button variant="ghost" onClick={handleBack}>
                {"\uB4A4\uB85C"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* TE-401: Signature Inbox (only in list mode) */}
      {viewMode === "list" && (
        <>
          <div className="mb-sp-4">
            <h2 className="text-lg font-semibold text-text-primary">{"\uC11C\uBA85 \uB300\uAE30\uD568"}</h2>
            <p className="text-sm text-text-tertiary mt-sp-1">{"\uC11C\uBA85\uC774 \uD544\uC694\uD55C \uBB38\uC11C \uBAA9\uB85D"}</p>
          </div>

          <div className="mb-sp-8">
            <QueueList>
              {PENDING_DOCS.map((doc) => (
                <QueueItem
                  key={doc.id}
                  priority={doc.priority}
                  title={doc.title}
                  meta={`\uBC1C\uC2E0: ${doc.sender} \xB7 \uB9C8\uAC10: ${doc.deadline}`}
                  action={
                    <div className="flex items-center gap-sp-3">
                      <Badge variant={PRIORITY_BADGE_MAP[doc.priority]}>
                        {doc.priorityLabel}
                      </Badge>
                      <Button
                        variant={doc.priority === "critical" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => handleSign(doc)}
                      >
                        {"\uC11C\uBA85\uD558\uAE30"}
                      </Button>
                    </div>
                  }
                />
              ))}
            </QueueList>
          </div>

          {/* TE-403: My Document Archive */}
          <div className="mb-sp-4">
            <h2 className="text-lg font-semibold text-text-primary">{"\uBB38\uC11C \uBCF4\uAD00\uD568"}</h2>
            <p className="text-sm text-text-tertiary mt-sp-1">{"\uC218\uC2E0 \uBC0F \uC11C\uBA85 \uC644\uB8CC\uB41C \uBB38\uC11C \uBAA9\uB85D"}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{"\uBCF4\uAD00 \uBB38\uC11C"}</CardTitle>
              <div className="flex gap-sp-2">
                {CATEGORY_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setCategoryFilter(f.value)}
                    className={[
                      "px-sp-3 py-sp-1 rounded-full text-sm font-medium transition-colors",
                      categoryFilter === f.value
                        ? "bg-brand text-white"
                        : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardBody className="!p-0">
              <DataTable
                columns={ARCHIVE_COLUMNS}
                data={filteredArchive}
                keyExtractor={(row) => row.id}
                emptyMessage={"\uD574\uB2F9 \uC720\uD615\uC758 \uBB38\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}
              />
            </CardBody>
            <div className="px-sp-5 py-sp-3 border-t border-border-subtle text-sm text-text-tertiary">
              {"\uCD1D"} {filteredArchive.length}{"\uAC74"}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
