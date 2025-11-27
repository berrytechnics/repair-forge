import { UserWithoutPassword } from "./src/services/user.service";
declare global {
  namespace Express {
    interface Request {
      user?: UserWithoutPassword;
    }
  }
}
