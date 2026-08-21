import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { OrderStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class PosOrderQueryDto extends PaginationQueryDto {
  /** Filter by branch. Managers are implicitly scoped to their branches. */
  @IsOptional()
  @IsString()
  branchId?: string;

  /** Filter by order status. */
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  /** Filter by cashier (admin/manager use). */
  @IsOptional()
  @IsString()
  cashierId?: string;

  /** Start of date range, YYYY-MM-DD (inclusive). */
  @IsOptional()
  @IsString()
  from?: string;

  /** End of date range, YYYY-MM-DD (inclusive). */
  @IsOptional()
  @IsString()
  to?: string;
}
