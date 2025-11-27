import jwt from "jsonwebtoken";
import userService, { UserWithoutPassword } from "src/services/user.service";

/** Generate a JWT token with the user. */
export function generateNewJWTToken(user: UserWithoutPassword) {
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });
  return token;
}

export async function verifyJWTToken(
  token: string
): Promise<UserWithoutPassword | null> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const user = await userService.findById(decoded.userId);
    return user;
  } catch (error) {
    console.error("Invalid JWT token:", error);
    return null;
  }
}
