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

## 🌐 Déploiement (Vercel / Netlify)

Ce projet est configuré pour fonctionner comme une **Serverless Function** (voir `api/proxy.js`).

1. Liez votre dépôt GitHub à **Vercel** ou **Netlify**.
2. **IMPORTANT** : Ajoutez une variable d'environnement nommée `ENEDIS_TOKEN` dans les réglages de votre projet sur leur interface.
3. Déployez !

## 🔒 Sécurité

Le token Enedis n'est jamais exposé au navigateur (front-end). Il est injecté de manière sécurisée par le serveur (Node.js) ou la fonction Serverless lors de la redirection des requêtes vers l'API `conso.boris.sh`.

---
*Développé avec ❤️ pour un suivi énergétique responsable.*
