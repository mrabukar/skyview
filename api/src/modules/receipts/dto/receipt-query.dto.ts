import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class ReceiptQueryDto extends PaginationQueryDto {
  /** List receipts for one purchase (returns all, ignores pagination filters). */
  @IsOptional()
  @IsString()
  purchaseId?: string;

  /** Admin-only branch filter; managers are always scoped to their branch. */
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}
