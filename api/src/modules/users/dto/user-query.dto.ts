import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class UserQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["admin", "branch_manager"])
  role?: "admin" | "branch_manager";

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  isActive?: boolean;
}
