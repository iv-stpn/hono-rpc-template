// The main authenticated view: list, add, toggle, and delete todos via the
// typed RPC client. The list is read through useQuery (cached + deduped);
// mutations patch the same cache entry so the UI updates without a refetch.

import type { Todo } from "@app/utils";
import { Check, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "../api";
import { useAuth } from "../auth";
import { useQuery } from "../hooks/useQuery";
import { serializeQueryKey, useQueryStore } from "../store/queryStore";

const TODOS_KEY = ["todos"] as const;

async function fetchTodos(): Promise<Todo[]> {
  const res = await api.api.todos.$get();
  if (!res.ok) throw new Error("Failed to fetch todos");
  const data = await res.json();
  return data.todos;
}

export function TodosPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [title, setTitle] = useState("");

  const { data, isLoading } = useQuery<Todo[]>({
    queryKey: TODOS_KEY,
    queryFn: fetchTodos,
    errorMessage: t("todos.errors.load"),
  });
  const todos = data ?? [];

  // Mutations patch the cached list in place so the view updates immediately.
  const updateData = useQueryStore((state) => state.updateData);
  const key = serializeQueryKey(TODOS_KEY);
  const patchTodos = (updater: (prev: Todo[]) => Todo[]) => updateData<Todo[]>(key, (prev) => updater(prev ?? []));

  async function addTodo(e: FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    const res = await api.api.todos.$post({ json: { title: value } });
    if (!res.ok) {
      toast.error(await errorMessage(res, t("todos.errors.add")));
      return;
    }
    const { todo } = await res.json();
    patchTodos((prev) => [todo, ...prev]);
    setTitle("");
  }

  async function toggle(todo: Todo) {
    const res = await api.api.todos[":id"].$patch({
      param: { id: todo.id },
      json: { done: !todo.done },
    });
    if (!res.ok) {
      toast.error(await errorMessage(res, t("todos.errors.update")));
      return;
    }
    const { todo: updated } = await res.json();
    patchTodos((prev) => prev.map((item) => (item.id === todo.id ? updated : item)));
  }

  async function remove(id: string) {
    const res = await api.api.todos[":id"].$delete({ param: { id } });
    if (!res.ok) {
      toast.error(await errorMessage(res, t("todos.errors.delete")));
      return;
    }
    patchTodos((prev) => prev.filter((item) => item.id !== id));
    toast.success(t("todos.deleted"));
  }

  const remaining = todos.filter((item) => !item.done).length;
  const done = todos.length - remaining;
  const progress = todos.length === 0 ? 0 : Math.round((done / todos.length) * 100);

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-10 sm:py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("todos.title")}</h1>
          <p className="mt-0.5 text-sm text-muted">{user?.email}</p>
        </div>
        <Button variant="ghost" onClick={() => logout()}>
          {t("common.signOut")}
        </Button>
      </header>

      <form onSubmit={addTodo} className="mt-8 flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("todos.newPlaceholder")}
          maxLength={280}
          aria-label={t("todos.newLabel")}
        />
        <Button type="submit" disabled={!title.trim()} className="shrink-0">
          {t("todos.add")}
        </Button>
      </form>

      {todos.length > 0 && (
        <div className="mt-8 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted">
            {t("todos.remaining", { remaining, total: todos.length })}
          </span>
        </div>
      )}

      {isLoading ? (
        <ul className="mt-6 space-y-2.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-13 animate-pulse rounded-xl border border-border bg-surface/60" />
          ))}
        </ul>
      ) : todos.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-14 text-center">
          <p className="text-sm font-medium text-fg">{t("todos.empty.title")}</p>
          <p className="mt-1 text-sm text-muted">{t("todos.empty.subtitle")}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface/80 px-4 py-3 hover:border-accent/30"
            >
              <button
                type="button"
                onClick={() => toggle(todo)}
                aria-pressed={todo.done}
                aria-label={todo.done ? t("todos.markNotDone") : t("todos.markDone")}
                className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                  todo.done
                    ? "border-accent bg-accent text-bg"
                    : "border-border bg-bg/40 text-transparent hover:border-accent/60"
                }`}
              >
                <Check className="size-3.5" aria-hidden="true" />
              </button>
              <span className={`flex-1 text-sm ${todo.done ? "text-muted line-through" : "text-fg"}`}>
                {todo.title}
              </span>
              <Button
                variant="icon"
                onClick={() => remove(todo.id)}
                aria-label={t("todos.delete")}
                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
