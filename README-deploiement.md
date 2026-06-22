# Formation Avenir(s) — Guide de déploiement

Capsule interactive autonome (`index.html`) + backend Google Apps Script (`Code.gs`)
pour les comptes « site techno » et le mur de promo en direct.

---

## 1. Créer le Google Sheet

1. Ouvrir [sheets.google.com](https://sheets.google.com) → **Nouveau classeur**.
2. Le nommer par exemple `Formation Avenirs — données`.
3. Renommer le premier onglet en **`Comptes`** (clic droit sur l'onglet → *Renommer*).
4. Créer un second onglet nommé **`Mur`** (bouton **+** en bas à gauche).
5. (Facultatif mais recommandé) Saisir les entêtes en ligne 1 :

   | Onglet `Comptes` | A | B | C | D | E | F |
   |---|---|---|---|---|---|---|
   | Ligne 1 | `identifiant` | `passhash` | `date` | `prenom` | `nom` | `niveau` |

   | Onglet `Mur` | A | B | C | D |
   |---|---|---|---|---|
   | Ligne 1 | `date` | `pseudo (Prénom NOM)` | `niveau` | `activite` |

> ℹ️ Les onglets sont créés automatiquement par le script s'ils manquent,
> mais les nommer vous-même évite toute surprise.

> 🔄 **Mise à jour V2 (profils)** : si votre Sheet date de la V1, il n'y a **rien à
> recréer** — les colonnes D/E/F (`prenom`, `nom`, `niveau`) de `Comptes` sont
> remplies automatiquement par le script lors des nouvelles inscriptions et des
> complétions de profil. Les comptes V1 existants fonctionnent toujours : à leur
> première connexion, la capsule propose de compléter le profil (ignorable).
> **En revanche, vous DEVEZ recoller le `Code.gs` V2 et republier une nouvelle
> version du déploiement** (voir l'encadré 🔁 de la section 3).

## 2. Installer le script

1. Dans le Sheet : **Extensions → Apps Script**.
2. Supprimer le contenu du fichier `Code.gs` ouvert par défaut.
3. **Coller l'intégralité** du fichier [`Code.gs`](Code.gs) de ce dossier.
4. Enregistrer (icône disquette ou `Ctrl+S`). Nommer le projet, ex. `formation-avenirs`.

## 3. Déployer en Web App

1. En haut à droite : **Déployer → Nouveau déploiement**.
2. Icône engrenage ⚙ à gauche de « Sélectionner le type » → choisir **Application Web**.
3. Renseigner :
   - **Description** : `formation-avenirs v1`
   - **Exécuter en tant que** : **Moi** (votre compte)
   - **Qui a accès** : **Tout le monde** ⚠️ (indispensable pour que les postes
     des collègues puissent écrire sans connexion Google)
4. Cliquer **Déployer**, puis **autoriser** le script lors de la demande
   d'autorisation (compte → *Paramètres avancés* → *Accéder à formation-avenirs* si
   un écran d'avertissement s'affiche : c'est votre propre script).
5. **Copier l'URL de l'application Web** (elle se termine par `/exec`).

> 🔁 **En cas de modification ultérieure du script** : Déployer → **Gérer les
> déploiements** → crayon ✏ → Version : **Nouvelle version** → Déployer.
> L'URL reste alors identique. (Un « Nouveau déploiement » changerait l'URL !)

## 4. Configurer la capsule

Ouvrir `index.html` et compléter, en haut du bloc `<script>` (vers la fin du fichier) :

```js
// ⬇️ Collez ici l'URL de votre Web App Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";

// ⬇️ Code maître animateur : débloque l'accès si le serveur est injoignable
const MASTER_BYPASS = "VOTRE_CODE_SECRET";

// Code d'accès à la capsule (affiché à l'écran par l'animateur)
const ACCESS_CODE = "AVN26";
```

- `APPS_SCRIPT_URL` : l'URL copiée à l'étape 3.5.
- `MASTER_BYPASS` : choisissez un code que **vous seul** connaissez (à dicter aux
  collègues uniquement si le réseau tombe le jour J).
- `ACCESS_CODE` : `AVN26` par défaut, modifiable.

## 5. Publier sur GitHub Pages

1. Pousser le dossier `formation-avenirs/` sur le dépôt GitHub du site.
2. Vérifier que GitHub Pages est actif (Settings → Pages).
3. La capsule sera accessible à l'adresse :
   `https://<votre-utilisateur>.github.io/<votre-depot>/formation-avenirs/`
4. Le QR code de l'écran d'accueil se génère automatiquement à partir de l'URL réelle.

> 📱 **QR code et tests en local** : si la page est ouverte en local (double-clic sur
> le fichier ou `localhost`), le QR code pointe automatiquement vers l'adresse
> publique GitHub Pages (constante `PUBLIC_URL` dans `index.html`) — un smartphone
> ne peut pas ouvrir une adresse locale. Le QR ne fonctionnera donc sur téléphone
> qu'une fois la capsule **réellement publiée** sur GitHub Pages.

## 6. Note CORS (pourquoi ça marche)

GitHub Pages et Apps Script sont sur des domaines différents. Pour éviter le
« préflight » CORS qui ferait échouer les requêtes :

- la capsule envoie ses POST en `Content-Type: text/plain;charset=utf-8`
  (requête « simple », acceptée sans préflight), corps = JSON ;
- le script lit `e.postData.contents` et parse le JSON lui-même ;
- la liste du mur (`wall_list`) passe par un **GET** simple, le plus robuste.

Aucun réglage CORS supplémentaire n'est nécessaire.

## 7. Sécurité et données

- Les mots de passe sont **hachés en SHA-256 sur le poste de l'utilisateur**
  avant envoi : ils ne transitent et ne sont stockés **jamais en clair**.
- Aucune donnée élève, aucun identifiant en dur dans le code publié
  (le `MASTER_BYPASS` est un code animateur, pas un mot de passe de compte —
  choisissez-le différent de vos mots de passe habituels).
- L'état de travail des participants reste **en mémoire du navigateur**
  (pas de localStorage) : la sauvegarde passe par l'export Word ou le PDF.

---

## ✅ Checklist de test (à faire AVANT le jour J)

| # | Test | Comment vérifier | OK |
|---|------|------------------|----|
| 1 | **Inscription V2** | Onglet « Créer un compte » → identifiant + **prénom + nom + niveau** + mot de passe → une ligne apparaît dans `Comptes` avec les colonnes D/E/F remplies. | ☐ |
| 2 | **Connexion** | Se déconnecter (recharger la page) → « Se connecter » avec le même couple → accès direct à l'écran « code capsule ». Mauvais mot de passe → message d'erreur. | ☐ |
| 3 | **Compte ancien (V1)** | Se connecter avec un compte créé avant la V2 (colonnes D/E/F vides) → l'écran « Encore un instant » propose de compléter le profil ; « Plus tard » fonctionne aussi sans blocage. | ☐ |
| 4 | **Hachage SHA-256 effectif** | Dans le Sheet, colonne B de `Comptes` : chaîne hexadécimale de 64 caractères, jamais le mot de passe. | ☐ |
| 5 | **Porte AVN26** | Après connexion, un mauvais code est refusé ; `AVN26` (ou `avn26`) ouvre la capsule. | ☐ |
| 6 | **Dictée vocale** | Étape 2 ou 4 : bouton 🎙 → le texte dicté s'ajoute au champ (Chrome/Edge ; sur Firefox le bouton disparaît proprement). | ☐ |
| 7 | **Capsule vidéo étape 2** | La vidéo « Le point de vue de l'élève » se lit dans la page (lecture, pause, plein écran) ; cocher un point de repérage fait apparaître sa vignette. | ☐ |
| 8 | **Visuels étape 3** | Cocher un repérage côté prof fait apparaître la capture correspondante (suivi / banque d'activités / progression / **assignation** d'une activité à une classe ou un élève — image combinée des 3 captures). | ☐ |
| 9 | **Mur — post signé** | Étape 6 : connecté avec un profil complet, le formulaire affiche « Vous publierez en tant que Prénom NOM · niveau » ; publier → la ligne du Sheet `Mur` contient Prénom NOM et le niveau. | ☐ |
| 10 | **Mur — affichage live** | Ouvrir la capsule sur un 2ᵉ navigateur/poste : la publication du 1ᵉʳ apparaît en ≤ 10 s. | ☐ |
| 11 | **Export formateur** | Étape 6 → « 🔑 Vue formateur » → code maître → « Copier dans le presse-papiers » : texte groupé `=== NIVEAU 5e ===` / 4e / 3e (+ `=== AUTRES ===`), une ligne `• Prénom NOM — contribution` par post ; le bouton .txt fonctionne aussi. | ☐ |
| 12 | **Mode dégradé / MASTER_BYPASS** | Fausse URL dans `APPS_SCRIPT_URL` (ou réseau coupé) → « Accès animateur » + code maître → entrée OK, badge « ⚠ Mode dégradé », mur local. | ☐ |
| 13 | **Export Word** | Étape 8 → le `.doc` s'ouvre dans Word : participant (Prénom NOM), objectifs retenus, cases cochées, note, fiche, programmation, publications. | ☐ |
| 14 | **Impression PDF + page de garde** | Étape 8 → Imprimer : la 1ʳᵉ page est la page de garde (image Avenirs, Participant Prénom NOM, Formateur Romain Blanchard, date du jour en français) ; TOUTES les images révélées (vignettes étapes 2-3, captures jointes) sont visibles, sans coupe au milieu d'une image. | ☐ |
| 15 | **Captures d'écran jointes** | Étape 2 ou 4 : `Win+Maj+S` puis `Ctrl+V` dans le champ (ou bouton 📷) → vignette affichée, supprimable, présente dans l'export Word et le PDF. | ☐ |
| 16 | **Programmation annuelle** | Étape 5 : onglets 5e/4e/3e, cocher des mois → « Imprimer mes feuilles » ne sort que les feuilles cochées ; coches reprises dans Word et PDF. | ☐ |
| 17 | **Objectifs cochables** | Étape 1 : cocher des objectifs (un ou plusieurs niveaux) → section « Objectifs retenus par niveau » dans l'export Word. | ☐ |
| 18 | **Minuteur supprimé** | Plus aucun bouton ni widget minuteur nulle part (en-tête, page, impression). | ☐ |

## Jour J — pense-bête animateur

1. Projeter la capsule + afficher le code `AVN26` au tableau.
2. Garder le **code maître** sous la main (mode secours + vue formateur du mur).
3. Étape 6 : laisser l'écran projeté sur le mur de promo, il se rafraîchit tout seul.
4. Rappeler l'export (étape 8) avant que les collègues ne ferment leur session.
5. Après la séance : étape 6 → 🔑 Vue formateur → copier le mur par niveau → coller dans un mail aux équipes.
