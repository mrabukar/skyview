import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

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
}
