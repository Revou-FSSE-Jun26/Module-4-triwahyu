import type { Metadata } from "next";
import Link from "next/link";
import { CreateBoardButton } from "@/components/boards/CreateBoardButton";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { getServerApi, withSession } from "@/lib/serverApi";

export const metadata: Metadata = { title: "Boards" };

/** Dashboard: a Server Component that lists the current user's boards (REQ-BOARD-7). */
export default async function DashboardPage() {
  const api = await getServerApi();
  const boards = await withSession(() => api.boards.list());

  return (
    <main>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Your boards
          </h1>
          <p className="mt-1 text-concrete-700">
            Pick a board to organize its columns and cards.
          </p>
        </div>
        <CreateBoardButton />
      </div>

      {boards.length === 0 ? (
        <section className="border-3 border-ink bg-paper p-8 shadow-hard">
          <h2 className="text-xl font-extrabold">No boards yet</h2>
          <p className="mt-2 max-w-prose text-concrete-700">
            Create your first board to start adding columns and cards.
          </p>
        </section>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board, index) => (
            <li key={board.id}>
              <Link
                href={`/boards/${board.id}`}
                className="flex min-h-44 flex-col justify-between border-3 border-ink bg-paper p-5 shadow-hard transition-[transform,box-shadow] duration-120 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-hard-lg"
              >
                <div>
                  <p className="font-mono text-xs text-concrete-700">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-1 break-words text-2xl font-black leading-tight">
                    {board.name}
                  </h2>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <BaseBadge color={board.role === "admin" ? "orange" : "gray"}>
                    {board.role}
                  </BaseBadge>
                  <span className="font-mono text-xs text-concrete-700">
                    {board.member_count}{" "}
                    {board.member_count === 1 ? "member" : "members"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
