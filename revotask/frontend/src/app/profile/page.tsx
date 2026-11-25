import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <main>
      <h1 className="mb-6 text-3xl font-black tracking-tight sm:text-4xl">
        Your profile
      </h1>
      <section className="border-3 border-ink bg-paper p-5 shadow-hard sm:p-8">
        <ProfileForm />
      </section>
    </main>
  );
}
