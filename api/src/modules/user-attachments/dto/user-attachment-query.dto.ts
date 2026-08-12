import { IsNotEmpty, IsString } from "class-validator";

export class UserAttachmentQueryDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
