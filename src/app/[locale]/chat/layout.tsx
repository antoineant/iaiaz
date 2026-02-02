import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface ChatLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ChatLayout({ children, params }: ChatLayoutProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  return <>{children}</>;
}
