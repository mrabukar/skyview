import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  USER_ATTACHMENT_CONTENT_TYPES,
  USER_ATTACHMENT_MAX_SIZE,
} from "../user-attachment.constants";

/** Ask the API for a pre-signed PUT URL before uploading to R2. */
export class CreateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsIn(USER_ATTACHMENT_CONTENT_TYPES)
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(USER_ATTACHMENT_MAX_SIZE)
  size!: number;
}
