# 🔧 Soupape

PWA personnelle de suivi auto : **kilométrage**, **essence** et **entretien**.
Installable sur iPhone/Android, fonctionne **hors-ligne**, données stockées **localement** sur l'appareil.

- 3 catégories dans une barre d'onglets « liquid glass » animée (style iOS)
- Un bouton discret 📈 sur chaque catégorie ouvre les graphiques (par mois / année)
- Calculs automatiques : consommation (L/100 km), prix moyen au litre, coût au km, distance/mois…
- **Rappels d'entretien** (vidange, CT…) par distance et/ou durée, avec échéancier « À venir »
- **Photos de factures** attachées aux interventions + **carnet d'entretien imprimable (PDF)** et **export CSV**
- **Prix carburant** officiels + station la moins chère autour de toi (géoloc)
- **Barème kilométrique** fiscal (indemnités km) pré-rempli avec tes km de l'année
- **Documents** : carte grise, assurance, contrôle technique, garanties (échéances + photos)
- Sauvegarde / restauration par export-import JSON et **synchro Google Drive** (optionnelle)

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

Tout est stocké **localement** sur l'appareil (IndexedDB), **rien n'est envoyé sur un serveur**
— sauf si tu actives la sauvegarde Google Drive ci-dessous. Pense à **exporter** (Réglages)
de temps en temps, ou active la synchro Drive.

## Sauvegarde Google Drive (optionnelle)

La sauvegarde utilise un fichier privé dans le dossier caché `appDataFolder` de **ton** Drive
(portée `drive.appdata` : l'app ne voit que son propre fichier). Mise en place :

1. [Google Cloud Console](https://console.cloud.google.com/) → nouveau projet.
2. **APIs & Services → Library** → active **Google Drive API**.
3. **OAuth consent screen** → type *External*, mode *Testing*, ajoute ton compte Google en *test user*.
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   Dans *Authorized JavaScript origins*, ajoute l'URL de l'app :
   - `http://localhost:5173` (dev)
   - `https://<utilisateur>.github.io` (prod Pages)
5. Copie le **Client ID** (`…apps.googleusercontent.com`) dans **Réglages → Sauvegarde Google Drive**.
6. Bouton **Sauvegarder** / **Restaurer**.

> La portée `drive.appdata` n'est pas vérifiée tant que le projet reste en *Testing* : c'est
> parfait pour un usage perso (toi seul, ajouté en test user).

## Idées d'évolutions

Voir la section « ce qu'on peut rajouter » — rappels d'entretien, multi-véhicules,
géoloc des stations, widgets, etc.
