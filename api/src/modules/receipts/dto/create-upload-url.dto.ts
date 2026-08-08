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
  RECEIPT_CONTENT_TYPES,
  RECEIPT_MAX_SIZE,
} from "../receipt.constants";

/** Ask the API for a pre-signed PUT URL before uploading to R2. */
export class CreateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  purchaseId!: string;

  @IsString()
  @IsIn(RECEIPT_CONTENT_TYPES)
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RECEIPT_MAX_SIZE)
  size!: number;
}
