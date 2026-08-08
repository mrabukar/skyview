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
  RECEIPT_CONTENT_TYPES,
  RECEIPT_MAX_SIZE,
} from "../receipt.constants";

/** Persist receipt metadata after the browser has uploaded to R2. */
export class ConfirmReceiptDto {
  @IsString()
  @IsNotEmpty()
  purchaseId!: string;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsIn(RECEIPT_CONTENT_TYPES)
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RECEIPT_MAX_SIZE)
  size!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName!: string;
}
