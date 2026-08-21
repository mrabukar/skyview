import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class VoidOrderDto {
  /** Non-empty reason for voiding. Required (BR-POS-6.13). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
