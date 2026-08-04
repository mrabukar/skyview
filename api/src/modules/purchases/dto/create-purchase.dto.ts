import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class CreatePurchaseDto {
  /** Required for admins; ignored for managers (forced to their own branch). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  itemName!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  unitPrice!: number;

  @IsString()
  @IsNotEmpty()
  vendorId!: string;

  @IsString()
  @IsNotEmpty()
  purchaseDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
