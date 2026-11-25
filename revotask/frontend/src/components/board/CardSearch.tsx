"use client";

import { useEffect, useState } from "react";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseInput } from "@/components/shared/BaseInput";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { TaskCard } from "@/types";

export const SEARCH_DEBOUNCE_MS = 300;

type Props = { boardId: string; onSelect: (cardId: string) => void };

/** Searches the board's cards 300 ms after the last keystroke (REQ-CARD-8, FE-12). */
export function CardSearch({ boardId, onSelect }: Props) {
  const { api } = useAuth();
  const handleError = useErrorHandler();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaskCard[] | null>(null);
  const [searching, setSearching] = useState(false);
  const term = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!term) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    api.cards
      .list({ q: term, board_id: boardId, limit: 20 })
      .then((found) => !cancelled && setResults(found))
      .catch((error: unknown) => !cancelled && handleError(error))
      .finally(() => !cancelled && setSearching(false));
    return () => {
      cancelled = true;
    };
  }, [term, boardId, api, handleError]);

  return (
    <div className="relative w-full sm:w-72">
      <BaseInput label="Search cards" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title or description" />
      {term ? (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto border-3 border-ink bg-paper shadow-hard">
          <p role="status" className="border-b-2 border-ink px-3 py-2 font-mono text-xs">
            {searching ? "Searching…" : `${results?.length ?? 0} result${results?.length === 1 ? "" : "s"}`}
          </p>
          <ul aria-label="Search results">
            {(results ?? []).map((card) => (
              <li key={card.id}>
                <BaseButton
                  variant="ghost" size="sm" align="between" className="w-full whitespace-normal"
                  onClick={() => {
                    onSelect(card.id);
                    setQuery("");
                  }}
                >
                  <span className="min-w-0 break-words">{card.title}</span>
                  <BaseBadge color="yellow">{card.column.name}</BaseBadge>
                </BaseButton>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
