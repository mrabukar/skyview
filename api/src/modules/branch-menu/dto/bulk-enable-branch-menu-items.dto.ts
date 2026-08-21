import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class BulkPriceDto {
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @IsString()
  @IsNotEmpty()
  sizeId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number;
}

export class BulkEnableBranchMenuItemsDto {
  /** IDs of the org-wide menu items to enable at this branch. */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  menuItemIds!: string[];

  /** Optional per-size price overrides to set at the same time. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPriceDto)
  prices?: BulkPriceDto[];
}
