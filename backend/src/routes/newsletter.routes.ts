import express, { Request, Response } from "express";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireSuperuser } from "../middlewares/rbac.middleware.js";
import newsletterService from "../services/newsletter.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ValidationError } from "../config/errors.js";

const router = express.Router();

// POST /api/newsletter/subscribe - Public endpoint to subscribe to newsletter
router.post(
  "/subscribe",
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      throw new ValidationError("Email is required", { email: "Email is required" });
    }

    const subscriber = await newsletterService.subscribe(email);

    res.json({
      success: true,
      data: subscriber,
      message: "Successfully subscribed to newsletter",
    });
  })
);

// POST /api/newsletter/unsubscribe - Public endpoint to unsubscribe from newsletter
router.post(
  "/unsubscribe",
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      throw new ValidationError("Email is required", { email: "Email is required" });
    }

    await newsletterService.unsubscribe(email);

    res.json({
      success: true,
      message: "Successfully unsubscribed from newsletter",
    });
  })
);

// GET /api/newsletter/subscribers - Get all subscribers (superuser only)
router.get(
  "/subscribers",
  validateRequest,
  requireSuperuser(),
  asyncHandler(async (req: Request, res: Response) => {
    const subscribers = await newsletterService.getAllSubscribers();

    res.json({
      success: true,
      data: subscribers,
    });
  })
);

// GET /api/newsletter/subscribers/count - Get subscriber count (superuser only)
router.get(
  "/subscribers/count",
  validateRequest,
  requireSuperuser(),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await newsletterService.getSubscriberCount();

    res.json({
      success: true,
      data: { count },
    });
  })
);

export default router;

