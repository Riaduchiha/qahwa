
Le client n'a **aucun accès** aux routes sous `/qahwa` sans session valide
(redirection vers `/qahwa/login`).

## État actuel — Étapes 1, 3, 4, 5, 6 + POS/KDS

- Structure + menu dynamique + panier + commande + QAHWA (auth/dashboard).
- **Barista Display / KDS** (`/qahwa/kds`, accessible depuis un bouton du
  dashboard) : écran plein écran temps réel pour le personnel (barista /
  bar / cuisine, filtrable par onglet). Chaque commande active affiche
  table/heure/temps écoulé/produits, avec un bouton par produit
  NEW → PREPARING → READY. Quand tous les produits d'une commande sont
  prêts, son statut global passe automatiquement à "prête". Nouvelle
  commande = son (si `public/notification.mp3` est fourni — sinon
  silencieux, pas d'erreur) + mise à jour instantanée (Supabase
  Realtime, pas de rechargement de page). Le poste (`station`) de
  chaque produit est configurable ; par défaut tout est sur "barista".

### Nouvelle migration à exécuter

En plus de `0001_menu.sql` et `0002_orders.sql`, exécute maintenant
`supabase/migrations/0003_kds.sql` (ajoute les colonnes `station` et
`status`, active le temps réel sur `orders`/`order_items`).

### Son de notification (optionnel)

Dépose un fichier `notification.mp3` dans `public/` si tu veux un son
à l'arrivée d'une commande sur le Barista Display. Sans ce fichier,
tout fonctionne normalement, juste sans son.

### Créer le compte propriétaire

Aucune inscription publique n'est prévue pour QAHWA (accès réservé).
Pour créer le premier compte :
1. Dashboard Supabase → **Authentication** → **Users** → **Add user**
   → **Create new user**.
2. Renseigne un email et un mot de passe, coche **Auto Confirm User**.
3. Utilise ces identifiants sur `/qahwa/login`.

### Mettre en place la base de données

1. Crée un projet sur [supabase.com](https://supabase.com) si ce n'est pas
   déjà fait.
2. Dans le Dashboard Supabase → **SQL Editor**, colle le contenu de
   `supabase/migrations/0001_menu.sql` et clique **Run**. Ça crée les
   tables et ajoute 2-3 produits de démo.
3. Récupère tes clés dans **Project Settings → API** : `Project URL` et
   `anon public key`.
4. En local : mets-les dans `.env.local` (voir `.env.example`).
   Sur Vercel : **Project → Settings → Environment Variables**, ajoute
   `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, puis
   redéploie (`vercel --prod`).

Sans ces clés configurées, la page `/menu` affiche un message
d'explication au lieu de planter — normal, pas une erreur à corriger.

## Design

Les couleurs, polices et composants dans `tailwind.config.ts` et les pages
sont **provisoires**, calés sur les deux captures de maquette déjà partagées
(fond orange, logo rond, typographie arrondie). Ils seront remplacés
fidèlement dès réception de la maquette complète — aucun nouvel univers
graphique ne sera inventé (brief §29).

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # renseigner les clés Supabase
npm run dev
```

## Prochaine étape

Étape 2 : accueil + navigation définitives une fois la maquette reçue,
ou Étape 3 (menu dynamique + schéma Supabase produits/catégories) si tu
préfères avancer sur la donnée en attendant la maquette.# Qahwa — plateforme web

Écosystème complet pour Qahwa (Hydra, Alger) : site public (vitrine, menu,
commande, PLAY) + espace privé de gestion **QAHWA**.

## Stack

- **Next.js 14** (App Router) + TypeScript — un seul projet full-stack
- **Tailwind CSS** — styling, tokens de design centralisés dans `tailwind.config.ts`
- **Supabase** (Postgres + Auth + Storage + Realtime) — base de données,
  authentification du personnel, futur temps réel pour PLAY et les commandes
- **Zustand** — état du panier côté client
- **Zod** — validation des formulaires (commande, livraison)

Choix faits librement (aucune préférence donnée) ; facilement remplaçables si besoin.

## Architecture — séparation stricte (brief §24)