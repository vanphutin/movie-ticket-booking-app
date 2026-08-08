import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class InternalRegisterRequestDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  readonly email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  readonly password!: string;

  @IsString()
  @IsNotEmpty()
  readonly displayName!: string;
}

export class InternalRegisterResponseDto {
  readonly accessToken!: string;
  readonly refreshToken!: string;
  readonly expiresIn!: number;
  readonly user!: {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
  };
}

export class InternalLoginRequestDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  readonly email!: string;

  @IsString()
  @IsNotEmpty()
  readonly password!: string;
}

export class InternalLoginResponseDto {
  readonly accessToken!: string;
  readonly refreshToken!: string;
  readonly expiresIn!: number;
  readonly user!: {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
  };
}

export class InternalRefreshRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048, { message: 'Refresh token must not exceed 2048 characters' })
  readonly refreshToken!: string;
}

export class InternalRefreshResponseDto {
  readonly accessToken!: string;
  readonly refreshToken!: string;
  readonly expiresIn!: number;
  readonly user!: {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
  };
}

export class InternalLogoutRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048, { message: 'Refresh token must not exceed 2048 characters' })
  readonly refreshToken!: string;
}

export class InternalProfileResponseDto {
  readonly user!: {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
  };
}
