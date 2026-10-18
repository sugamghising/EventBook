export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

// Express 5 declares Request in express-serve-static-core; augmenting that module
// survives every @types/express / TypeScript version. The old global
// `declare global { namespace Express { ... } }` alias-merge breaks under TS7 (tsgo).
// Link the augmentation to the module it augments so every checker (TS5, TS7/tsgo,
// and Vercel's build pipeline) resolves it through the import graph, not just via
// ambient file inclusion.
import "express-serve-static-core";

declare module "express-serve-static-core" {
  export interface Request {
    user?: AuthUser;
  }
}
