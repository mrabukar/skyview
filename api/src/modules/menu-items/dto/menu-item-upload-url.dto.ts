import { Type } from "class-transformer";
import { IsIn, IsInt, IsString, Max, Min } from "class-validator";
import {
  MENU_ITEM_IMAGE_CONTENT_TYPES,
  MENU_ITEM_IMAGE_MAX_SIZE,
} from "../menu-item-image.constants";

export {
  MENU_ITEM_IMAGE_CONTENT_TYPES,
  MENU_ITEM_IMAGE_MAX_SIZE,
  MENU_ITEM_IMAGE_EXTENSION,
} from "../menu-item-image.constants";

export class MenuItemUploadUrlDto {
  @IsString()
  @IsIn(MENU_ITEM_IMAGE_CONTENT_TYPES)
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MENU_ITEM_IMAGE_MAX_SIZE)
  size!: number;
}
