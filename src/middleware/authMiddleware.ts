import type { Request, Response, NextFunction } from "express";
import {setValue} from "../utils/requestContext.js";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header is missing" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "api token is missing" });
  }

  setValue('botsifyChatBotApiKey', token);

  return next();
};

export default authMiddleware;