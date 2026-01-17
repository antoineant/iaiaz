import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, MessageSquare } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PaymentSuccessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("credits.success");

  return (
    <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            {t("description")}
          </p>
          <div className="space-y-3">
            <Link href="/chat">
              <Button className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                {t("startChatting")}
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                {t("viewDashboard")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
