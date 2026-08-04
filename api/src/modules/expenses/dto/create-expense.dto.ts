import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId!: number;

  /** Admin-only: a branch, or omit for a company-wide expense. Managers: ignored (own branch). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  expenseDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
