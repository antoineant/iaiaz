import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description:
    "Politique de confidentialité et protection des données personnelles de la plateforme iaiaz",
  alternates: {
    canonical: "https://www.iaiaz.com/legal/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Politique de Confidentialité</h1>
      <p className="text-[var(--muted-foreground)]">
        Dernière mise à jour : 16 janvier 2025
      </p>

      <p>
        La présente Politique de Confidentialité décrit comment BAJURIAN SAS
        (ci-après « nous », « notre » ou « le Responsable de traitement ») collecte,
        utilise et protège vos données personnelles lorsque vous utilisez la
        plateforme iaiaz (ci-après « le Service »).
      </p>
      <p>
        Nous nous engageons à respecter votre vie privée et à protéger vos données
        personnelles conformément au Règlement Général sur la Protection des Données
        (RGPD) et à la loi Informatique et Libertés.
      </p>

      <h2>1. Responsable de traitement</h2>
      <p>Le responsable du traitement de vos données personnelles est :</p>
      <p>
        <strong>BAJURIAN SAS</strong>
        <br />
        135 Avenue des Pyrénées
        <br />
        31830 Plaisance du Touch, France
        <br />
        SIRET : 828 446 435
        <br />
        Email : admin@iaiaz.com
      </p>

      <h2>2. Données collectées</h2>
      <h3>2.1 Données que vous nous fournissez</h3>
      <ul>
        <li>
          <strong>Données d'inscription :</strong> adresse email, mot de passe
          (hashé)
        </li>
        <li>
          <strong>Données de paiement :</strong> traitées par Stripe (nous n'avons
          pas accès à vos numéros de carte)
        </li>
        <li>
          <strong>Contenu des conversations :</strong> messages envoyés aux modèles
          IA
        </li>
        <li>
          <strong>Fichiers téléchargés :</strong> images et documents joints aux
          conversations
        </li>
      </ul>

      <h3>2.2 Données collectées automatiquement</h3>
      <ul>
        <li>
          <strong>Données d'utilisation :</strong> historique des conversations,
          modèles utilisés, tokens consommés, coûts
        </li>
        <li>
          <strong>Données techniques :</strong> adresse IP, type de navigateur, date
          et heure d'accès
        </li>
        <li>
          <strong>Cookies :</strong> voir notre{" "}
          <a href="/legal/cookies" className="text-primary-600 hover:underline">
            Politique de Cookies
          </a>
        </li>
      </ul>

      <h2>3. Finalités du traitement</h2>
      <p>Nous utilisons vos données personnelles pour :</p>
      <table className="w-full border-collapse border border-[var(--border)] my-4">
        <thead>
          <tr className="bg-[var(--muted)]">
            <th className="border border-[var(--border)] p-2 text-left">
              Finalité
            </th>
            <th className="border border-[var(--border)] p-2 text-left">
              Base légale
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[var(--border)] p-2">
              Fournir et gérer le Service
            </td>
            <td className="border border-[var(--border)] p-2">
              Exécution du contrat
            </td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">
              Traiter les paiements et gérer les crédits
            </td>
            <td className="border border-[var(--border)] p-2">
              Exécution du contrat
            </td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">
              Envoyer des notifications liées au Service
            </td>
            <td className="border border-[var(--border)] p-2">
              Exécution du contrat
            </td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">
              Améliorer le Service et corriger les bugs
            </td>
            <td className="border border-[var(--border)] p-2">
              Intérêt légitime
            </td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">
              Assurer la sécurité et prévenir les fraudes
            </td>
            <td className="border border-[var(--border)] p-2">
              Intérêt légitime
            </td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">
              Respecter nos obligations légales
            </td>
            <td className="border border-[var(--border)] p-2">
              Obligation légale
            </td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">
              Envoyer des communications marketing (si consentement)
            </td>
            <td className="border border-[var(--border)] p-2">Consentement</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Destinataires des données</h2>
      <p>Vos données peuvent être partagées avec :</p>

      <h3>4.1 Sous-traitants</h3>
      <ul>
        <li>
          <strong>Supabase Inc.</strong> (États-Unis) : hébergement de la base de
          données et authentification
        </li>
        <li>
          <strong>Vercel Inc.</strong> (États-Unis) : hébergement de l'application
        </li>
        <li>
          <strong>Stripe Inc.</strong> (États-Unis) : traitement des paiements
        </li>
      </ul>

      <h3>4.2 Fournisseurs d'IA</h3>
      <p>
        Le contenu de vos conversations est transmis aux fournisseurs de modèles IA
        pour générer les réponses :
      </p>
      <ul>
        <li>
          <strong>Anthropic</strong> (États-Unis) : modèles Claude
        </li>
        <li>
          <strong>OpenAI</strong> (États-Unis) : modèles GPT
        </li>
        <li>
          <strong>Google</strong> (États-Unis) : modèles Gemini
        </li>
        <li>
          <strong>Mistral AI</strong> (France) : modèles Mistral
        </li>
      </ul>
      <p>
        Ces fournisseurs s'engagent à ne pas utiliser vos données pour entraîner
        leurs modèles via leurs API commerciales.
      </p>

      <h2>5. Transferts hors Union Européenne</h2>
      <p>
        Certains de nos sous-traitants sont situés aux États-Unis. Ces transferts
        sont encadrés par :
      </p>
      <ul>
        <li>
          Le Data Privacy Framework UE-États-Unis pour les entreprises certifiées
        </li>
        <li>
          Des Clauses Contractuelles Types (CCT) approuvées par la Commission
          Européenne
        </li>
      </ul>
      <p>
        Ces garanties assurent un niveau de protection adéquat de vos données
        conformément au RGPD.
      </p>

      <h2>6. Durée de conservation</h2>
      <table className="w-full border-collapse border border-[var(--border)] my-4">
        <thead>
          <tr className="bg-[var(--muted)]">
            <th className="border border-[var(--border)] p-2 text-left">
              Type de données
            </th>
            <th className="border border-[var(--border)] p-2 text-left">
              Durée de conservation
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[var(--border)] p-2">Données de compte</td>
            <td className="border border-[var(--border)] p-2">
              Durée de la relation + 3 ans
            </td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">
              Historique des conversations
            </td>
            <td className="border border-[var(--border)] p-2">
              Durée de la relation (supprimable par l'utilisateur)
            </td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">Fichiers téléchargés</td>
            <td className="border border-[var(--border)] p-2">
              Durée de la relation (supprimable par l'utilisateur)
            </td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">Données de facturation</td>
            <td className="border border-[var(--border)] p-2">
              10 ans (obligation légale)
            </td>
          </tr>
          <tr>
            <td className="border border-[var(--border)] p-2">Logs techniques</td>
            <td className="border border-[var(--border)] p-2">12 mois</td>
          </tr>
        </tbody>
      </table>

      <h2>7. Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez des droits suivants sur vos données
        personnelles :
      </p>
      <ul>
        <li>
          <strong>Droit d'accès :</strong> obtenir une copie de vos données
        </li>
        <li>
          <strong>Droit de rectification :</strong> corriger des données inexactes
        </li>
        <li>
          <strong>Droit à l'effacement :</strong> demander la suppression de vos
          données
        </li>
        <li>
          <strong>Droit à la portabilité :</strong> recevoir vos données dans un
          format structuré
        </li>
        <li>
          <strong>Droit d'opposition :</strong> vous opposer au traitement de vos
          données
        </li>
        <li>
          <strong>Droit à la limitation :</strong> demander la restriction du
          traitement
        </li>
        <li>
          <strong>Droit de retirer votre consentement :</strong> à tout moment pour
          les traitements basés sur le consentement
        </li>
      </ul>

      <h3>7.1 Comment exercer vos droits</h3>
      <p>Pour exercer vos droits, vous pouvez :</p>
      <ul>
        <li>
          Nous contacter par email à :{" "}
          <a
            href="mailto:admin@iaiaz.com"
            className="text-primary-600 hover:underline"
          >
            admin@iaiaz.com
          </a>
        </li>
        <li>
          Nous écrire à : BAJURIAN SAS, 135 Avenue des Pyrénées, 31830 Plaisance du
          Touch, France
        </li>
      </ul>
      <p>
        Nous répondrons à votre demande dans un délai d'un mois. Ce délai peut être
        prolongé de deux mois en cas de demande complexe, auquel cas vous serez
        informé.
      </p>

      <h3>7.2 Réclamation</h3>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire
        une réclamation auprès de la CNIL :{" "}
        <a
          href="https://www.cnil.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          www.cnil.fr
        </a>
      </p>

      <h2>8. Sécurité des données</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles
        appropriées pour protéger vos données :
      </p>
      <ul>
        <li>Chiffrement des données en transit (HTTPS/TLS)</li>
        <li>Chiffrement des données au repos</li>
        <li>Mots de passe hashés avec des algorithmes sécurisés</li>
        <li>Contrôles d'accès stricts</li>
        <li>Surveillance et journalisation des accès</li>
        <li>Sauvegardes régulières</li>
      </ul>

      <h2>9. Cookies</h2>
      <p>
        Notre utilisation des cookies est décrite dans notre{" "}
        <a href="/legal/cookies" className="text-primary-600 hover:underline">
          Politique de Cookies
        </a>
        .
      </p>

      <h2>10. Mineurs</h2>
      <p>
        Le Service est destiné aux personnes de 18 ans et plus. Nous ne collectons
        pas sciemment de données personnelles concernant des mineurs. Si vous êtes
        parent ou tuteur et pensez que votre enfant nous a fourni des données
        personnelles, veuillez nous contacter.
      </p>

      <h2>11. Modifications</h2>
      <p>
        Nous pouvons modifier cette Politique de Confidentialité à tout moment. En
        cas de modification substantielle, nous vous en informerons par email ou via
        une notification sur le Service. La date de dernière mise à jour est
        indiquée en haut de ce document.
      </p>

      <h2>12. Contact</h2>
      <p>
        Pour toute question concernant cette Politique de Confidentialité ou le
        traitement de vos données :
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
    </>
  );
}
