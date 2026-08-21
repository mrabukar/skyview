import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateMenuCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
