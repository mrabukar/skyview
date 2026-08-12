import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  USER_ATTACHMENT_CONTENT_TYPES,
  USER_ATTACHMENT_MAX_SIZE,
} from "../user-attachment.constants";

/** Persist attachment metadata after the browser has uploaded to R2. */
export class ConfirmUserAttachmentDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsIn(USER_ATTACHMENT_CONTENT_TYPES)
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(USER_ATTACHMENT_MAX_SIZE)
  size!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName!: string;
}
