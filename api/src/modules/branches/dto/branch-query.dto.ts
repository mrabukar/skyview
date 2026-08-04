import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class BranchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  /** Include deactivated branches (admin management view). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeInactive?: boolean;
}
