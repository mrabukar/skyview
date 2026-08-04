import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateDailySaleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  saleDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string | null;
}
