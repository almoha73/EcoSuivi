# ⚡ ÉcoSuivi - Tableau de bord Enedis Linky

ÉcoSuivi est une application web légère et élégante pour suivre la consommation électrique de vos compteurs Linky en temps réel. Elle permet de visualiser les données de plusieurs logements (ex: Balguerie et La bicoque) avec une gestion fine des tarifs Heures Creuses / Heures Pleines et de l'abonnement.

## 🚀 Fonctionnalités

- **Multi-Logements** : Suivi simultané de plusieurs PRM.
- **Vues Temporelles** : Analyse par Jour, Semaine, Mois et Année.
- **Calculs Financiers Précis** : 
  - Intégration du coût de l'abonnement proratisé au jour près.
  - Gestion des tarifs Base ou Heures Creuses / Heures Pleines (HC/HP).
  - Détail des coûts et pourcentages d'utilisation au survol.
- **Performance** : Système de cache `sessionStorage` pour minimiser les appels à l'API Enedis.
- **Design Moderne** : Interface "Glassmorphism" sombre, responsive et scrollable.
- **Architecture Serverless** : Prêt pour un déploiement sur Vercel ou Netlify.

## 🛠️ Installation Locale

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/almoha73/EcoSuivi.git
   cd EcoSuivi
   ```

2. Créez un fichier `.env` à la racine et ajoutez votre token Enedis :
   ```env
   ENEDIS_TOKEN=votre_token_ici
   ```

3. Lancez le serveur local :
   ```bash
   node server.js
   ```

4. Ouvrez votre navigateur sur `http://localhost:3000`.

## 🌐 Déploiement (Cloudflare Pages / Vercel)

Ce projet est prêt pour le déploiement sur **Cloudflare Pages** et **Vercel** :

### Cloudflare Pages
1. Liez votre dépôt GitHub dans **Cloudflare Pages**.
2. Dans les paramètres de build :
   - **Framework preset** : *None*
   - **Build command** : Laisser vide ou `npm run build`
   - **Build output directory** : `/` (racine)
3. Dans **Settings > Environment variables**, ajoutez la variable `ENEDIS_TOKEN` avec votre token.
4. Les requêtes `/api/*` sont automatiquement gérées par la fonction Cloudflare Pages (`functions/api/[[path]].js`).

### Vercel
1. Liez votre dépôt GitHub à **Vercel**.
2. **IMPORTANT** : Ajoutez une variable d'environnement nommée `ENEDIS_TOKEN` dans les réglages du projet.
3. Déployez ! La configuration dans `vercel.json` et `api/proxy.js` gère le proxy automatiquement.

## 🔒 Sécurité

Le token Enedis n'est jamais exposé au navigateur (front-end). Il est injecté de manière sécurisée par le serveur (Node.js) ou la fonction Serverless lors de la redirection des requêtes vers l'API `conso.boris.sh`.

---
*Développé avec ❤️ pour un suivi énergétique responsable.*
