import { IsOptional, IsString } from "class-validator";

export class ReportQueryDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  /** Admin-only; managers use their own branch. */
  @IsOptional()
  @IsString()
  branchId?: string;
}
