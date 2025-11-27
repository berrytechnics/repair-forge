import express, { NextFunction, Request, Response } from "express";
import {
  BadRequestError,
  HttpError,
  InternalServerError,
  UnauthorizedError,
} from "../config/errors";
import userService from "../services/user.service";
import { generateNewJWTToken } from "../utils/auth";

const router = express.Router();

// Async handler wrapper to catch errors and pass to error middleware
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

router.get("/", (req: Request, res: Response) => {
  return res.json({ message: "Hello from API" });
});

router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }
    try {
      const user = await userService.authenticate(email, password);
      if (!user) {
        throw new UnauthorizedError("Invalid credentials");
      }
      const token = generateNewJWTToken(user);
      res.json({ user, token });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new InternalServerError("Failed to authenticate user");
    }
  })
);

router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = await userService.create(req.body);
      if (!user) {
        throw new BadRequestError("Registration failed");
      }
      res.status(201).json({ user });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new BadRequestError("Failed to register user");
    }
  })
);

export default router;
