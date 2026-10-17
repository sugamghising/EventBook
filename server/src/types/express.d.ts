export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
