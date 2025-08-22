import type { Request, Response, NextFunction } from "express";
import {setValue} from "../utils/requestContext.js";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || req.headers.authorization;
  const botApiKey = req.headers['x-bot-api-key'] || req.headers['X-BOT-API-KEY'];
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header is missing" });
  }

  if (!botApiKey) {
    return res.status(401).json({ error: "api key header is missing" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "access token is missing" });
  }

  setValue('botsifyChatBotApiKey', botApiKey);
  setValue('accessToken', token);

  return next();
};

export default authMiddleware;