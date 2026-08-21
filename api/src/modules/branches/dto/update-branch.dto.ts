import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address?: string;

  /**
   * When true, this branch uses POS orders as its revenue source.
   * New manual DailySale entries are blocked for the branch (BR-POS-8.2).
   * Admin-only: the PATCH /branches/:id endpoint is already @Roles(admin).
   */
  @IsOptional()
  @IsBoolean()
  posEnabled?: boolean;
}
