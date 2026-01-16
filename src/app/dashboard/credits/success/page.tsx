import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, MessageSquare } from "lucide-react";

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Paiement réussi !</h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            Vos crédits ont été ajoutés à votre compte. Vous pouvez maintenant
            utiliser tous les modèles d'IA.
          </p>
          <div className="space-y-3">
            <Link href="/chat">
              <Button className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                Commencer à discuter
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                Voir mon tableau de bord
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
