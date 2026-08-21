import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class ToppingQueryDto {
  /** Admins may pass false to include inactive toppings. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  isActive?: boolean;
}
