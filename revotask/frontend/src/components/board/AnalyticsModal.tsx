"use client";

import { useEffect, useState } from "react";
import { BaseModal } from "@/components/shared/BaseModal";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { Analytics } from "@/types";

type Props = { open: boolean; boardId: string; onClose: () => void };

/** Board analytics for admins: cards per column, completed this week, member activity (REQ-ANL-5). */
export function AnalyticsModal({ open, boardId, onClose }: Props) {
  const { api } = useAuth();
  const handleError = useErrorHandler();
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.boards
      .analytics(boardId)
      .then((result) => !cancelled && setData(result))
      .catch((error: unknown) => !cancelled && handleError(error));
    return () => {
      cancelled = true;
    };
  }, [open, boardId, api, handleError]);

  return (
    <BaseModal open={open} title="Board analytics" onClose={onClose} wide>
      {!data ? (
        <p role="status">Loading analytics…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="border-3 border-ink bg-tag p-3 font-mono text-sm font-bold">
            {data.completed_this_week} card{data.completed_this_week === 1 ? "" : "s"} completed this week
          </p>
          <section aria-labelledby="analytics-columns">
            <h3 id="analytics-columns" className="mb-2 font-extrabold">
              Cards per column
            </h3>
            <ul className="flex flex-col gap-1">
              {data.cards_per_column.map((column) => (
                <li key={column.column_id} className="flex justify-between border-b-2 border-ink py-1 text-sm">
                  <span>{column.name}</span>
                  <span className="font-mono font-bold">{column.card_count}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="analytics-members" className="overflow-x-auto">
            <h3 id="analytics-members" className="mb-2 font-extrabold">
              Member activity
            </h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-3 border-ink">
                  <th className="py-1 pr-3">Member</th>
                  <th className="py-1 pr-3">Assigned</th>
                  <th className="py-1 pr-3">Completed</th>
                  <th className="py-1">Comments</th>
                </tr>
              </thead>
              <tbody>
                {data.member_activity.map((member) => (
                  <tr key={member.user_id} className="border-b-2 border-ink">
                    <td className="py-1 pr-3 font-bold">{member.name}</td>
                    <td className="py-1 pr-3 font-mono">{member.cards_assigned}</td>
                    <td className="py-1 pr-3 font-mono">{member.cards_completed}</td>
                    <td className="py-1 font-mono">{member.comments_made}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </BaseModal>
  );
}
