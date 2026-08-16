import { IsOptional, IsString } from "class-validator";

export class ReportQueryDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  /**
   * One id, or several comma-separated ids. Admin-only filter; managers
   * always use their own assigned branch(es).
   */
  @IsOptional()
  @IsString()
  branchId?: string;
}
