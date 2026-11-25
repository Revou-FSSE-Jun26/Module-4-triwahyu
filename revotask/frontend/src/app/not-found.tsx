import { BaseButton } from "@/components/shared/BaseButton";

export default function NotFound() {
  return (
    <main className="border-3 border-ink bg-paper p-8 shadow-hard">
      <p className="font-mono text-sm text-concrete-700">404</p>
      <h1 className="text-3xl font-black">We can&apos;t find that page</h1>
      <p className="mb-6 mt-2 text-concrete-700">The board may have been deleted, or the link is wrong.</p>
      <BaseButton href="/">Back to your boards</BaseButton>
    </main>
  );
}
