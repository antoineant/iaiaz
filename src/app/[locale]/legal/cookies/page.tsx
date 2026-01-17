import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.cookiesPage" });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.iaiaz.com";

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${baseUrl}${locale === "fr" ? "" : "/en"}/legal/cookies`,
      languages: {
        "fr-FR": `${baseUrl}/legal/cookies`,
        en: `${baseUrl}/en/legal/cookies`,
      },
    },
  };
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal.cookiesPage");

  return (
    <>
      <h1>{t("title")}</h1>
      <p className="text-[var(--muted-foreground)]">
        {t("lastUpdated")}
      </p>

      {locale === "en" && (
        <div className="my-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                Legal Notice
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                This Cookie Policy is provided in French. The French version below is the authoritative legal document.
              </p>
            </div>
          </div>
        </div>
      )}

      <p>
        Cette Politique de Cookies explique ce que sont les cookies, comment nous
        les utilisons sur la plateforme iaiaz, et comment vous pouvez gérer vos
        préférences.
      </p>

      <h2>1. Qu'est-ce qu'un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur,
        tablette ou smartphone) lorsque vous visitez un site web. Les cookies
        permettent au site de reconnaître votre appareil et de mémoriser certaines
        informations sur votre visite, comme vos préférences ou votre statut de
        connexion.
      </p>
      <p>
        Les cookies peuvent être « persistants » (ils restent sur votre appareil
        jusqu'à leur expiration ou suppression) ou « de session » (ils sont
        supprimés à la fermeture du navigateur).
      </p>

      <h2>2. Types de cookies utilisés</h2>

      <h3>2.1 Cookies strictement nécessaires</h3>
      <p>
        Ces cookies sont indispensables au fonctionnement du Service. Ils vous
        permettent de naviguer sur le site et d'utiliser ses fonctionnalités
        essentielles. Sans ces cookies, le Service ne peut pas fonctionner
        correctement.
      </p>
      <table className="w-full border-collapse border border-[var(--border)] my-4">
        <thead>
          <tr className="bg-[var(--muted)]">
            <th className="border border-[var(--border)] p-2 text-left">Nom</th>
            <th className="border border-[var(--border)] p-2 text-left">
              Finalité
            </th>
            <th className="border border-[var(--border)] p-2 text-left">Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[var(--border)] p-2">
              sb-*-auth-token
            </td>
            <td className="border border-[var(--border)] p-2">
              Authentification et session utilisateur (Supabase)
            </td>
            <td className="border border-[var(--border)] p-2">Session / 1 an</td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">
              sb-*-auth-token-code-verifier
            </td>
            <td className="border border-[var(--border)] p-2">
              Sécurité de l'authentification (PKCE)
            </td>
            <td className="border border-[var(--border)] p-2">Session</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Base légale :</strong> Ces cookies sont exemptés de consentement car
        strictement nécessaires à la fourniture du Service (article 82 de la loi
        Informatique et Libertés).
      </p>

      <h3>2.2 Cookies fonctionnels</h3>
      <p>
        Ces cookies permettent d'améliorer votre expérience en mémorisant vos
        préférences.
      </p>
      <table className="w-full border-collapse border border-[var(--border)] my-4">
        <thead>
          <tr className="bg-[var(--muted)]">
            <th className="border border-[var(--border)] p-2 text-left">Nom</th>
            <th className="border border-[var(--border)] p-2 text-left">
              Finalité
            </th>
            <th className="border border-[var(--border)] p-2 text-left">Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[var(--border)] p-2">cookie-consent</td>
            <td className="border border-[var(--border)] p-2">
              Mémorisation de vos choix de cookies
            </td>
            <td className="border border-[var(--border)] p-2">1 an</td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">theme</td>
            <td className="border border-[var(--border)] p-2">
              Préférence de thème (clair/sombre)
            </td>
            <td className="border border-[var(--border)] p-2">1 an</td>
          </tr>
        </tbody>
      </table>

      <h3>2.3 Cookies analytiques</h3>
      <p>
        Actuellement, nous n'utilisons pas de cookies analytiques tiers. Si cela
        venait à changer, cette politique serait mise à jour et votre consentement
        serait demandé.
      </p>

      <h3>2.4 Cookies publicitaires</h3>
      <p>
        Nous n'utilisons pas de cookies publicitaires ou de ciblage. Le Service ne
        contient pas de publicités.
      </p>

      <h2>3. Cookies tiers</h2>
      <p>
        Certains services tiers peuvent déposer des cookies lors de votre
        utilisation du Service :
      </p>
      <ul>
        <li>
          <strong>Stripe :</strong> lors du processus de paiement, Stripe peut
          déposer des cookies pour la sécurité et la prévention des fraudes. Ces
          cookies sont nécessaires au traitement des paiements.
        </li>
      </ul>
      <p>
        Nous n'avons pas de contrôle direct sur ces cookies. Pour plus
        d'informations, consultez les politiques de cookies de ces tiers.
      </p>

      <h2>4. Gestion des cookies</h2>
      <h3>4.1 Via notre bandeau de cookies</h3>
      <p>
        Lors de votre première visite, un bandeau vous permet d'accepter ou de
        refuser les cookies non essentiels. Vous pouvez modifier vos choix à tout
        moment en cliquant sur le lien « Gérer les cookies » en bas de page.
      </p>

      <h3>4.2 Via votre navigateur</h3>
      <p>
        Vous pouvez également configurer votre navigateur pour accepter ou refuser
        les cookies :
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/fr/kb/activer-desactiver-cookies"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>
      <p>
        <strong>Attention :</strong> Le blocage de certains cookies peut affecter
        le fonctionnement du Service. Les cookies strictement nécessaires ne
        peuvent pas être désactivés sans rendre le Service inutilisable.
      </p>

      <h2>5. Stockage local (localStorage)</h2>
      <p>
        En plus des cookies, nous utilisons le stockage local de votre navigateur
        pour :
      </p>
      <ul>
        <li>Mémoriser vos préférences de cookies</li>
        <li>Stocker temporairement des données pour améliorer les performances</li>
      </ul>
      <p>
        Le stockage local fonctionne de manière similaire aux cookies mais les
        données ne sont pas envoyées au serveur avec chaque requête.
      </p>

      <h2>6. Durée de conservation</h2>
      <p>Les cookies sont conservés pour les durées suivantes :</p>
      <ul>
        <li>
          <strong>Cookies de session :</strong> supprimés à la fermeture du
          navigateur
        </li>
        <li>
          <strong>Cookies d'authentification :</strong> jusqu'à 1 an (renouvelés à
          chaque visite)
        </li>
        <li>
          <strong>Cookies de préférences :</strong> 1 an
        </li>
      </ul>

      <h2>7. Modifications</h2>
      <p>
        Nous pouvons mettre à jour cette Politique de Cookies pour refléter des
        changements dans nos pratiques ou pour d'autres raisons opérationnelles,
        légales ou réglementaires. Nous vous encourageons à consulter régulièrement
        cette page.
      </p>

      <h2>8. Contact</h2>
      <p>
        Pour toute question concernant notre utilisation des cookies :
      </p>
      <ul>
        <li>
          Email :{" "}
          <a
            href="mailto:admin@iaiaz.com"
            className="text-primary-600 hover:underline"
          >
            admin@iaiaz.com
          </a>
        </li>
        <li>
          Adresse : BAJURIAN SAS, 135 Avenue des Pyrénées, 31830 Plaisance du Touch,
          France
        </li>
      </ul>

      <h2>9. Plus d'informations</h2>
      <p>
        Pour en savoir plus sur les cookies et la protection de vos données :
      </p>
      <ul>
        <li>
          <a
            href="https://www.cnil.fr/fr/cookies-et-autres-traceurs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            CNIL - Cookies et traceurs
          </a>
        </li>
        <li>
          <a href="/legal/privacy" className="text-primary-600 hover:underline">
            Notre Politique de Confidentialité
          </a>
        </li>
      </ul>
    </>
  );
}
