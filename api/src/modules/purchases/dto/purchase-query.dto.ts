import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class PurchaseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * One id, or several comma-separated ids. Admin: unrestricted. Manager:
   * always scoped to their assigned branch(es); an explicit list must be a
   * subset of it.
   */
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
