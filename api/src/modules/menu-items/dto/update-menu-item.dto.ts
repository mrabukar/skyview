import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** R2 object key from the upload-url flow. Null clears the image. */
  @IsOptional()
  @IsString()
  imageKey?: string | null;
}

export class UpdateMenuItemSizeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  basePrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
