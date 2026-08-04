import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class VendorQueryDto {
  /** Admin-only — include deactivated vendors in the list. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeInactive?: boolean;
}
