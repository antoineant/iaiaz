import { redirect } from "next/navigation";

interface MifaChatPageProps {
  params: Promise<{ locale: string }>;
}

// Mifa teens now use /chat directly with mifaMode.
// This page preserves bookmarks/links by redirecting.
export default async function MifaChatPage({ params }: MifaChatPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/chat`);
}
