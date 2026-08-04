import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdatePurchaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  itemName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  vendorId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string | null;
}
