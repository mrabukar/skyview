import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateMenuItemSizeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  basePrice!: number;
}

export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** R2 object key from the upload-url flow (optional on create). */
  @IsOptional()
  @IsString()
  imageKey?: string;

  /** At least one size variant is required (BR-POS-3.2). */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemSizeDto)
  sizes!: CreateMenuItemSizeDto[];
}
