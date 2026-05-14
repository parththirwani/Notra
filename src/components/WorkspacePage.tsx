"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, Brain, Layers, Trash2, ChevronDown, RefreshCw, Inbox, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import InteractiveMessage from "@/components/chat/InteractiveMessage";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType = "mcq" | "quiz" | "flashcard";

interface WorkspaceItem {
  id: string;
  type: ItemType;
  content: unknown;
  sourceConversationId: string | null;
  createdAt: string;
}

interface WorkspaceTopic {
  id: string;
  name: string;
  updatedAt: string;
  items: WorkspaceItem[];
}

// ─── Filter tabs config ────────────────────────────────────────────────────────

const TABS: { label: string; value: ItemType | "all"; icon: React.ElementType }[] = [
  { label: "All", value: "all", icon: Layers },
  { label: "MCQ", value: "mcq", icon: Brain },
  { label: "Quiz", value: "quiz", icon: BookOpen },
  { label: "Flashcard", value: "flashcard", icon: BookOpen },
];

const TYPE_COLORS: Record<ItemType, string> = {
  mcq: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  quiz: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  flashcard: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const TYPE_LABELS: Record<ItemType, string> = {
  mcq: "MCQ",
  quiz: "Quiz",
  flashcard: "Flashcard",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const [topics, setTopics] = useState<WorkspaceTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ItemType | "all">("all");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace");
      if (!res.ok) return;
      const data = await res.json();
      setTopics(data.topics ?? []);
      // Auto-expand all topics on first load
      if (data.topics?.length > 0) {
        setExpandedTopics(new Set(data.topics.map((t: WorkspaceTopic) => t.id)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteItem = async (itemId: string) => {
    setDeletingId(itemId);
    try {
      await fetch(`/api/workspace/items/${itemId}`, { method: "DELETE" });
      setTopics((prev) =>
        prev
          .map((topic) => ({
            ...topic,
            items: topic.items.filter((item) => item.id !== itemId),
          }))
          .filter((topic) => topic.items.length > 0)
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Filter items within each topic
  const filteredTopics = topics
    .map((topic) => ({
      ...topic,
      items:
        activeFilter === "all"
          ? topic.items
          : topic.items.filter((item) => item.type === activeFilter),
    }))
    .filter((topic) => topic.items.length > 0);

  const totalItems = topics.reduce((acc, t) => acc + t.items.length, 0);

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      {/* Header */}
      <div className="border-b border-white/8 bg-[#111] sticky top-0 z-10 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white gap-2 -ml-2">
                <ArrowLeft size={16} />
                Chat
              </Button>
            </Link>
            <div className="w-px h-5 bg-white/10" />
            <div>
              <h1 className="font-semibold text-white tracking-tight">Workspace</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {loading ? "Loading…" : `${totalItems} item${totalItems !== 1 ? "s" : ""} across ${topics.length} topic${topics.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTopics}
            disabled={loading}
            className="text-gray-400 hover:text-white gap-2"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="max-w-5xl mx-auto px-6 pb-3 flex gap-1">
          {TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? totalItems
                : topics.reduce(
                    (acc, t) => acc + t.items.filter((i) => i.type === tab.value).length,
                    0
                  );
            return (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 flex items-center gap-1.5",
                  activeFilter === tab.value
                    ? "bg-white text-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      activeFilter === tab.value
                        ? "bg-black/10 text-black"
                        : "bg-white/10 text-gray-300"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-500">
            <RefreshCw size={20} className="animate-spin mr-3" />
            Loading workspace…
          </div>
        ) : filteredTopics.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          filteredTopics.map((topic) => (
            <TopicSection
              key={topic.id}
              topic={topic}
              expanded={expandedTopics.has(topic.id)}
              onToggle={() => toggleTopic(topic.id)}
              onDelete={deleteItem}
              deletingId={deletingId}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Topic section ─────────────────────────────────────────────────────────────

function TopicSection({
  topic,
  expanded,
  onToggle,
  onDelete,
  deletingId,
}: {
  topic: WorkspaceTopic & { items: WorkspaceItem[] };
  expanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const counts = topic.items.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<ItemType, number>
  );

  return (
    <div className="border border-white/8 rounded-xl overflow-hidden bg-[#141414]">
      {/* Topic header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="font-medium text-white truncate text-left">{topic.name}</span>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {(Object.entries(counts) as [ItemType, number][]).map(([type, count]) => (
              <span
                key={type}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border",
                  TYPE_COLORS[type]
                )}
              >
                {count} {TYPE_LABELS[type]}
              </span>
            ))}
          </div>
        </div>

        <ChevronDown
          size={16}
          className={cn(
            "text-gray-500 flex-shrink-0 transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Items */}
      {expanded && (
        <div className="border-t border-white/8 divide-y divide-white/5">
          {topic.items.map((item) => (
            <WorkspaceItemCard
              key={item.id}
              item={item}
              onDelete={onDelete}
              isDeleting={deletingId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Item card ─────────────────────────────────────────────────────────────────

function WorkspaceItemCard({
  item,
  onDelete,
  isDeleting,
}: {
  item: WorkspaceItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Serialize content back to string for InteractiveMessage
  const contentStr = JSON.stringify(item.content);

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full border font-medium",
              TYPE_COLORS[item.type]
            )}
          >
            {TYPE_LABELS[item.type]}
          </span>
          <span className="text-xs text-gray-600">{date}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
          >
            {expanded ? "Hide" : "View"}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
            aria-label="Delete item"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Preview or full render */}
      {expanded ? (
        <div className="mt-3 bg-[#1a1a1a] rounded-lg p-4 border border-white/5">
          <InteractiveMessage content={contentStr} />
        </div>
      ) : (
        <ItemPreview item={item} />
      )}
    </div>
  );
}

// ─── Compact preview (collapsed state) ────────────────────────────────────────

function ItemPreview({ item }: { item: WorkspaceItem }) {
  const content = item.content as Record<string, unknown>;

  if (item.type === "flashcard") {
    return (
      <p className="text-sm text-gray-400 truncate">
        <span className="text-gray-600 mr-1">Front:</span>
        {String(content.front ?? "").slice(0, 100)}
      </p>
    );
  }

  if (item.type === "mcq") {
    return (
      <p className="text-sm text-gray-400 truncate">
        {String(content.question ?? "").slice(0, 120)}
      </p>
    );
  }

  if (item.type === "quiz") {
    const questions = content.questions as unknown[];
    return (
      <p className="text-sm text-gray-400">
        <span className="text-gray-600 mr-1">{questions?.length ?? 0} questions</span>
        {String(content.title ?? "")}
      </p>
    );
  }

  return null;
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: ItemType | "all" }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Inbox size={24} className="text-gray-600" />
      </div>
      <h3 className="text-gray-300 font-medium mb-1">
        {filter === "all" ? "Your workspace is empty" : `No ${filter}s yet`}
      </h3>
      <p className="text-sm text-gray-600 max-w-xs">
        {filter === "all"
          ? "Ask for a quiz, MCQ, or flashcard in any chat — it'll appear here automatically."
          : `Ask for a ${filter} in any chat and it will show up here, grouped by topic.`}
      </p>
      <Link href="/chat" className="mt-5">
        <Button size="sm" className="bg-white text-black hover:bg-gray-100">
          Go to Chat
        </Button>
      </Link>
    </div>
  );
}