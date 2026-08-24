import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { MENU_CATEGORY_ICON_NAMES } from "../menu-category-icons";

export class UpdateMenuCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Omit to leave unchanged; null/empty clears the saved icon. */
  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== "")
  @IsIn(MENU_CATEGORY_ICON_NAMES)
  icon?: string | null;
}
