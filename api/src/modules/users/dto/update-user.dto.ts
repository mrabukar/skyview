import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { MANAGER_PAGES } from "../../../common/page-access/pages";

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsIn(["admin", "branch_manager", "cashier"])
  role?: "admin" | "branch_manager" | "cashier";

  @IsOptional()
  @IsString()
  branchId?: string | null;

  /** Assigned branches for branch_manager (≥1). Primary = first id. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  branchIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salary?: number;

  /** Page keys to hide from this branch manager (see page registry). */
  @IsOptional()
  @IsArray()
  @IsIn(MANAGER_PAGES, { each: true })
  disabledPages?: string[];

  // ── Cashier-only fields ────────────────────────────────────────────────────

  /** Days of week the cashier works. */
  @IsOptional()
  @IsArray()
  @IsIn(DAYS_OF_WEEK, { each: true })
  shiftDays?: string[];

  /** Shift start time in HH:mm (Africa/Nairobi). */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "shiftStartTime must be in HH:mm format (e.g. 07:00)",
  })
  shiftStartTime?: string;

  /** Shift end time in HH:mm (Africa/Nairobi). Must be after shiftStartTime. */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "shiftEndTime must be in HH:mm format (e.g. 20:00)",
  })
  shiftEndTime?: string;

  /** Max discount % this cashier can apply per order (0–100). Null = no discount. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  maxDiscountPercent?: number | null;
}
