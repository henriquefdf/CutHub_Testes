// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { JsonWebTokenError } from "jsonwebtoken";
import { NotAuthorizedError } from "../../errors/NotAuthorizedError";
import { InvalidParamError } from "../../errors/InvalidParamError";
import { TokenError } from "../../errors/TokenError";
import { QueryError } from "../../errors/QueryError";
import { InvalidRouteError } from "../../errors/InvalidRouteError";
import { PermissionError } from "../../errors/PermissionError";
import { LoginError } from "../../errors/LoginError";
import { codigoStatus } from "../../utils/constants/statusCodes";

export default function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.error(error);

  const message = (error as Error).message;
  let status = codigoStatus.ERRO_INTERNO_SERVIDOR; // 500 por padrão

  switch (true) {
    case error instanceof InvalidRouteError:
      status = codigoStatus.NAO_ENCONTRADO; // 404
      break;

    case error instanceof JsonWebTokenError:
    case error instanceof NotAuthorizedError:
      status = codigoStatus.PROIBIDO; // 403
      break;

    case error instanceof PermissionError:
      status = codigoStatus.PROIBIDO; // 403
      break;

    case error instanceof LoginError:
      status = codigoStatus.NAO_AUTORIZADO; // 401
      break;

    case error instanceof InvalidParamError:
    case error instanceof QueryError:
      status = codigoStatus.SOLICITACAO_INVALIDA; // 400
      break;

    case error instanceof TokenError:
      status = codigoStatus.NAO_ENCONTRADO; // 404
      break;
  }

  res.status(status).json({ message });
}
