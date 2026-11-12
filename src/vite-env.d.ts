/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'solo' for the standalone on-phone build; unset for the shared Firebase build. */
  readonly VITE_EDITION?: 'solo';
}
