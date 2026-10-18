export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

// Express 5 declares Request in express-serve-static-core; augmenting that module
// survives every @types/express / TypeScript version. The old global
// `declare global { namespace Express { ... } }` alias-merge breaks under TS7 (tsgo).
declare module "express-serve-static-core" {
  export interface Request {
    user?: AuthUser;
  }
}
