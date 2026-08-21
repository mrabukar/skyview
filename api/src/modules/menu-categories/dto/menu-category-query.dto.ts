import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class MenuCategoryQueryDto {
  /** Admins may pass false to include inactive categories. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  isActive?: boolean;
}
