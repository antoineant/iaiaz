import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente - iaiaz",
  description: "Conditions générales de vente de la plateforme iaiaz",
};

export default function CGVPage() {
  return (
    <>
      <h1>Conditions Générales de Vente</h1>
      <p className="text-[var(--muted-foreground)]">
        Dernière mise à jour : 16 janvier 2025
      </p>

      <h2>Article 1 - Objet</h2>
      <p>
        Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent les
        relations contractuelles entre la société BAJURIAN SAS (ci-après « le
        Vendeur ») et toute personne physique ou morale (ci-après « le Client »)
        effectuant un achat de crédits sur la plateforme iaiaz (ci-après « la
        Plateforme »).
      </p>
      <p>
        Les présentes CGV complètent les Conditions Générales d'Utilisation (CGU)
        de la Plateforme. En cas de contradiction, les présentes CGV prévalent pour
        tout ce qui concerne l'achat de crédits.
      </p>

      <h2>Article 2 - Produits et services</h2>
      <h3>2.1 Description</h3>
      <p>
        La Plateforme propose l'achat de crédits permettant d'utiliser différents
        modèles d'intelligence artificielle. Les crédits sont exprimés en euros et
        sont consommés proportionnellement à l'utilisation des services IA.
      </p>

      <h3>2.2 Packs de crédits</h3>
      <p>Les crédits sont proposés sous forme de packs :</p>
      <ul>
        <li>
          <strong>Pack Découverte :</strong> 5€ de crédits
        </li>
        <li>
          <strong>Pack Standard :</strong> 10€ de crédits
        </li>
        <li>
          <strong>Pack Pro :</strong> 20€ de crédits
        </li>
      </ul>
      <p>
        D'autres montants peuvent être proposés. Les tarifs sont affichés TTC (TVA
        incluse le cas échéant).
      </p>

      <h3>2.3 Consommation des crédits</h3>
      <p>
        Les crédits sont débités en fonction de l'utilisation réelle des services
        IA, selon une tarification transparente affichée pour chaque modèle. Le
        coût de chaque requête est affiché avant l'envoi et dans l'historique des
        conversations.
      </p>

      <h2>Article 3 - Prix et paiement</h2>
      <h3>3.1 Prix</h3>
      <p>
        Les prix sont indiqués en euros et incluent toutes les taxes applicables.
        Le Vendeur se réserve le droit de modifier ses prix à tout moment, mais les
        crédits seront facturés au prix en vigueur au moment de la commande.
      </p>

      <h3>3.2 Modalités de paiement</h3>
      <p>
        Le paiement s'effectue par carte bancaire via la plateforme sécurisée
        Stripe. Les cartes acceptées sont : Visa, Mastercard, American Express.
      </p>
      <p>
        Le paiement est exigible immédiatement à la commande. Les crédits sont
        crédités sur le Compte du Client dès confirmation du paiement.
      </p>

      <h3>3.3 Sécurité des paiements</h3>
      <p>
        Les transactions sont sécurisées par Stripe, prestataire certifié PCI-DSS.
        Le Vendeur n'a pas accès aux informations bancaires complètes du Client.
      </p>

      <h3>3.4 Facturation</h3>
      <p>
        Une facture est générée pour chaque achat et accessible depuis l'espace
        client. Elle est également envoyée par email à l'adresse associée au
        Compte.
      </p>

      <h2>Article 4 - Droit de rétractation</h2>
      <h3>4.1 Principe</h3>
      <p>
        Conformément à l'article L221-18 du Code de la consommation, le Client
        consommateur dispose d'un délai de 14 jours à compter de l'achat pour
        exercer son droit de rétractation, sans avoir à justifier de motifs ni à
        payer de pénalités.
      </p>

      <h3>4.2 Exception pour services numériques</h3>
      <p>
        Conformément à l'article L221-28 du Code de la consommation, le droit de
        rétractation ne peut être exercé pour les crédits qui ont été utilisés. Le
        remboursement ne portera donc que sur les crédits non consommés.
      </p>

      <h3>4.3 Exercice du droit de rétractation</h3>
      <p>
        Pour exercer ce droit, le Client doit notifier sa décision par email à
        secretariat@girafestudio.fr en indiquant clairement sa volonté de se
        rétracter, accompagnée de ses coordonnées et du numéro de commande.
      </p>

      <h2>Article 5 - Politique de remboursement</h2>
      <h3>5.1 Remboursement pro-rata</h3>
      <p>
        <strong>
          Le Client peut demander le remboursement de ses crédits non utilisés à
          tout moment.
        </strong>{" "}
        Le remboursement sera calculé au prorata des crédits restants sur le
        Compte.
      </p>

      <h3>5.2 Procédure de remboursement</h3>
      <p>Pour demander un remboursement :</p>
      <ol>
        <li>
          Envoyer une demande par email à secretariat@girafestudio.fr avec l'objet
          « Demande de remboursement »
        </li>
        <li>Indiquer l'adresse email associée au Compte</li>
        <li>Préciser le motif de la demande (facultatif)</li>
      </ol>

      <h3>5.3 Délai et modalités</h3>
      <p>
        Le remboursement sera effectué dans un délai de 14 jours suivant la
        réception de la demande, par le même moyen de paiement que celui utilisé
        pour l'achat initial, sauf accord contraire du Client.
      </p>

      <h3>5.4 Exclusions</h3>
      <p>Aucun remboursement ne sera effectué :</p>
      <ul>
        <li>Pour les crédits déjà consommés</li>
        <li>
          En cas de résiliation du Compte pour violation des CGU ou des présentes
          CGV
        </li>
        <li>Pour les crédits offerts gratuitement (bonus, promotions)</li>
      </ul>

      <h2>Article 6 - Livraison</h2>
      <p>
        Les crédits achetés sont des biens numériques livrés immédiatement. Dès
        confirmation du paiement, les crédits sont disponibles sur le Compte du
        Client et peuvent être utilisés sans délai.
      </p>
      <p>
        En cas de problème technique empêchant le crédit des fonds, le Client est
        invité à contacter le support à secretariat@girafestudio.fr.
      </p>

      <h2>Article 7 - Garanties</h2>
      <h3>7.1 Garantie de conformité</h3>
      <p>
        Conformément aux articles L217-3 et suivants du Code de la consommation, le
        Vendeur garantit la conformité des services numériques fournis. En cas de
        défaut de conformité, le Client peut demander la mise en conformité ou, si
        celle-ci est impossible, une réduction de prix ou la résolution du contrat.
      </p>

      <h3>7.2 Garantie des vices cachés</h3>
      <p>
        Conformément aux articles 1641 et suivants du Code civil, le Client peut
        demander la résolution de la vente ou une réduction du prix en cas de vice
        caché rendant le service impropre à son usage.
      </p>

      <h2>Article 8 - Responsabilité</h2>
      <h3>8.1 Obligations du Vendeur</h3>
      <p>
        Le Vendeur s'engage à mettre en œuvre tous les moyens nécessaires pour
        assurer la fourniture du service dans les meilleures conditions. Il s'agit
        d'une obligation de moyens.
      </p>

      <h3>8.2 Limitations</h3>
      <p>
        Le Vendeur ne pourra être tenu responsable des dommages résultant d'une
        mauvaise utilisation du service, d'une décision prise sur la base d'un
        contenu généré par IA, ou d'une indisponibilité temporaire du service.
      </p>

      <h2>Article 9 - Données personnelles</h2>
      <p>
        Les données personnelles collectées dans le cadre des achats sont traitées
        conformément à notre Politique de Confidentialité, accessible à l'adresse{" "}
        <a href="/legal/privacy" className="text-primary-600 hover:underline">
          /legal/privacy
        </a>
        .
      </p>
      <p>
        Les données nécessaires au paiement sont traitées par notre prestataire
        Stripe conformément à sa propre politique de confidentialité.
      </p>

      <h2>Article 10 - Médiation</h2>
      <p>
        Conformément à l'article L612-1 du Code de la consommation, en cas de litige
        non résolu, le Client consommateur peut recourir gratuitement à un médiateur
        de la consommation.
      </p>
      <p>
        Avant de saisir le médiateur, le Client doit d'abord tenter de résoudre le
        litige directement auprès du Vendeur en adressant une réclamation écrite à
        secretariat@girafestudio.fr.
      </p>
      <p>
        Le Client peut également utiliser la plateforme européenne de règlement des
        litiges en ligne :{" "}
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          https://ec.europa.eu/consumers/odr
        </a>
      </p>

      <h2>Article 11 - Droit applicable</h2>
      <p>
        Les présentes CGV sont soumises au droit français. Tout litige relatif à
        leur interprétation ou à leur exécution relève de la compétence des
        tribunaux français.
      </p>
      <p>
        Pour les consommateurs résidant dans l'Union Européenne, les dispositions
        impératives de protection du consommateur du pays de résidence restent
        applicables.
      </p>

      <h2>Article 12 - Contact</h2>
      <p>
        Pour toute question concernant les présentes CGV ou vos achats :
      </p>
      <ul>
        <li>Email : secretariat@girafestudio.fr</li>
        <li>
          Adresse : BAJURIAN SAS, 135 Avenue des Pyrénées, 31830 Plaisance du Touch,
          France
        </li>
      </ul>

      <hr className="my-8" />

      <p className="text-sm text-[var(--muted-foreground)]">
        <strong>BAJURIAN SAS</strong>
        <br />
        Société par Actions Simplifiée
        <br />
        SIRET : 828 446 435 - RCS Toulouse
      </p>
    </>
  );
}
