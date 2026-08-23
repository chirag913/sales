import { ProfileForm } from "@/components/profile/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Sales Profile</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        This information is given to the AI prospect during calls. It will never invent clients, results, or
        offices beyond what you enter here.
      </p>
      <div className="mt-8">
        <ProfileForm />
      </div>
    </div>
  );
}
