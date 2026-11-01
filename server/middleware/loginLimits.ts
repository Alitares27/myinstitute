import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createHash } from "crypto";
import { Express } from "express";
export function configureProxy(app: Express, configured = process.env.TRUST_PROXY_CIDRS || "") {
  app.set("trust proxy", configured.trim() ? configured.split(",").map(value => value.trim()).filter(Boolean) : process.env.RENDER === "true" ? 1 : false);
}
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 100, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { message: "Demasiados intentos desde esta conexión. Reintenta en 15 minutos." }
});
export const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => createHash("sha256").update(typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ipKeyGenerator(req.ip || "unknown")).digest("hex"),
  message: { message: "Demasiados intentos para esta cuenta. Reintenta en 15 minutos." }
});
export const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { message: "Demasiados registros desde esta conexión. Reintenta en 15 minutos." }
});
