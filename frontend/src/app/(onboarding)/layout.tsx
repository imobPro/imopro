import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Onboarding exige sessão (criada após signup). Sem sessão volta pro login.
  if (!user) redirect("/login");

  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4 overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_115%,oklch(0.78_0.16_75/0.18),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 dark:[background:radial-gradient(60%_50%_at_50%_115%,oklch(0.80_0.16_75/0.10),transparent_70%)]"
      />
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-slow ease-out-quart">
        {children}
      </div>
    </div>
  );
}
