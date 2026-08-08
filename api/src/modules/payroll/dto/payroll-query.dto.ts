import { IsOptional, IsString, Matches } from "class-validator";

export class PayrollQueryDto {
  /**
   * Target payroll month as `YYYY-MM`. Defaults to the current month.
   * Future months are rejected by the service.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: "month must be in YYYY-MM format",
  })
  month?: string;
}
