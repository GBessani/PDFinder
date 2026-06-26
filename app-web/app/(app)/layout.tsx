import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/layout/nav";
import { WaStatusBanner } from "@/components/layout/wa-status-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh">
      <Nav />
      <WaStatusBanner />
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
