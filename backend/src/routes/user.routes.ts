import express, { Request, Response } from "express";
import {
  BadRequestError,
  UnauthorizedError,
} from "../config/errors";
import { validate } from "../middlewares/validation.middleware";
import userService from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";
import { generateNewJWTToken } from "../utils/auth";
import { loginValidation, registerValidation } from "../validators/user.validator";

const router = express.Router();

router.get("/", (req: Request, res: Response) => {
  return res.json({ message: "Hello from API" });
});

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
    res.json({ user, token });
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
    res.status(201).json({ user });
  })
);

export default router;
