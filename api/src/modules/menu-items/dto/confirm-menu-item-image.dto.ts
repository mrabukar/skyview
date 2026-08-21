import { IsString, Matches } from "class-validator";

export class ConfirmMenuItemImageDto {
  /** R2 object key returned by POST /menu-items/upload-url. */
  @IsString()
  @Matches(/^menu-items\/[a-zA-Z0-9_-]+\//, {
    message: "Invalid image key",
  })
  key!: string;
}
