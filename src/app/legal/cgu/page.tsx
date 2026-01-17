import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "Conditions générales d'utilisation de la plateforme iaiaz",
  alternates: {
    canonical: "https://www.iaiaz.com/legal/cgu",
  },
};

export default function CGUPage() {
  return (
    <>
      <h1>Conditions Générales d'Utilisation</h1>
      <p className="text-[var(--muted-foreground)]">
        Dernière mise à jour : 16 janvier 2025
      </p>

      <h2>Article 1 - Objet et définitions</h2>
      <p>
        Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour
        objet de définir les modalités et conditions d'utilisation de la plateforme
        iaiaz (ci-après « le Service » ou « la Plateforme »), accessible à l'adresse
        iaiaz.com, éditée par la société BAJURIAN SAS.
      </p>
      <p>
        <strong>Définitions :</strong>
      </p>
      <ul>
        <li>
          <strong>Utilisateur :</strong> toute personne physique majeure ou mineure
          autorisée accédant au Service
        </li>
        <li>
          <strong>Compte :</strong> espace personnel de l'Utilisateur créé lors de
          son inscription
        </li>
        <li>
          <strong>Crédits :</strong> unités de valeur permettant d'utiliser les
          services d'intelligence artificielle
        </li>
        <li>
          <strong>Modèles IA :</strong> les différents modèles d'intelligence
          artificielle accessibles via la Plateforme (Claude, GPT, Gemini, Mistral,
          etc.)
        </li>
        <li>
          <strong>Conversation :</strong> échange de messages entre l'Utilisateur
          et un Modèle IA
        </li>
      </ul>

      <h2>Article 2 - Acceptation des conditions</h2>
      <p>
        L'utilisation du Service implique l'acceptation pleine et entière des
        présentes CGU. En créant un Compte ou en utilisant le Service, l'Utilisateur
        reconnaît avoir pris connaissance des présentes CGU et les accepter sans
        réserve.
      </p>
      <p>
        Si l'Utilisateur n'accepte pas les présentes CGU, il doit s'abstenir
        d'utiliser le Service.
      </p>

      <h2>Article 3 - Description du Service</h2>
      <p>
        iaiaz est une plateforme permettant aux utilisateurs d'accéder à différents
        modèles d'intelligence artificielle (IA) via une interface unifiée. Le
        Service propose :
      </p>
      <ul>
        <li>
          L'accès à plusieurs modèles IA de différents fournisseurs (Anthropic,
          OpenAI, Google, Mistral)
        </li>
        <li>Un système de crédits prépayés permettant de payer l'utilisation</li>
        <li>La sauvegarde de l'historique des conversations</li>
        <li>Le téléchargement et l'analyse d'images et de documents</li>
      </ul>
      <p>
        Le Service est destiné principalement aux étudiants, enseignants et
        professionnels souhaitant utiliser l'IA de manière accessible et
        transparente.
      </p>

      <h2>Article 4 - Inscription et compte utilisateur</h2>
      <h3>4.1 Conditions d'inscription</h3>
      <p>
        Pour utiliser le Service, l'Utilisateur doit créer un Compte en fournissant
        une adresse email valide et un mot de passe. L'Utilisateur doit être âgé
        d'au moins 18 ans ou disposer de l'autorisation de son représentant légal.
      </p>

      <h3>4.2 Responsabilité du compte</h3>
      <p>
        L'Utilisateur est seul responsable de la confidentialité de ses identifiants
        de connexion et de toute activité effectuée depuis son Compte. Il s'engage
        à informer immédiatement BAJURIAN SAS de toute utilisation non autorisée de
        son Compte.
      </p>

      <h3>4.3 Exactitude des informations</h3>
      <p>
        L'Utilisateur s'engage à fournir des informations exactes et à les maintenir
        à jour. BAJURIAN SAS se réserve le droit de suspendre ou supprimer tout
        Compte contenant des informations manifestement fausses.
      </p>

      <h2>Article 5 - Système de crédits</h2>
      <h3>5.1 Fonctionnement</h3>
      <p>
        L'utilisation des Modèles IA est facturée en crédits. Chaque requête
        consomme un nombre de crédits variable selon :
      </p>
      <ul>
        <li>Le modèle IA utilisé</li>
        <li>Le nombre de tokens (unités de texte) en entrée et en sortie</li>
        <li>Les fichiers joints (images, documents)</li>
      </ul>

      <h3>5.2 Tarification transparente</h3>
      <p>
        Le coût de chaque requête est affiché avant l'envoi et après réception de la
        réponse. Les tarifs par modèle sont consultables dans l'interface de la
        Plateforme et peuvent être modifiés à tout moment, sans effet rétroactif sur
        les crédits déjà achetés.
      </p>

      <h3>5.3 Achat de crédits</h3>
      <p>
        Les crédits peuvent être achetés via la Plateforme. Les conditions d'achat
        sont détaillées dans les Conditions Générales de Vente (CGV).
      </p>

      <h2>Article 6 - Obligations de l'Utilisateur</h2>
      <h3>6.1 Utilisation licite</h3>
      <p>L'Utilisateur s'engage à utiliser le Service de manière licite et à ne pas :</p>
      <ul>
        <li>
          Générer, stocker ou diffuser du contenu illégal, diffamatoire, injurieux,
          obscène, pornographique ou portant atteinte aux droits des tiers
        </li>
        <li>
          Utiliser le Service pour du harcèlement, des menaces ou toute forme de
          discrimination
        </li>
        <li>
          Tenter de générer du contenu visant à nuire à des personnes ou des
          organisations
        </li>
        <li>
          Utiliser le Service pour créer des spams, du phishing ou toute activité
          frauduleuse
        </li>
        <li>
          Tenter de contourner les mesures de sécurité ou les limitations du Service
        </li>
        <li>
          Revendre ou commercialiser l'accès au Service sans autorisation
        </li>
        <li>
          Utiliser des systèmes automatisés pour accéder au Service de manière
          abusive
        </li>
      </ul>

      <h3>6.2 Respect de la propriété intellectuelle</h3>
      <p>
        L'Utilisateur s'engage à respecter les droits de propriété intellectuelle
        des tiers et à ne pas utiliser le Service pour violer des droits d'auteur,
        marques ou brevets.
      </p>

      <h3>6.3 Contenu généré</h3>
      <p>
        L'Utilisateur est seul responsable de l'utilisation qu'il fait du contenu
        généré par les Modèles IA. Il lui appartient de vérifier l'exactitude et la
        pertinence de ce contenu avant toute utilisation.
      </p>

      <h2>Article 7 - Propriété intellectuelle</h2>
      <h3>7.1 Propriété de la Plateforme</h3>
      <p>
        La Plateforme, son interface, son code source et ses contenus (hors contenu
        utilisateur et réponses IA) sont la propriété exclusive de BAJURIAN SAS et
        sont protégés par les lois sur la propriété intellectuelle.
      </p>

      <h3>7.2 Contenu de l'Utilisateur</h3>
      <p>
        L'Utilisateur conserve la propriété de ses messages et fichiers téléchargés.
        Il accorde à BAJURIAN SAS une licence limitée pour traiter ce contenu dans
        le cadre de la fourniture du Service.
      </p>

      <h3>7.3 Réponses des Modèles IA</h3>
      <p>
        Les réponses générées par les Modèles IA sont mises à disposition de
        l'Utilisateur pour son usage personnel ou professionnel. BAJURIAN SAS ne
        revendique aucun droit sur ces contenus, mais ne garantit pas qu'ils soient
        exempts de droits de tiers.
      </p>

      <h2>Article 8 - Responsabilité et garanties</h2>
      <h3>8.1 Limites de l'IA</h3>
      <p>
        <strong>
          Les modèles d'intelligence artificielle peuvent faire des erreurs.
        </strong>{" "}
        L'Utilisateur reconnaît que :
      </p>
      <ul>
        <li>
          Les réponses générées peuvent contenir des inexactitudes ou des erreurs
        </li>
        <li>
          Les Modèles IA n'ont pas accès à des informations en temps réel et leurs
          connaissances peuvent être datées
        </li>
        <li>
          Le Service ne constitue pas un conseil professionnel (médical, juridique,
          financier, etc.)
        </li>
        <li>
          L'Utilisateur doit vérifier toute information importante avant de s'y fier
        </li>
      </ul>

      <h3>8.2 Disponibilité du Service</h3>
      <p>
        BAJURIAN SAS s'efforce d'assurer la disponibilité du Service mais ne peut
        garantir un fonctionnement ininterrompu. Des maintenances ou des
        dysfonctionnements peuvent occasionnellement affecter l'accès au Service.
      </p>

      <h3>8.3 Limitation de responsabilité</h3>
      <p>
        Dans les limites autorisées par la loi, BAJURIAN SAS ne pourra être tenue
        responsable des dommages indirects, pertes de données, pertes de profits ou
        préjudices consécutifs à l'utilisation ou l'impossibilité d'utiliser le
        Service.
      </p>

      <h2>Article 9 - Suspension et résiliation</h2>
      <h3>9.1 Par l'Utilisateur</h3>
      <p>
        L'Utilisateur peut à tout moment supprimer son Compte depuis les paramètres
        de son profil ou en contactant le support. La suppression entraîne la perte
        des crédits non utilisés, sauf demande de remboursement conformément aux
        CGV.
      </p>

      <h3>9.2 Par BAJURIAN SAS</h3>
      <p>
        BAJURIAN SAS se réserve le droit de suspendre ou résilier tout Compte en cas
        de :
      </p>
      <ul>
        <li>Violation des présentes CGU</li>
        <li>Utilisation frauduleuse ou abusive du Service</li>
        <li>Non-paiement</li>
        <li>Demande d'une autorité compétente</li>
      </ul>
      <p>
        En cas de résiliation pour faute de l'Utilisateur, aucun remboursement des
        crédits ne sera effectué.
      </p>

      <h2>Article 10 - Modification des CGU</h2>
      <p>
        BAJURIAN SAS se réserve le droit de modifier les présentes CGU à tout moment.
        Les Utilisateurs seront informés des modifications par email ou notification
        sur la Plateforme. La poursuite de l'utilisation du Service après
        modification vaut acceptation des nouvelles CGU.
      </p>

      <h2>Article 11 - Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le droit français. Tout litige relatif à
        l'interprétation ou à l'exécution des présentes sera soumis aux tribunaux
        compétents de Toulouse, France.
      </p>
      <p>
        Conformément aux dispositions du Code de la consommation, l'Utilisateur
        consommateur peut recourir à une médiation conventionnelle ou à tout mode
        alternatif de règlement des différends.
      </p>

      <h2>Article 12 - Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU, vous pouvez nous contacter :
      </p>
      <ul>
        <li>Par email : admin@iaiaz.com</li>
        <li>
          Par courrier : BAJURIAN SAS, 135 Avenue des Pyrénées, 31830 Plaisance du
          Touch, France
        </li>
      </ul>

      <hr className="my-8" />

      <h2>Mentions légales</h2>
      <p>
        <strong>Éditeur :</strong> BAJURIAN SAS
        <br />
        Société par Actions Simplifiée au capital variable
        <br />
        Siège social : 135 Avenue des Pyrénées, 31830 Plaisance du Touch, France
        <br />
        SIRET : 828 446 435
        <br />
        RCS Toulouse
        <br />
        Président : Antoine BARTHES
        <br />
        Directeur de la publication : Antoine BARTHES
      </p>
      <p>
        <strong>Hébergeur :</strong> Vercel Inc.
        <br />
        440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
      </p>
    </>
  );
}
