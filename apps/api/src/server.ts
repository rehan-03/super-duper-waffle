import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
const server = app.listen(config.PORT, config.HOST, () =>
  console.log(`AlgoLearn API listening on port ${config.PORT}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () =>
    server.close(() => {
      void db.$disconnect().finally(() => process.exit(0));
    }),
  );
