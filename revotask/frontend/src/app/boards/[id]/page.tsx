import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoardView } from "@/components/board/BoardView";
import { BaseButton } from "@/components/shared/BaseButton";
import { isApiError } from "@/lib/errors";
import { getServerApi, withSession } from "@/lib/serverApi";

export const metadata: Metadata = { title: "Board" };

/** Board detail: a Server Component that fetches the board with columns and cards nested (REQ-BOARD-8). */
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const api = await getServerApi();

  try {
    const board = await withSession(() => api.boards.get(id));
    return <BoardView initial={board} />;
  } catch (error) {
    if (isApiError(error) && error.statusCode === 404) notFound();
    if (isApiError(error) && error.statusCode === 403) {
      return (
        <main className="border-3 border-ink bg-paper p-8 shadow-hard">
          <h1 className="text-2xl font-black">You don&apos;t have access to this board</h1>
          <p className="mb-6 mt-2 text-concrete-700">Ask a board admin to add you as a member.</p>
          <BaseButton href="/">Back to your boards</BaseButton>
        </main>
      );
    }
    throw error;
  }
}

