import express, { Request, Response } from "express";
import userService from "../services/user.service";
import { generateNewJWTToken } from "../utils/auth";

const router = express.Router();

router.get("/", (req: Request, res: Response) => {
  return res.json({ message: "Hello from API" });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await userService.authenticate(email, password);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = generateNewJWTToken(user);
  res.json({ user, token });
});

router.post("/register", async (req: Request, res: Response) => {
  const user = await userService.create(req.body);
  if (!user) {
    return res.status(400).json({ message: "Registration failed" });
  }
  res.json({ user });
});

export default router;
