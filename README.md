# 🔧 Soupape

PWA personnelle de suivi auto : **kilométrage**, **essence** et **entretien**.
Installable sur iPhone/Android, fonctionne **hors-ligne**, données stockées **localement** sur l'appareil.

- 3 catégories dans une barre d'onglets « liquid glass » animée (style iOS)
- Un bouton discret 📈 sur chaque catégorie ouvre les graphiques (par mois / année)
- Calculs automatiques : consommation (L/100 km), prix moyen au litre, coût au km, distance/mois…
- Sauvegarde / restauration par export-import JSON

## Stack

Vite · React · TypeScript · `vite-plugin-pwa` · graphiques SVG maison (aucune dépendance lourde).

## Démarrer en local

```bash
npm install
npm run dev      # http://localhost:5173/Soupape/
npm run build    # build de production dans dist/
npm run preview  # prévisualise le build
```

> L'app est servie sous le chemin `/Soupape/` (voir `base` dans `vite.config.ts`).

## Déploiement (GitHub Pages)

Un workflow (`.github/workflows/deploy.yml`) build et publie automatiquement.

1. Pousser sur la branche `main`.
2. Repo → **Settings → Pages → Source : GitHub Actions**.
3. L'app sera disponible sur `https://<utilisateur>.github.io/Soupape/`.
4. Sur le téléphone : ouvrir l'URL → **Partager → Sur l'écran d'accueil** (iOS) / **Installer l'application** (Android).

Pour un hébergement à la racine d'un domaine, builder avec `BASE_PATH=/ npm run build`.

## Icônes

Générées depuis un seul SVG vectoriel :

```bash
npm run icons
```

## Données & confidentialité

Tout est stocké dans le `localStorage` du navigateur, **rien n'est envoyé sur un serveur**.
Pense à **exporter** (Réglages → Exporter) de temps en temps pour garder une sauvegarde.

## Idées d'évolutions

Voir la section « ce qu'on peut rajouter » — rappels d'entretien, multi-véhicules,
géoloc des stations, widgets, etc.
