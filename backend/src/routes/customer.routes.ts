import express, { Request, Response } from "express";
import { verifyJWTToken } from "src/utils/auth";

const router = express.Router();

router.get("/", validateRequest, async (req: Request, res: Response) => {
  res.json("Customer List");
});

export default router;

async function validateRequest(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.slice(7, -1);
  if (!token) {
    return res.status(401).json({ message: "Invalid token" });
  }
  const user = await verifyJWTToken(token);
  if (!user) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  req.user = user;

  next();
}
