import { app } from "./config/expressConfig";
import { getEnv } from "./utils/functions/getEnv";

app.listen(getEnv("PORT"), () => {
  console.log("API rodando na porta " + getEnv("PORT") + "...");
});
