import type { Request } from "express";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";

export interface RequestWithId extends Request {
  requestId?: string;
  auth?: AuthenticatedPrincipal;
}
