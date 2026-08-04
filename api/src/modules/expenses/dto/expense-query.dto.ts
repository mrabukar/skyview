import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class ExpenseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  /** Admin-only; managers are always scoped to their own branch. */
  @IsOptional()
  @IsString()
  branchId?: string;

  /** Admin-only: only company-wide (branch-less) expenses. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  companyWideOnly?: boolean;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}
