import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateDailySaleDto {
  /** Required for admins; ignored for managers (forced to their own branch). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  saleDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
