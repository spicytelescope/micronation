import { Module } from "@nestjs/common";
import { UserRepository } from "./UserRepository";
import { UserService } from "./UserService";
import { UserController } from "./UserController";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "./guards/AuthGuard";
import { JwtService } from "./jwt/JwtService";

@Module({
  imports: [],
  controllers: [UserController],
  providers: [
    UserService,
    JwtService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    UserRepository,
  ],
  exports: [UserRepository],
})
export class UserModule {
}
