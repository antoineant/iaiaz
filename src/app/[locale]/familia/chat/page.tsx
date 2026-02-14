import { redirect } from "next/navigation";

interface FamiliaChatPageProps {
  params: Promise<{ locale: string }>;
}

// Familia teens now use /chat directly with familiaMode.
// This page preserves bookmarks/links by redirecting.
export default async function FamiliaChatPage({ params }: FamiliaChatPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/chat`);
}
