import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { verifyMailTransport } from "./mail.js";
await verifyMailTransport();
const server = app.listen(config.PORT, config.HOST, () =>
  console.log(
    `AlgoLearn API listening on ${config.HOST}:${config.PORT}; mail delivery: ${config.MAIL_MODE}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () =>
    server.close(() => {
      void db.$disconnect().finally(() => process.exit(0));
    }),
  );
