# Veille citoyenne de Popenguine

Plateforme publique où les habitants de Popenguine et environs signalent alertes, remarques et suggestions (santé, sécurité, éducation, eau/environnement/routes). Chaque message est relu par l'administrateur avant publication, puis suivi par état (nouveau, en cours, résolu).

## Structure

- `public/` : site public (`index.html`) et administration (`admin.html`)
- `api/reports.js` : liste publique et dépôt de signalements
- `api/admin.js` : modération (mot de passe requis)
- `supabase/schema.sql` : table et sécurité de la base

## Tester en local (sans Vercel ni base de données)

Depuis le dossier du projet, avec Node.js installé :

`npx serve public`

Ouvrir ensuite l'adresse affichée (en général `http://localhost:3000`). Le site fonctionne en mode démonstration : des exemples sont fournis et les messages restent dans le navigateur. Administration : `http://localhost:3000/admin`, avec n'importe quel e-mail et le mot de passe `demo`.

Parcours à essayer : envoyer un signalement depuis l'accueil, le valider dans l'administration (bouton « Valider et publier »), puis le retrouver dans le suivi public. Pour repartir de zéro, effacer les données du site dans le navigateur.

Ne pas ouvrir `index.html` en double-cliquant : les fichiers ont besoin d'un petit serveur.

## Mise en ligne sur Vercel

1. **Base de données** : créer un projet gratuit sur supabase.com, puis dans *SQL Editor* exécuter le contenu de `supabase/schema.sql`.
2. **Clés** : dans Supabase, *Project Settings > API*, copier l'URL du projet et la clé `service_role` (secrète, ne jamais la mettre dans le code public).
3. **Vercel** : importer ce dossier (via GitHub, ou `npx vercel` dans le dossier).
4. Dans Vercel, *Settings > Environment Variables*, ajouter :
   - `SUPABASE_URL` : l'URL du projet Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` : la clé service_role
   - `ADMIN_PASSWORD` : un mot de passe long et unique
   - `ADMIN_EMAIL` : l'adresse e-mail de l'administrateur (connexion à `/admin` par e-mail + mot de passe)
   - Plusieurs validateurs (facultatif) : `ADMIN_USERS`, une liste JSON, par exemple `[{"email":"commune@exemple.sn","password":"mot-de-passe-1"},{"email":"abyp@exemple.sn","password":"mot-de-passe-2"}]`. Chaque validateur se connecte avec son e-mail et son mot de passe. Le couple `ADMIN_EMAIL` + `ADMIN_PASSWORD` reste valable en plus.
5. Redéployer. Le site passe automatiquement du mode démonstration au mode réel.

Administration : `https://votre-site.vercel.app/admin`

Mot de passe oublié ou à changer : le modifier dans Vercel (*Settings > Environment Variables*, variable `ADMIN_PASSWORD`), puis redéployer. Il n'y a pas de réinitialisation par e-mail. Les notifications de nouveaux signalements vont à l'adresse de `NOTIFY_EMAIL_TO` (voir plus bas), qui peut être la même que `ADMIN_EMAIL`.

## Photos

Les alertes peuvent porter jusqu'à 3 photos. Le navigateur les réduit et les convertit en JPEG (ce qui supprime les données GPS), puis l'API les range dans le dossier Supabase `report-photos` (créé par `schema.sql`). Elles ne deviennent visibles qu'une fois l'alerte validée par l'administrateur, et sont effacées si l'alerte est supprimée.

Si la base existe déjà, réexécuter `schema.sql` : il ajoute la colonne `photos` et le dossier sans toucher aux données.

## Notifications à l'équipe

À chaque nouveau signalement, l'équipe peut être prévenue. Chaque canal est optionnel et s'active en ajoutant ses variables dans Vercel (puis redéployer). Une notification qui échoue n'empêche jamais le dépôt du signalement.

**E-mail** (tous les signalements) via resend.com, offre gratuite :
- `RESEND_API_KEY` : clé API Resend
- `NOTIFY_EMAIL_TO` : adresse(s) destinataire(s), séparées par des virgules
- `NOTIFY_EMAIL_FROM` : expéditeur, par exemple `Veille Popenguine <alerte@votredomaine.sn>` (nécessite un domaine vérifié chez Resend ; sans cela, l'expéditeur de test de Resend n'envoie qu'à l'adresse du compte Resend)

**WhatsApp** (par défaut, uniquement les alertes urgentes) via l'API WhatsApp Business de Meta :
- `WHATSAPP_TOKEN` : jeton d'accès permanent
- `WHATSAPP_PHONE_ID` : identifiant du numéro WhatsApp Business
- `NOTIFY_WHATSAPP_TO` : numéro(s) au format international, séparés par des virgules (ex. `221770000000`)
- `NOTIFY_WHATSAPP_MODE` : `urgent` (défaut) ou `all`
- `WHATSAPP_TEMPLATE` : nom d'un modèle de message approuvé par Meta (voir ci-dessous)
- `WHATSAPP_TEMPLATE_LANG` : langue du modèle, `fr` par défaut

Important : Meta ne livre un message libre que si le destinataire a écrit au numéro dans les dernières 24 heures. Pour être prévenu à tout moment, il faut un modèle approuvé, par exemple :

> Nouveau signalement : {{1}} à {{2}}. Titre : {{3}}. Connectez-vous à l'administration pour le valider.

Sans `WHATSAPP_TEMPLATE`, le message est envoyé en texte libre (utile pour tester).

Optionnel : `SITE_URL` (ex. `https://veille-popenguine.vercel.app`) pour fixer le lien vers l'administration dans les messages.

## Modifier le site depuis l'administration

Onglet **Paramètres du site** (dans `/admin`) : titre et introduction de l'accueil, section « Pourquoi cette plateforme ? », les trois étapes, la mention « Porté par », la liste des localités et le texte des numéros d'urgence. Les changements apparaissent tout de suite sur le site. Un champ vide reprend le texte d'origine, et « Rétablir les textes d'origine » remet tout à zéro. Les réglages sont stockés dans la table `site_settings` : si la base existait déjà avant cette version, exécuter de nouveau `supabase/schema.sql`.

## Avant le lancement officiel

Le site est volontairement masqué de Google (`noindex` dans `index.html`, `X-Robots-Tag` dans `vercel.json`, `public/robots.txt`). Pour le rendre public : retirer ces trois éléments et redéployer.

## Photos de fond du Cap Naze (accueil et administration)

L'accueil alterne en fondu (16 secondes) la photo de la sculpture (cadre à droite) et celle de la falaise (plein fond sous un voile bleu). L'administration affiche la falaise seule. Pour changer une photo : remplacer `public/cap-naze-1.jpg` ou `public/cap-naze-2.jpg` (même nom). Vérifier les droits d'utilisation des photos avant la mise en ligne publique. L'ancien outil de trame reste dans `outils/trame.py` si besoin.

## Personnalisation

`public/config.js` : liste des localités, libellés des domaines, types et états.

## Limites connues (à prévoir pour la suite)

- Pas de limitation de débit avancée : seul un champ piège anti-robots est en place. Si le site subit du spam, ajouter un captcha (Cloudflare Turnstile) ou un rate limit.
- Un seul compte administrateur (e-mail + mot de passe).
- Pas de photos jointes ni de notifications (SMS/WhatsApp/e-mail) : extensions possibles.
