import dotenv from "dotenv";
import path from "path";

const envFile =
  process.env.NODE_ENV === "test"
    ? path.resolve(__dirname, "../../.env.test")
    : path.resolve(__dirname, "../../.env");

dotenv.config({ path: envFile });

import express, { Express } from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import { getEnv } from "../utils/functions/getEnv";

import usuariosRouter from "../src/domains/usuario/controllers";
import barbeariaRouter from "../src/domains/barbearia/controllers";
import servicoRouter from "../src/domains/servico/controllers";
import agendamentoRouter from "../src/domains/agendamento/controllers";
import errorHandler from "../src/middlewares/errorHandler";

export const app: Express = express();

const options: CorsOptions = {
  origin: getEnv("APP_URL"),
  credentials: true,
};
app.use(cors(options));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/usuarios", usuariosRouter);
app.use("/api/barbearias", barbeariaRouter);
app.use("/api/servicos", servicoRouter);
app.use("/api/agendamentos", agendamentoRouter);

app.use(errorHandler);
