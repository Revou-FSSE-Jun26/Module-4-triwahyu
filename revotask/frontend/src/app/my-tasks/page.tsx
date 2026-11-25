import type { Metadata } from "next";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import { getServerApi, withSession } from "@/lib/serverApi";
import { groupByBoard } from "@/lib/tasks";

export const metadata: Metadata = { title: "My Tasks" };

/** Cards assigned to the current user from GET /api/cards?assignee=me, grouped by board (REQ-CARD-7). */
export default async function MyTasksPage() {
  const api = await getServerApi();
  const cards = await withSession(() =>
    api.cards.list({ assignee: "me", limit: 100 }),
  );
  const groups = groupByBoard(cards);

  return (
    <main>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
        My Tasks
      </h1>
      <p className="mb-8 mt-1 text-concrete-700">
        Cards assigned to you across all of your boards.
      </p>

      {groups.length === 0 ? (
        <section className="border-3 border-ink bg-paper p-8 shadow-hard">
          <h2 className="text-xl font-extrabold">Nothing assigned to you</h2>
          <p className="mt-2 text-concrete-700">
            When someone assigns you a card, it shows up here.
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section
              key={group.boardId}
              aria-labelledby={`board-${group.boardId}`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2
                  id={`board-${group.boardId}`}
                  className="text-2xl font-extrabold"
                >
                  {group.boardName}
                  <span className="ml-3 font-mono text-sm text-concrete-700">
                    {group.cards.length}
                  </span>
                </h2>
                <BaseButton
                  href={`/boards/${group.boardId}`}
                  variant="secondary"
                  size="sm"
                >
                  Open board
                </BaseButton>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.cards.map((card) => (
                  <li
                    key={card.id}
                    className="border-3 border-ink bg-paper p-4 shadow-hard-sm"
                  >
                    <h3 className="break-words font-bold">{card.title}</h3>
                    {card.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-concrete-700">
                        {card.description}
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <BaseBadge
                        color={
                          card.column.name.toLowerCase() === "done"
                            ? "green"
                            : "yellow"
                        }
                      >
                        {card.column.name}
                      </BaseBadge>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
