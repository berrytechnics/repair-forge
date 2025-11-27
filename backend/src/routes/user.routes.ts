import express, { Request, Response } from "express";
import {
  BadRequestError,
  UnauthorizedError,
} from "../config/errors";
import { validate } from "../middlewares/validation.middleware";
import { validateRequest } from "../middlewares/auth.middleware";
import userService, { UserWithoutPassword } from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";
import { generateNewJWTToken } from "../utils/auth";
import { loginValidation, registerValidation } from "../validators/user.validator";

const router = express.Router();

// Helper function to convert user from database format to API format
// UserWithoutPassword has snake_case fields at runtime (from database)
function formatUserForResponse(user: UserWithoutPassword) {
  // Type assertion needed because TypeScript types don't match runtime structure
  const userWithSnakeCase = user as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  
  return {
    id: userWithSnakeCase.id,
    firstName: userWithSnakeCase.first_name,
    lastName: userWithSnakeCase.last_name,
    email: userWithSnakeCase.email,
    role: userWithSnakeCase.role,
  };
}

router.post(
  "/login",
  validate(loginValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await userService.authenticate(email, password);
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }
    const token = generateNewJWTToken(user);
    const formattedUser = formatUserForResponse(user);
    
    res.json({
      success: true,
      data: {
        user: formattedUser,
        accessToken: token,
        refreshToken: token, // For now, using same token. Can be updated later for refresh token implementation
      },
    });
  })
);

router.post(
  "/register",
  validate(registerValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.create(req.body);
    if (!user) {
      throw new BadRequestError("Registration failed");
    }
    const token = generateNewJWTToken(user);
    const formattedUser = formatUserForResponse(user);
    
    res.status(201).json({
      success: true,
      data: {
        user: formattedUser,
        accessToken: token,
        refreshToken: token, // For now, using same token. Can be updated later for refresh token implementation
      },
    });
  })
);

router.get(
  "/me",
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    // User is attached to request by validateRequest middleware
    const user = req.user;
    if (!user) {
      throw new UnauthorizedError("User not found");
    }
    const formattedUser = formatUserForResponse(user);
    
    res.json({
      success: true,
      data: formattedUser,
    });
  })
);

export default router;
