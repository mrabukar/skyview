import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class PurchaseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  /** Admin-only; managers are always scoped to their own branch. */
  @IsOptional()
  @IsString()
  branchId?: string;

  /** One id, or several comma-separated ids to filter by any of them. */
  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}
