/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base URL of the backend worker, e.g. http://localhost:8787
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
