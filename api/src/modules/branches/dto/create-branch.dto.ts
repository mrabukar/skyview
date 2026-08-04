import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;
}
