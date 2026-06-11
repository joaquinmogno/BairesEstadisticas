import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  });
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads/" });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

bootstrap();

function isAllowedOrigin(origin: string) {
  const allowedOrigins = [
    process.env.FRONTEND_URL ?? "http://localhost:3000",
    process.env.ADMIN_URL ?? "http://localhost:3001",
    ...(process.env.CORS_ORIGINS ?? "").split(","),
  ]
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const normalizedOrigin = origin.replace(/\/$/, "");
  if (allowedOrigins.includes(normalizedOrigin)) return true;

  try {
    const url = new URL(normalizedOrigin);
    return url.protocol === "https:" && url.hostname.endsWith(".sslip.io");
  } catch {
    return false;
  }
}
