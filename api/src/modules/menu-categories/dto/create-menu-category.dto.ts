import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { MENU_CATEGORY_ICON_NAMES } from "../menu-category-icons";

export class CreateMenuCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsIn(MENU_CATEGORY_ICON_NAMES)
  icon?: string;
}
