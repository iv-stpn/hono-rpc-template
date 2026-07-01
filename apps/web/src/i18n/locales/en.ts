// English translations. Keys are grouped by feature area to keep them
// discoverable; nested keys are referenced as e.g. t("todos.title").
export const en = {
  common: {
    appName: "Todos",
    signOut: "Sign out",
    theme: {
      label: "Theme",
      toLight: "Switch to light mode",
      toDark: "Switch to dark mode",
      light: "Light",
      dark: "Dark",
    },
    language: {
      label: "Language",
      en: "English",
      fr: "Français",
    },
  },
  todos: {
    title: "Todos",
    newPlaceholder: "What needs doing?",
    newLabel: "New todo",
    add: "Add",
    remaining: "{{remaining}} of {{total}} left",
    markDone: "Mark as done",
    markNotDone: "Mark as not done",
    delete: "Delete todo",
    deleted: "Todo deleted",
    empty: {
      title: "Nothing here yet",
      subtitle: "Add your first todo above to get started.",
    },
    errors: {
      load: "Could not load todos",
      add: "Could not add todo",
      update: "Could not update todo",
      delete: "Could not delete todo",
    },
  },
  login: {
    title: "Welcome back",
    subtitle: "Sign in to your todos.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    noAccount: "No account?",
    createOne: "Create one",
    failed: "Login failed",
  },
  register: {
    title: "Create account",
    subtitle: "Start tracking your todos in seconds.",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters.",
    submit: "Create account",
    submitting: "Creating…",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    failed: "Registration failed",
  },
} as const;
