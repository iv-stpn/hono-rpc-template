// French translations. Mirrors the shape of en.ts exactly.
import type { en } from "./en";

// Widens the literal string leaves of the English bundle to `string` while
// preserving its key structure, so French values are checked for the same
// shape without having to match the English text character-for-character.
type Translations<T> = { [K in keyof T]: T[K] extends string ? string : Translations<T[K]> };

export const fr: Translations<typeof en> = {
  common: {
    appName: "Tâches",
    signOut: "Se déconnecter",
    theme: {
      label: "Thème",
      toLight: "Passer en mode clair",
      toDark: "Passer en mode sombre",
      light: "Clair",
      dark: "Sombre",
    },
    language: {
      label: "Langue",
      en: "English",
      fr: "Français",
    },
  },
  todos: {
    title: "Tâches",
    newPlaceholder: "Qu'y a-t-il à faire ?",
    newLabel: "Nouvelle tâche",
    add: "Ajouter",
    remaining: "{{remaining}} sur {{total}} restantes",
    markDone: "Marquer comme faite",
    markNotDone: "Marquer comme non faite",
    delete: "Supprimer la tâche",
    deleted: "Tâche supprimée",
    empty: {
      title: "Rien ici pour l'instant",
      subtitle: "Ajoutez votre première tâche ci-dessus pour commencer.",
    },
    errors: {
      load: "Impossible de charger les tâches",
      add: "Impossible d'ajouter la tâche",
      update: "Impossible de mettre à jour la tâche",
      delete: "Impossible de supprimer la tâche",
    },
  },
  login: {
    title: "Bon retour",
    subtitle: "Connectez-vous à vos tâches.",
    email: "E-mail",
    password: "Mot de passe",
    submit: "Se connecter",
    submitting: "Connexion…",
    noAccount: "Pas de compte ?",
    createOne: "Créez-en un",
    failed: "Échec de la connexion",
  },
  register: {
    title: "Créer un compte",
    subtitle: "Commencez à suivre vos tâches en quelques secondes.",
    email: "E-mail",
    password: "Mot de passe",
    passwordHint: "Au moins 8 caractères.",
    submit: "Créer un compte",
    submitting: "Création…",
    haveAccount: "Vous avez déjà un compte ?",
    signIn: "Se connecter",
    failed: "Échec de l'inscription",
  },
};
