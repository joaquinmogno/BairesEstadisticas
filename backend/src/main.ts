import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const allowedOrigins = [
    process.env.FRONTEND_URL ?? "http://localhost:3000",
    process.env.ADMIN_URL ?? "http://localhost:3001",
  ];
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.enableCors({ origin: allowedOrigins });
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads/" });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

bootstrap();
