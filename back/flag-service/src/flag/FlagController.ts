import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Public } from '../user/decorators/Public';
import { UserId } from '../user/decorators/UserId';
import { FlagService } from './FlagService';
import { UserAlreadyOwnAPixelError } from "./errors/UserAlreadyOwnAPixelError";
import { CooldownTimerHasNotEndedYetError } from "./errors/CooldownTimerHasNotEndedYetError";

@Controller('')
export class FlagController {
  constructor(private flagService: FlagService) {}

  @Post('pixel')
  async addPixel(
    @UserId() ownerId: string,
    @Body('hexColor') hexColor: string,
  ) {
    try {
      const event = await this.flagService.addPixel(ownerId, hexColor);
      return event;
    } catch (e) {
      if (e instanceof UserAlreadyOwnAPixelError) {
        throw new BadRequestException();
      }
    }
  }

  @Put('pixel')
  async changePixelColor(
      @UserId() ownerId: string,
      @Body('pixelId') pixelId: string,
      @Body('hexColor') hexColor: string,
  ) {
    try {
      const event = await this.flagService.changePixelColor(
        ownerId,
        pixelId,
        hexColor,
      );
      return event;
    } catch (e) {
      if (e instanceof CooldownTimerHasNotEndedYetError) {
        throw new BadRequestException();
      }
    }
  }

  @Get('pixel')
  async getUserPixel(
      @UserId() userId: string,
  ) {
    return this.flagService.getOrCreateUserPixel(userId);
  }

  @Get('flag')
  @Public()
  async getFlag() {
    try {
      const flag = await this.flagService.getFlag();
      return flag;
    } catch (e) {
      throw new InternalServerErrorException();
    }
  }

  @Get('flag/:date')
  @Public()
  async getFlagAtDate(@Param('date') requestedDate: Date) {
    try {
      const flag = await this.flagService.getFlagAtDate(requestedDate);
      return flag;
    } catch (e) {
      throw new InternalServerErrorException();
    }
  }
}
